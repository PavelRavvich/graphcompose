#!/usr/bin/env bash
# Creates / updates the labels (type, priority, blocked). Stages live on the board, not in labels.
set -euo pipefail

label() { gh label create "$1" --color "$2" --description "$3" --force; }

label "type:feature"       "1d76db" "New behaviour"
label "type:bugfix"        "d73a4a" "Wrong behaviour fixed"
label "type:epic"          "5319e7" "Parent issue with sub-issues"
label "type:chore"         "cfd3d7" "Tooling, config, refactor"
label "prio:mvp"           "0e8a16" "Must have"
label "prio:stretch"       "c2e0c6" "Nice to have"
label "blocked"            "b60205" "Cannot proceed, see comment"
