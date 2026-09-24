#!/usr/bin/env bash
# Creates / updates the labels used by the pipeline. Idempotent (--force).
set -euo pipefail

label() { gh label create "$1" --color "$2" --description "$3" --force; }

label "type:feature"       "1d76db" "New behaviour"
label "type:bugfix"        "d73a4a" "Wrong behaviour fixed"
label "type:chore"         "cfd3d7" "Tooling, config, refactor"
label "prio:mvp"           "0e8a16" "Must ship this session"
label "prio:stretch"       "c2e0c6" "Only if time is left"
label "status:triaged"     "fbca04" "Created by triage, no spec yet"
label "status:spec-ready"  "5319e7" "Spec complete, ready to implement"
label "status:in-progress" "0052cc" "Branch exists"
label "status:blocked"     "b60205" "Cannot proceed, see comment"
