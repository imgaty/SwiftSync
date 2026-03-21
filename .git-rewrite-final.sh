#!/usr/bin/env bash
set -euo pipefail

# Create backup tag
TS=$(date -u +%Y%m%dT%H%M%SZ)
BACKUP_TAG="backup-before-final-clean-$TS"

echo "Creating backup tag $BACKUP_TAG -> origin/main"
git fetch origin main:refs/remotes/origin/main
git tag -f "$BACKUP_TAG" origin/main
git push origin refs/tags/$BACKUP_TAG

BRANCH_PREVIEW="rewrite-final-preview"
if git rev-parse --verify "$BRANCH_PREVIEW" >/dev/null 2>&1; then
  git branch -D "$BRANCH_PREVIEW"
fi

echo "Creating orphan branch $BRANCH_PREVIEW"
git checkout --orphan "$BRANCH_PREVIEW"
git reset --hard

# Gather commits from origin/main
commits=()
while IFS= read -r line; do
  commits+=("$line")
done < <(git rev-list --reverse origin/main)

echo "Found ${#commits[@]} commits to rewrite"

for sha in "${commits[@]}"; do
  echo "\nProcessing $sha"
  orig_subj=$(git log -1 --format=%s "$sha" | sed -E 's/^[[:space:]]+|[[:space:]]+$//g')

  # Remove any number of leading tokens like 'FIX:', 'Fix(foo):', 'CHORE:', repeated, case-insensitive
  # Pattern: word(: or (something):) repeated
    cleaned="$orig_subj"
    # Iteratively strip leading tokens of form Word: or Word(something):
    while true; do
      # trim leading spaces
      cleaned="$(printf "%s" "$cleaned" | sed -E 's/^\s+//')"
      if printf "%s" "$cleaned" | grep -E -q '^[[:alpha:]][[:alnum:]_-]*\([^)]*\):'; then
        cleaned="${cleaned#*:}"
        continue
      fi
      if printf "%s" "$cleaned" | grep -E -q '^[[:alpha:]][[:alnum:]_-]*:'; then
        cleaned="${cleaned#*:}"
        continue
      fi
      break
    done
    # final trim
    cleaned="$(printf "%s" "$cleaned" | sed -E 's/^\s+|\s+$//g')"

  if [ -z "$cleaned" ]; then
    # fallback to files changed summary
    files=$(git show --name-only --pretty=format:'' "$sha" | sed '/^$/d' | head -n 3 | tr '\n' ',' | sed 's/,$//')
    cleaned="Updated $files"
  fi

  # Determine TYPE from original subject
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

  git cherry-pick "$sha" --no-commit

  # preserve author/committer
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

# Replace main and force push
echo "Switching main to rewritten history and force-pushing"
git checkout main
git reset --hard "$BRANCH_PREVIEW"

echo "Force-pushing updated main to origin (with lease)"
git push --force-with-lease origin main

# Cleanup
git branch -D "$BRANCH_PREVIEW" || true

echo "Final remote log (most recent 12):"
git fetch origin >/dev/null 2>&1
git log --oneline origin/main -n 12
