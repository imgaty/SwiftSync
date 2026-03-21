#!/usr/bin/env bash
set -euo pipefail

# Backup current origin/main
TS=$(date -u +%Y%m%dT%H%M%SZ)
BACKUP_TAG="backup-before-normalize-$TS"

echo "Creating backup tag $BACKUP_TAG -> origin/main"
git fetch origin main:refs/remotes/origin/main
git tag -f "$BACKUP_TAG" origin/main
git push origin refs/tags/$BACKUP_TAG

BRANCH_PREVIEW="rewrite-normalize-preview"
if git rev-parse --verify "$BRANCH_PREVIEW" >/dev/null 2>&1; then
  git branch -D "$BRANCH_PREVIEW"
fi

echo "Creating orphan branch $BRANCH_PREVIEW"
git checkout --orphan "$BRANCH_PREVIEW"
git reset --hard

# Gather commits from origin/main (portable)
commits=()
while IFS= read -r line; do
  commits+=("$line")
done < <(git rev-list --reverse origin/main)

echo "Found ${#commits[@]} commits to rewrite"

for sha in "${commits[@]}"; do
  echo "\nProcessing $sha"

  # original full commit message
  orig_msg=$(git log -1 --format=%B "$sha")
  # first non-empty line
  first_line=$(printf "%s" "$orig_msg" | sed -n '1p' | tr -d '\r')

  # Normalize: remove repeated leading tokens like "FIX:", "Fix(foo):", etc. and produce "TYPE: rest"
  first_line_trim=$(printf "%s" "$first_line" | sed -E 's/^[[:space:]]+|[[:space:]]+$//g')
  # strip repeated leading tokens (TOKEN: or TOKEN(stuff):) and collapse whitespace
  cleaned=$(printf "%s" "$first_line_trim" | sed -E "s/^(([A-Za-z][A-Za-z0-9_-]*)(\([^)]*\))?:[[:space:]]*)+//; s/[[:space:]]+/ /g; s/^[[:space:]]+|[[:space:]]+$//g")

  if [ -z "$cleaned" ]; then
    files=$(git show --name-only --pretty=format:'' "$sha" | sed '/^$/d' | head -n 3 | tr '\n' ',' | sed 's/,$//')
    cleaned="Updated $files"
  fi

  # Determine TYPE from first token if available, otherwise infer from content
  type=$(printf "%s" "$first_line_trim" | sed -E -n "s/^[[:space:]]*([A-Za-z][A-Za-z0-9_-]*)(\([^)]*\))?:.*/\1/p" | tr '[:lower:]' '[:upper:]' | head -n1)
  if [ -z "$type" ]; then
    up=$(printf "%s" "$first_line_trim" | tr '[:lower:]' '[:upper:]')
    if printf "%s" "$up" | grep -q "FIX"; then
      type=FIX
    elif printf "%s" "$up" | grep -q "FEAT" || printf "%s" "$up" | grep -q "FEATURE"; then
      type=FEAT
    elif printf "%s" "$up" | grep -q "DOCS"; then
      type=DOCS
    elif printf "%s" "$up" | grep -q "CHORE"; then
      type=CHORE
    elif printf "%s" "$up" | grep -q "PERF"; then
      type=PERF
    elif printf "%s" "$up" | grep -q "REFACTOR"; then
      type=REFACTOR
    elif printf "%s" "$up" | grep -q "INIT" || printf "%s" "$up" | grep -q "INITIAL"; then
      type=INIT
    else
      type=CHORE
    fi
  fi

  newmsg="$type: $cleaned"

  echo "New message: $newmsg"

  # apply the commit changes without committing so we can create a new commit message
  git cherry-pick "$sha" --no-commit

  # preserve author/committer metadata
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
