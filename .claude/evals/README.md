# Evals for the Claude configuration

Regression tests for what steers the agent: `CLAUDE.md`, `.claude/skills`, `.claude/agents`,
`.claude/hooks`, `.claude/settings.json`, `.claude/rules`, `.claude/stacks`, and the model routing. Run
**locally** — never in CI.

Run them with `/eval-config`, or directly:

```bash
bash .claude/evals/run.sh all                    # every case, one at a time
bash .claude/evals/run.sh follow-spec-literally  # one case
EVAL_MODEL=sonnet bash .claude/evals/run.sh all  # before/after a model-routing change
```

Needs `git`, `jq` and `claude` on the PATH. A fresh project has no cases: the runner says so and exits 0.

## How a case runs

1. A throwaway detached worktree of the product code at the case's `from` commit.
2. The **local** configuration under test is copied in (`CLAUDE.md` + `.claude/{kit.config.json,settings.json,skills,agents,hooks,rules,stacks,design-patterns,REVIEW.md}`), replacing whatever the `from` commit holds; `.claude/evals` is removed from the copy. `node_modules` of the root and of every `workspaces` entry are linked from the main checkout.
3. A "before" snapshot is written as a tree object from a temporary index — no commit, no branch.
4. One headless run: `claude -p "<prompt>" --permission-mode dontAsk --max-turns 60` with a read/edit/inspect tool allowlist plus the case's `extra_tools`.
5. `check.sh` grades what the run left behind, from a copy of the suite made before any run.
6. The worktree is removed; one line per case goes to `results/<date>.txt`, the diff and result JSON to `results/<date>/`.

A run fails when it errors, when it changes a file outside `may_change`, or when any check fails.

**Model.** No `EVAL_MODEL` → the session default, and every skill or agent inside the run keeps its own
`model:` frontmatter pin. `EVAL_MODEL=<model>` passes `--model` to the headless session only.

## Case format (`cases/<name>.json`)

```json
{
  "name": "kebab-name",
  "source": "where the lesson came from (lessons.md entry, team rule, CLAUDE.md section)",
  "from": "<commit or ref the run starts from>",
  "prompt": "<the task, in the ticket's words>",
  "may_change": ["<folders or files the run may touch>"],
  "extra_tools": "<optional: comma-separated allowedTools, e.g. the stack's fast-gate commands>",
  "checks": [{ "name": "…", "run": "<bash; exit 0 = pass>" }],
  "known_fail": "<optional: reason; skipped by 'all' until fixed>"
}
```

`cases/_example.json` is a complete, stack-neutral template. Files starting with `_` never run — copy it
to `cases/<name>.json` and edit.

`extra_tools` lets the run self-check the way a pipeline would. Take the commands from the stack profile
§Fast gate (`.claude/stacks/<stack>.md`) and write them as allowedTools patterns, e.g.
`Bash(npx tsc *),Bash(npx eslint *)`. Never a test runner (see below).

Check commands run from the root of the run's checkout and can use:

| Variable | Holds |
|---|---|
| `DIFF_FILE` | Full patch of the run's changes, new files included |
| `CHANGED_FILES` | Changed paths, one per line |
| `ADDED_FILES` | New paths, one per line |
| `EVALS` | Folder holding the grading copy of the suite |

Prefer behaviour and diff checks over "the code looks like X". Keep checks fast: no test suites — one
test process at a time is a machine-safety rule (`_shared/verify-commands.md`), and never inside a grader.

## Cases

| Case | Source | Catches |
|---|---|---|
| — | — | None yet. Add a row per case. |

## Adding a case

Seed cases from `.claude/tasks/lessons.md`. A lesson that names a **class** of agent mistake (not a
one-off fact) adds a case in the same change as its `lessons.md` entry (`/fix` Step 5 lessons, the
"after any correction" rule in `CLAUDE.md`):

1. Pick the lesson; write `source` as its date + ticket + one-line mistake.
2. `from`: the commit just before the original mistake when the history has it (`<sha>~1`); otherwise
   `HEAD`/the main branch with a prompt that tempts the mistake.
3. `prompt`: the task in the ticket's words, naming exact files. End with "Do not run the test suites."
4. `may_change`: the narrowest folders the honest fix needs — a stray edit fails the case.
5. `checks`: grep `DIFF_FILE` / `CHANGED_FILES` / `ADDED_FILES` for the mistake and for the right shape.
   One check per rule in the lesson.
6. Run that one case (`bash .claude/evals/run.sh <name>`). It must pass on the current configuration;
   when you can, confirm it fails with the lesson's rule removed from the configuration.
7. Add a row to the table above.

## Baseline

`baseline.txt` holds the last accepted full run — absent until the first clean `all` run is accepted.
`/eval-config` compares every run with it. A case that fails on the baseline is either fixed in the
configuration or marked `known_fail` with a reason.
