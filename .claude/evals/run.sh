#!/bin/bash
# Eval runner for the Claude configuration (CLAUDE.md, .claude/skills, agents,
# hooks, rules, settings, model routing). Runs locally, never in CI.
#
#   bash .claude/evals/run.sh all            # every case, one at a time
#   bash .claude/evals/run.sh <case-name>    # one case
#   EVAL_MODEL=sonnet bash .claude/evals/run.sh all   # model-routing trial
#
# Per case: a throwaway detached worktree of the product code at the case's
# `from` commit, the LOCAL configuration under test copied in, one headless
# `claude -p` run, then check.sh grades what the run left behind. Nothing is
# committed: the "before" snapshot is a tree object written from a temporary
# index, and the worktree is removed afterwards.
#
# Cases whose file name starts with `_` (cases/_example.json) are templates and
# never run.
set -u
MAIN="$(cd "$(dirname "$0")/../.." && pwd)"
EVALS="$MAIN/.claude/evals"
WANT="${1:-all}"

for bin in git jq claude; do
  command -v "$bin" >/dev/null || { echo "eval: '$bin' not found on PATH" >&2; exit 2; }
done

shopt -s nullglob
CASES=("$EVALS"/cases/[!_]*.json)
if [ ${#CASES[@]} -eq 0 ]; then
  echo "eval: no cases in .claude/evals/cases yet — nothing to run."
  echo "      Seed one from .claude/tasks/lessons.md (README → Adding a case); cases/_example.json is the template."
  exit 0
fi

STAMP="$(date +%Y-%m-%d_%H%M%S)"
mkdir -p "$EVALS/results"
OUT="$EVALS/results/$STAMP.txt"

# Grade from a copy made before any run, so a run cannot edit its own checks.
GRADE="$(mktemp -d)"
cp -R "$EVALS/cases" "$EVALS/check.sh" "$GRADE/"
trap 'rm -rf "$GRADE"' EXIT

# Read/edit/inspect only. A case adds its stack's type-check/lint commands via
# `extra_tools` (comma-separated allowedTools entries). No test runners: one
# test process at a time is a machine-safety rule, and never inside a grader.
TOOLS="Read,Edit,Write,MultiEdit,Grep,Glob,Bash(git diff *),Bash(git status *),Bash(ls *),Bash(find *),Bash(grep *),Bash(cat *)"
failed=0; ran=0
echo "eval run $STAMP — model: ${EVAL_MODEL:-default}" | tee "$OUT"

for CASE in "$GRADE"/cases/[!_]*.json; do
  NAME="$(jq -r .name "$CASE")"
  [ "$WANT" = all ] || [ "$WANT" = "$NAME" ] || continue
  if [ "$(jq -r '.known_fail // empty' "$CASE")" != "" ] && [ "$WANT" = all ]; then
    echo "SKIP $NAME (known-fail: $(jq -r .known_fail "$CASE"))" | tee -a "$OUT"; continue
  fi
  ran=$((ran + 1))
  FROM="$(git -C "$MAIN" rev-parse --verify -q "$(jq -r .from "$CASE")^{commit}")" || { echo "FAIL $NAME (unknown from: $(jq -r .from "$CASE"))" | tee -a "$OUT"; failed=$((failed+1)); continue; }
  W="$(mktemp -d)/run"
  git -C "$MAIN" worktree add -q --detach "$W" "$FROM" || { echo "FAIL $NAME (worktree)" | tee -a "$OUT"; failed=$((failed+1)); continue; }

  # Configuration under test (the local copy, tracked or not) replaces whatever
  # the `from` commit holds. The eval suite itself is removed: the run must not
  # see its own checks.
  mkdir -p "$W/.claude"
  [ -f "$MAIN/CLAUDE.md" ] && cp "$MAIN/CLAUDE.md" "$W/CLAUDE.md"
  for p in kit.config.json settings.json skills agents hooks rules stacks design-patterns REVIEW.md; do
    rm -rf "${W:?}/.claude/$p"
    [ -e "$MAIN/.claude/$p" ] && cp -R "$MAIN/.claude/$p" "$W/.claude/" 2>/dev/null
  done
  rm -rf "$W/.claude/evals" "$W/.claude/skills/e2e/node_modules"
  # Installed dependencies for type checks, shared read-only from the main
  # checkout: the root plus every `workspaces` entry in kit.config.json.
  # ponytail: node_modules only; a stack with another dependency dir adds it here.
  for ws in . $(jq -r '.workspaces // {} | .[]' "$MAIN/.claude/kit.config.json" 2>/dev/null); do
    [ -d "$MAIN/$ws/node_modules" ] && [ -d "$W/$ws" ] && [ ! -e "$W/$ws/node_modules" ] && ln -s "$MAIN/$ws/node_modules" "$W/$ws/node_modules"
  done

  # "Before" snapshot without a commit: temporary index -> tree object.
  IDX="$(mktemp)"; rm -f "$IDX"
  BASE="$(cd "$W" && GIT_INDEX_FILE="$IDX" git read-tree HEAD && GIT_INDEX_FILE="$IDX" git add -A && GIT_INDEX_FILE="$IDX" git write-tree)"

  EXTRA="$(jq -r '.extra_tools // empty' "$CASE")"
  echo "… $NAME (from $(git -C "$MAIN" rev-parse --short "$FROM"))"
  ( cd "$W" && claude -p "$(jq -r .prompt "$CASE")" \
      --allowedTools "$TOOLS${EXTRA:+,$EXTRA}" --permission-mode dontAsk --max-turns 60 \
      ${EVAL_MODEL:+--model "$EVAL_MODEL"} --output-format json > "$W.result.json" 2>"$W.stderr" )

  mkdir -p "$EVALS/results/$STAMP"
  cp "$W.result.json" "$EVALS/results/$STAMP/$NAME.result.json" 2>/dev/null
  RES="$(cd "$W" && BASE="$BASE" IDX="$IDX" SAVE_DIFF="$EVALS/results/$STAMP/$NAME.diff" bash "$GRADE/check.sh" "$CASE" "$W.result.json")" || failed=$((failed + 1))
  echo "$RES" | tee -a "$OUT"

  git -C "$MAIN" worktree remove --force "$W"
  rm -rf "$(dirname "$W")" "$IDX"
done

if [ "$ran" -eq 0 ] && [ "$WANT" != all ]; then
  echo "eval: no runnable case named '$WANT'" | tee -a "$OUT"; exit 1
fi
echo "$ran ran, $failed failed — $OUT" | tee -a "$OUT"
[ "$failed" -eq 0 ]
