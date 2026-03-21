#!/usr/bin/env bash
set -euo pipefail

# .git-edit-commit-msg.sh
# Usage (edit variables at top or export them when running):
#  - TARGET_COMMIT: short or full sha of the commit to update (leave empty to create a new commit)
#  - NEW_MSG: commit message to set (required)
#  - BRANCH: branch to operate on (defaults to current branch)
#  - PUSH: if set to "true" the script will force-push rewritten branch to origin


TARGET_COMMIT="${TARGET_COMMIT:-}"                                                      # Commit SHA (code) to update; if empty, creates a new commit
NEW_MSG="${NEW_MSG:-}"                                                                  # Commit message to set (required)
BRANCH="${BRANCH:-$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo main)}"         # Branch to operate on (defaults to current branch or 'main' if detached)
PUSH="${PUSH:-false}"

# -----------------------------------------------------------------------

if [ -z "$NEW_MSG" ]; then
  echo "ERROR: NEW_MSG is empty. Set NEW_MSG='TYPE: message' or export NEW_MSG and re-run." >&2
  exit 1
fi

if [ -z "$TARGET_COMMIT" ]; then
  echo "No target commit provided — creating a new commit from current working tree with message:\n  $NEW_MSG"

  # If there are staged changes, commit them. If not, but there are unstaged/untracked changes, add all and commit.
  # Otherwise, create an empty commit.
  if git diff --cached --quiet; then
    # No staged changes
    if git diff --quiet && [ -z "$(git ls-files --others --exclude-standard)" ]; then
      echo "No changes to commit; creating an empty commit."
      git commit --allow-empty -m "$NEW_MSG"
    else
      echo "No staged changes detected — adding all changes and committing."
      git add -A
      git commit -m "$NEW_MSG"
    fi
  else
    # There are staged changes — commit them
    echo "Staged changes detected — committing staged changes."
    git commit -m "$NEW_MSG"
  fi

  if [ "$PUSH" = "true" ]; then
    echo "Pushing $BRANCH to origin..."
    git push origin "$BRANCH"
  fi

  exit 0
fi

# Resolve full SHA of target commit
if ! target_sha=$(git rev-parse --verify "$TARGET_COMMIT" 2>/dev/null); then
  echo "ERROR: commit '$TARGET_COMMIT' not found" >&2
  exit 1
fi

BACKUP_TAG="backup-edit-commit-$(date -u +%Y%m%dT%H%M%SZ)"
echo "Creating local backup tag $BACKUP_TAG -> $BRANCH"
git tag -f "$BACKUP_TAG" "$BRANCH"

PREVIEW_BRANCH="rewrite-edit-preview-$(date -u +%s)"
git branch -D "$PREVIEW_BRANCH" >/dev/null 2>&1 || true
echo "Creating orphan preview branch $PREVIEW_BRANCH"
git checkout --orphan "$PREVIEW_BRANCH"
git reset --hard

# Collect commits from the target branch in chronological order
commits=()
while IFS= read -r line; do
  commits+=("$line")
done < <(git rev-list --reverse "$BRANCH")

echo "Found ${#commits[@]} commits on branch '$BRANCH' — rewriting and replacing message for $target_sha"

for sha in "${commits[@]}"; do
  echo "Processing $sha"
  if [ "$sha" = "$target_sha" ]; then
    echo "- Target commit found: replacing message with: $NEW_MSG"
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
      git commit -m "$NEW_MSG"
  else
    # replay commit preserving original message and metadata
    git cherry-pick "$sha" --no-commit
    orig_msg=$(git log -1 --format=%B "$sha")
    author_name=$(git show -s --format='%an' "$sha")
    author_email=$(git show -s --format='%ae' "$sha")
    author_date=$(git show -s --format='%aI' "$sha")
    committer_name=$(git show -s --format='%cn' "$sha")
    committer_email=$(git show -s --format='%ce' "$sha")
    committer_date=$(git show -s --format='%cI' "$sha")

    GIT_AUTHOR_NAME="$author_name" GIT_AUTHOR_EMAIL="$author_email" GIT_AUTHOR_DATE="$author_date" \
      GIT_COMMITTER_NAME="$committer_name" GIT_COMMITTER_EMAIL="$committer_email" GIT_COMMITTER_DATE="$committer_date" \
      git commit -F <(printf "%s" "$orig_msg")
  fi
done

echo "Replacing branch $BRANCH with rewritten history (local)"
git checkout "$BRANCH"
git reset --hard "$PREVIEW_BRANCH"

if [ "$PUSH" = "true" ]; then
  echo "Force-pushing rewritten $BRANCH to origin (with lease)"
  git push --force-with-lease origin "$BRANCH"
else
  echo "Rewrite complete locally. To push the rewritten history run:" 
  echo "  git push --force-with-lease origin $BRANCH"
fi

echo "Cleaning up preview branch"
git branch -D "$PREVIEW_BRANCH" >/dev/null 2>&1 || true

echo "Done — recent commits on $BRANCH:"
git log --oneline "$BRANCH" -n 12
