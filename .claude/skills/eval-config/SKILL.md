---
name: eval-config
description: Run the local eval suite that regression-tests the Claude configuration (CLAUDE.md, skills, agents, hooks, rules, settings, model routing) and compare it with the baseline. Use on '/eval-config', 'run the evals', 'test the claude config', after editing CLAUDE.md / a skill / an agent / a hook / a rule, and before and after a model-routing change.
---

# /eval-config — regression-test the agent configuration

The suite lives in `.claude/evals/` — format, runner, case list and how to add a case in
`.claude/evals/README.md`. Do not restate it here.

## Run

1. Count the cases: `ls .claude/evals/cases/[!_]*.json 2>/dev/null | wc -l`. Zero → say so, point to
   README → "Adding a case" (seed from `.claude/tasks/lessons.md`, template `cases/_example.json`) and
   stop.
2. Say what will run and roughly what it costs: one headless `claude -p` session per case (a few
   minutes each), sequential.
3. Run it in the background and wait for the notification:
   ```bash
   bash .claude/evals/run.sh all          # or: bash .claude/evals/run.sh <case>
   ```
   `EVAL_MODEL=<model>` for a model-routing trial (run once on the current model, once on the new one).
   Without it the headless session uses the default model and skills/agents keep their own `model:` pins.
4. Never run a test suite at the same time (`_shared/verify-commands.md` — one test process at a time).

## Report

- The new `results/<date>.txt` against `.claude/evals/baseline.txt`, case by case:
  `PASS → FAIL` is a **regression** — name the configuration change that caused it (the files under
  `CLAUDE.md` / `.claude/` edited since the baseline run); `FAIL → PASS` is an improvement.
- For a regression, show the failed check lines verbatim and stop. Fix the configuration (or revert
  the change) before relying on it.
- No `baseline.txt` yet → report the run as is; offer it as the first baseline only if every case passed.
- Ask before replacing `baseline.txt`. Only a full `all` run with no regressions replaces it; first line
  `baseline <date> — <what changed>, <model>`, then the run's PASS/FAIL/SKIP lines.

## Adding a case

When a lesson in `.claude/tasks/lessons.md` names a class of agent mistake, add a case to
`.claude/evals/cases/` in the same change (README → "Adding a case"), run that one case, and confirm
it fails on a configuration without the fix or passes with it.
