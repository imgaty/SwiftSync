#!/usr/bin/env bash
set -euo pipefail

echo "Creating remote backup branch 'backup-before-rewrite'..."
git branch -f backup-before-rewrite main
git push -u origin backup-before-rewrite

echo "Creating orphan preview branch 'rewrite-preview'..."
git checkout --orphan rewrite-preview
# start with empty tree
git reset --hard

# get commits from main (portable)
commits=()
while IFS= read -r line; do
  commits+=("$line")
done < <(git rev-list --reverse main)
echo "Found ${#commits[@]} commits to rewrite"

for sha in "${commits[@]}"; do
  echo "\nProcessing $sha"
  subj=$(git log -1 --format=%s "$sha")
  subj_clean=$(printf "%s" "$subj" | sed -E 's/[[:space:]]+/ /g' | sed 's/^\s*//;s/\s*$//')
  files=$(git show --name-only --pretty=format:'' "$sha" | sed '/^$/d')

  lc=$(printf "%s" "$subj_clean" | tr '[:upper:]' '[:lower:]')
  if printf "%s" "$lc" | grep -q "fix"; then
    type=FIX
  elif printf "%s" "$lc" | grep -q "feat" || printf "%s" "$lc" | grep -q "feature"; then
    type=FEAT
  elif printf "%s" "$lc" | grep -q "init" || printf "%s" "$lc" | grep -q "initial"; then
    type=INIT
  elif printf "%s" "$lc" | grep -q "chore"; then
    type=CHORE
  elif printf "%s" "$lc" | grep -q "docs"; then
    type=DOCS
  else
    type=CHORE
  fi

  # Capitalize first word of subject for title
  title=$(printf "%s" "$subj_clean" | awk '{ $1 = toupper(substr($1,1,1)) substr($1,2); print }')
  most_noticeable="$title"

  # Build body listing files
  body=""
  if [ -z "$(printf "%s" "$files")" ]; then
    body="- No file changes detected;"
  else
    while IFS= read -r f; do
      [ -z "$f" ] && continue
      body="$body- Modified \\\`$f\\\`;\n"
    done <<< "$files"
  fi

  newmsg="$type: $most_noticeable\n\n$body"

  # cherry-pick without committing
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

echo "\nPreview branch 'rewrite-preview' created. Showing new commit log (most recent first):"
git log --oneline -n 30
