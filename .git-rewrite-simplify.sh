#!/usr/bin/env bash
set -euo pipefail

# Backup current origin/main
TS=$(date -u +%Y%m%dT%H%M%SZ)
BACKUP_TAG="backup-before-simplify-$TS"

echo "Creating backup tag $BACKUP_TAG -> origin/main"
git fetch origin main:refs/remotes/origin/main
git tag -f "$BACKUP_TAG" origin/main
git push origin refs/tags/$BACKUP_TAG

BRANCH_PREVIEW="rewrite-simplify-preview"
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

  # Use subject only (format %s) to avoid bodies becoming subjects
  subj=$(git log -1 --format=%s "$sha")
  subj_trim=$(printf "%s" "$subj" | sed -E 's/^[[:space:]]+|[[:space:]]+$//g')
  # Remove literal backslash-n sequences that ended up in some subjects and trailing file lists
  subj_clean=$(printf "%s" "$subj_trim" | sed -E "s/\\n+/ /g; s/\\- Modified.*$//; s/\\.*$//; s/- Modified.*$//; s/[[:space:]]+/ /g; s/^[[:space:]]+|[[:space:]]+$//g")

  # Strip repeated leading tokens like TOKEN: or TOKEN(stuff):
  cleaned=$(printf "%s" "$subj_clean" | sed -E 's/^(([A-Za-z][A-Za-z0-9_-]*)(\([^)]*\))?:[[:space:]]*)+//; s/[[:space:]]+/ /g; s/^[[:space:]]+|[[:space:]]+$//g')

  # If nothing remains, fallback to short file summary
  if [ -z "$cleaned" ]; then
    files=$(git show --name-only --pretty=format:'' "$sha" | sed '/^$/d' | head -n 2 | tr '\n' ',' | sed 's/,$//')
    cleaned="Updated ${files:-files}"
  fi

  # Infer type: first explicit token or content inference
  type=$(printf "%s" "$subj_clean" | sed -E -n "s/^[[:space:]]*([A-Za-z][A-Za-z0-9_-]*)(\([^)]*\))?:.*/\1/p" | tr '[:lower:]' '[:upper:]' | head -n1)
  if [ -z "$type" ]; then
    up=$(printf "%s" "$subj_trim" | tr '[:lower:]' '[:upper:]')
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

  # Shorten the cleaned subject to ~60 chars without cutting words
  max=60
  if [ ${#cleaned} -le $max ]; then
    short="$cleaned"
  else
    short=$(printf "%s" "$cleaned" | cut -c1-$max)
    # drop trailing partial word
    short=$(printf "%s" "$short" | sed -E 's/[[:space:]]+[^[:space:]]*$//')
    short="${short}..."
  fi

  newmsg="$type: $short"
  # sanitize any leftover backslash-escapes or trailing lists
  newmsg=$(printf "%s" "$newmsg" | sed -E "s/\\n+/ /g; s/\\r//g; s/\\.*$//; s/- Modified.*$//; s/[[:space:]]+/ /g; s/^[[:space:]]+|[[:space:]]+$//g; s/[[:punct:]]+$//")
  echo "New message: $newmsg"

  # apply the commit changes without committing
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
