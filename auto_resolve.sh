#!/bin/bash
while git status | grep -q "rebase in progress"; do
  unmerged=$(git diff --name-only --diff-filter=U)
  if [ -z "$unmerged" ]; then
    GIT_EDITOR=true git rebase --continue || break
    continue
  fi
  
  if echo "$unmerged" | grep -q "^mobile-app/"; then
    echo "Conflict in mobile-app found, stopping for manual resolution."
    break
  fi
  
  for file in $unmerged; do
    git checkout --theirs "$file" 2>/dev/null || git add "$file"
    git add "$file"
  done
  
  GIT_EDITOR=true git rebase --continue || break
done
