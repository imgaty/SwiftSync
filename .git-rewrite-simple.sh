#!/usr/bin/env bash
set -euo pipefail

# Create a backup branch of current main
git branch -f backup-before-rewrite-simple main
git push -u origin backup-before-rewrite-simple

# Create an orphan preview branch
if git rev-parse --verify rewrite-preview-simple >/dev/null 2>&1; then
  git branch -D rewrite-preview-simple
fi

git checkout --orphan rewrite-preview-simple
git reset --hard

# Collect commits from main in chronological order
commits=()
while IFS= read -r line; do
  commits+=("$line")
done < <(git rev-list --reverse main)

echo "Found ${#commits[@]} commits to rewrite"

for sha in "${commits[@]}"; do
  echo "Processing $sha"
  orig_subj=$(git log -1 --format=%s "$sha" | sed -E 's/^[[:space:]]+|[[:space:]]+$//g')
  lc=$(printf "%s" "$orig_subj" | tr '[:upper:]' '[:lower:]')

  if printf "%s" "$lc" | grep -q "fix"; then
    TYPE=FIX
  elif printf "%s" "$lc" | grep -q "feat" || printf "%s" "$lc" | grep -q "feature"; then
    TYPE=FEAT
  elif printf "%s" "$lc" | grep -q "docs"; then
    TYPE=DOCS
  elif printf "%s" "$lc" | grep -q "chore"; then
    TYPE=CHORE
  elif printf "%s" "$lc" | grep -q "perf"; then
    TYPE=PERF
  elif printf "%s" "$lc" | grep -q "refactor"; then
    TYPE=REFACTOR
  elif printf "%s" "$lc" | grep -q "init" || printf "%s" "$lc" | grep -q "initial"; then
    TYPE=INIT
  else
    TYPE=CHORE
  fi

  # Construct new single-line message
  # Use the original subject capitalized for "most noticeable change"
  most_noticeable=$(printf "%s" "$orig_subj" | awk '{ $1 = toupper(substr($1,1,1)) substr($1,2); print }')
  newmsg="$TYPE: $most_noticeable"

  # Cherry-pick commit without committing
  git cherry-pick "$sha" --no-commit

  # Preserve author/committer timestamps and names
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

# Show preview log
echo "\nPreview branch 'rewrite-preview-simple' commit log (newest first):"
git log --oneline -n 30

# Replace main with rewritten history and force-push
git checkout main
git reset --hard rewrite-preview-simple
git push --force-with-lease origin main

# Cleanup: delete backup branch and preview branch remote/local as requested
git push origin --delete backup-before-rewrite-simple || true
git branch -D backup-before-rewrite-simple || true
git branch -D rewrite-preview-simple || true

# Show resulting remote log
git fetch origin >/dev/null 2>&1
echo "\nNew remote origin/main log (most recent 12):"
git log --oneline origin/main -n 12
