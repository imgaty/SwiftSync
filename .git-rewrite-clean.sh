#!/usr/bin/env bash
set -euo pipefail

# Create a lightweight backup tag pointing to current origin/main
TS=$(date -u +%Y%m%dT%H%M%SZ)
BACKUP_TAG="backup-before-clean-$TS"

echo "Creating backup tag $BACKUP_TAG -> origin/main"
git fetch origin main:refs/remotes/origin/main
git tag -f "$BACKUP_TAG" origin/main
git push origin refs/tags/$BACKUP_TAG

# Prepare a new orphan branch to build rewritten history
BRANCH_PREVIEW="rewrite-clean-preview"
if git rev-parse --verify "$BRANCH_PREVIEW" >/dev/null 2>&1; then
  git branch -D "$BRANCH_PREVIEW"
fi

echo "Creating orphan branch $BRANCH_PREVIEW"
git checkout --orphan "$BRANCH_PREVIEW"
git reset --hard

# Collect commits from origin/main in chronological order
commits=( )
while IFS= read -r line; do
  commits+=("$line")
done < <(git rev-list --reverse origin/main)

echo "Found ${#commits[@]} commits to rewrite"

for sha in "${commits[@]}"; do
  echo "\nProcessing $sha"
  orig_subj=$(git log -1 --format=%s "$sha" | sed -E 's/^[[:space:]]+|[[:space:]]+$//g')

  # Normalize and remove repeated TYPE: prefixes and paren scopes like Fix(foo):
  cleaned=$(printf "%s" "$orig_subj" \
    | sed -E 's/^([A-Za-z]+:\s*)+//g' \
    | sed -E 's/^[A-Za-z]+\([^)]*\):\s*//i' \
    | sed -E 's/^\s+|\s+$//g')

  # Fallback if cleaned is empty
  if [ -z "$cleaned" ]; then
    cleaned="Update"
  fi

  # Determine TYPE from original subject (prefer known keywords)
  up=$(printf "%s" "$orig_subj" | tr '[:lower:]' '[:upper:]')
  if printf "%s" "$up" | grep -q "FIX"; then
    TYPE=FIX
  elif printf "%s" "$up" | grep -q "FEAT" || printf "%s" "$up" | grep -q "FEATURE"; then
    TYPE=FEAT
  elif printf "%s" "$up" | grep -q "DOCS"; then
    TYPE=DOCS
  elif printf "%s" "$up" | grep -q "CHORE"; then
    TYPE=CHORE
  elif printf "%s" "$up" | grep -q "PERF"; then
    TYPE=PERF
  elif printf "%s" "$up" | grep -q "REFACTOR"; then
    TYPE=REFACTOR
  elif printf "%s" "$up" | grep -q "INIT" || printf "%s" "$up" | grep -q "INITIAL"; then
    TYPE=INIT
  else
    TYPE=CHORE
  fi

  newmsg="$TYPE: $cleaned"
  echo "New message: $newmsg"

  # Cherry-pick commit without committing
  git cherry-pick "$sha" --no-commit

  # Preserve author/committer
  author_name=$(git show -s --format='%an' "$sha")
  author_email=$(git show -s --format='%ae' "$sha")
  author_date=$(git show -s --format='%aI' "$sha")
  committer_name=$(git show -s --format='%cn' "$sha")
  committer_email=$(git show -s --format='%ce' "$sha")
  committer_date=$(git show -s --format='%cI' "$sha")

  GIT_AUTHOR_NAME="$author_name" GIT_AUTHOR_EMAIL="$author_email" GIT_AUTHOR_DATE="$author_date" \
    GIT_COMMITTER_NAME="$committer_name" GIT_COMMITTER_EMAIL="$committer_email" GIT_COMMITTER_DATE="$committer_date" \
    git commit -m "$newmsg"
done

# Replace main with rewritten history and force-push safely
echo "Switching main to rewritten history and force-pushing"
git checkout main
git reset --hard "$BRANCH_PREVIEW"

echo "Force-pushing updated main to origin (with lease)"
git push --force-with-lease origin main

# Cleanup preview branch locally
git branch -D "$BRANCH_PREVIEW" || true

echo "Rewrite complete. New remote log (most recent 12):"
git fetch origin >/dev/null 2>&1
git log --oneline origin/main -n 12
