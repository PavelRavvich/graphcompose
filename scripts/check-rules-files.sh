#!/usr/bin/env bash
# The rules files every session reads first must not describe the replaced design (#140):
# the hub graph, `maxHops`, the run / daily budget caps and `BudgetExceededError` are gone since #116.
# Part of `make check`; prints every hit and fails when any old term is back.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
FILES=("${ROOT}/CLAUDE.md" "${ROOT}/QUALITY.md")
OLD_TERMS='maxHops|runBudgetCap|dailyBudgetCap|BudgetExceededError|input_guards → router'

if grep -n -E "${OLD_TERMS}" "${FILES[@]}"; then
  echo "check-rules-files: CLAUDE.md / QUALITY.md describe the replaced design (terms above)." >&2
  echo "Describe the flow graph and settings().limits instead (#140)." >&2
  exit 1
fi
echo "check-rules-files: CLAUDE.md and QUALITY.md are free of the replaced design's terms."
