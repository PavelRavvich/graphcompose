#!/usr/bin/env bash
# Fails when a name retired by #141 is back in the framework, its templates, the examples or the
# rules files (CLAUDE.md, QUALITY.md).
# Part of `make check` (npm run check). Whole words only: a user's own `Question` or `Entry` is fine.
set -euo pipefail
cd "$(git rev-parse --show-toplevel)"

OLD_NAMES=(
  "@Entry"
  "@Conclusion"
  "ChatMessage"
  "TextAnswer"
  "Clarification"
  "ApprovalRequest"
  "ApprovalDecision"
  "Passage"
  "Citation"
)

patterns=()
for name in "${OLD_NAMES[@]}"; do patterns+=(-e "$name"); done

if git grep -n -w --untracked "${patterns[@]}" -- packages examples CLAUDE.md QUALITY.md; then
  echo "Old names (renamed in #141) found above — use the new names (Wiki → Standard DTOs, Workflow)." >&2
  exit 1
fi
echo "check-old-names: no old names"
