#!/bin/bash
# Grader: check.sh <case.json> <result.json>, run from the root of the run's checkout.
# Needs BASE (tree object of the checkout before the run) and IDX (temp index path).
#
# Exposed to every check command:
#   DIFF_FILE      full patch of the run's changes, new files included
#   CHANGED_FILES  changed paths, one per line
#   ADDED_FILES    new paths, one per line
#   EVALS          folder holding the grading copy of the suite
set -u
CASE="$1"; RESULT="$2"
NAME="$(jq -r .name "$CASE")"
export EVALS="$(cd "$(dirname "$CASE")/.." && pwd)"

snapshot() {
  GIT_INDEX_FILE="$IDX" git add -A >/dev/null 2>&1
  export DIFF_FILE="$(mktemp)"
  GIT_INDEX_FILE="$IDX" git diff --cached "$BASE" > "$DIFF_FILE"
  export CHANGED_FILES="$(GIT_INDEX_FILE="$IDX" git diff --cached --name-only "$BASE")"
  export ADDED_FILES="$(GIT_INDEX_FILE="$IDX" git diff --cached --name-only --diff-filter=A "$BASE")"
  [ -n "${SAVE_DIFF:-}" ] && cp "$DIFF_FILE" "$SAVE_DIFF"
}

strays() { # changed paths outside the case's may_change list
  printf '%s\n' "$CHANGED_FILES" | while read -r p; do
    [ -z "$p" ] && continue
    jq -e --arg p "$p" 'any(.may_change[]; . as $ok | $p == $ok or ($p | startswith($ok + "/")))' "$CASE" >/dev/null || echo "       $p"
  done
}

total="$(jq '.checks | length' "$CASE")"; passed=0; report=""
snapshot

if [ "$(jq -r '.is_error' "$RESULT" 2>/dev/null)" != "false" ]; then
  report="     the run ended in an error: $(jq -r '.result // .subtype // "no result"' "$RESULT" 2>/dev/null | head -c 300)"$'\n'
elif [ -n "$(strays)" ]; then
  report="     the run changed files this case does not allow:"$'\n'"$(strays)"$'\n'
else
  for i in $(seq 0 $((total - 1))); do
    check="$(jq -r ".checks[$i].name" "$CASE")"
    cmd="$(jq -r ".checks[$i].run" "$CASE")"
    if out="$(bash -c "$cmd" 2>&1 </dev/null)"; then
      passed=$((passed + 1))
    else
      report+="     failed: $check"$'\n'
      [ -n "$out" ] && report+="$(head -3 <<<"$out" | sed 's/^/       /')"$'\n'
    fi
  done
  snapshot   # a check must not have changed files outside the allowed set either
  if [ -n "$(strays)" ]; then
    passed=0
    report+="     a check changed files this case does not allow:"$'\n'"$(strays)"$'\n'
  fi
fi

turns="$(jq -r '.num_turns // "?"' "$RESULT" 2>/dev/null)"; cost="$(jq -r '.total_cost_usd // "?"' "$RESULT" 2>/dev/null)"
if [ "$passed" -eq "$total" ]; then
  echo "PASS $NAME ($passed/$total checks, $turns turns, \$$cost)"
else
  echo "FAIL $NAME ($passed/$total checks, $turns turns, \$$cost)"
  printf '%s' "$report"
  exit 1
fi
