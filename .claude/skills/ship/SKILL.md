---
name: ship
description: "Take an open PR from review to deployed-and-verified: post the PR URL on its ticket, wait for the real CI checks to go green, confirm the QA deploy workflows are enabled (enable them if not), squash-merge the PR, wait for the QA deploy triggered by the merge commit, then hand off to /qa-report. Use on '/ship', '/ship <ID>', 'ship this', 'merge the PR', 'squash and merge', 'post the PR to the ticket and merge it', 'merge and deploy to QA', 'deploy this to QA'."
model: opus
---

# /ship — PR → ticket → CI → squash-merge → QA deploy → /qa-report

> **Model routing** — `opus`, because the actions are irreversible and outward-facing — squash-merge to
> the main branch, enabling deploy workflows, triggering the QA deploy — and Phase 2's "is this the
> *real* CI check" call is easy to get wrong.

Runs after `/create-pr`. Six phases, two of them hard gates that stop and ask.
Everything here is `gh` + `node .claude/skills/_lib/ticket.mjs` — there is no driver script.

**Never squash-merge without an explicit go-ahead from the user** (`_shared/team-rules.md` §D2).
Phase 4 stops.

Paths are relative to the repo root. Config: `.claude/kit.config.json` — read a key with
`node -p "require('./.claude/kit.config.json').<key>"`.

| Key | Used for |
|---|---|
| `git.mainBranch` (`<main>`), `git.remote` (`<remote>`) | the only base this skill ships to |
| `workspaces.api` / `workspaces.web` | which areas the PR touches |
| `ci.ignoreWorkflows` | no-op / shadow workflows that never count as CI |
| `deploy.qa.workflows`, `deploy.qa.trigger` | the QA deploys to expect and wait for |
| `techLead.github` | the C3(a) approver |
| `statusFlow.prOpened`, `statusFlow.ciGreen` | ticket transitions |
| `environments.qa` | whether a QA hand-off exists at all |

---

## Prerequisites

```bash
gh auth status                      # needs repo write
node .claude/skills/_lib/ticket.mjs status <ID>
```

Inputs: the **PR number** and the **ticket ID**. Derive both when possible —

```bash
gh pr view --json number,url,title,headRefName
```

The branch name and the PR title both carry the ID (§D1, §C1). If the branch holds work for several
tickets, ask which ticket the comment goes on — one ticket, one comment.

`<out>` = the ticket's docs folder from `_shared/output-location.md`.

---

## Phase 0 — Read the PR before touching anything

```bash
gh pr view <PR> --json number,url,title,state,mergeStateStatus,mergeable,baseRefName
```

Stop and report instead of continuing when:

| Reading | Meaning |
|---|---|
| `state: MERGED` / `CLOSED` | already shipped, or the branch was renamed out from under it — do not re-ship, go straight to `/qa-report` |
| `baseRefName` ≠ `<main>` | this skill only ships to `<main>` |
| `mergeStateStatus: DIRTY` | conflicts — the user rebases (`/rebase-main`), not you |
| `mergeStateStatus: BLOCKED` | a required review or check is missing; say which and stop |

`UNSTABLE` just means checks are still running. That is normal at this point.

**Which areas the PR touches** — computed from its files, *not* assumed:

```bash
API=$(node -p "require('./.claude/kit.config.json').workspaces.api")
WEB=$(node -p "require('./.claude/kit.config.json').workspaces.web")
gh pr view <PR> --json files -q "[.files[].path
  | if startswith(\"$API/\") then \"api\"
    elif startswith(\"$WEB/\") then \"web\"
    else \"other\" end] | unique[]"
```

**Which QA deploys to expect.** `deploy.qa.workflows` empty → log
`No QA deploy configured (deploy.qa.workflows is empty) — skipping Phases 3 and 5.` and skip them.
Otherwise, for each listed workflow read its file under `.github/workflows/` and its `on.push`
`paths` / `paths-ignore`:

- No path filter → it fires on every push to `<main>`.
- Path filter → it fires only if a PR file matches. List which workflows will fire.
- None will fire (e.g. docs or `.claude/` only) → **no QA deploy will ever come**; skip Phases 3 and 5
  and say so. Waiting for a deploy that path filters exclude is the easiest way to hang this skill.

`deploy.qa.trigger` other than `push-main` → this skill cannot key the run on the merge commit; say so
and skip Phase 5 (Phase 3 still runs).

---

## Phase 1 — Post the PR URL on the ticket

```bash
cat > <out>/ship-comment.md <<'EOF'
PR: <PR url>

<PR title>
EOF

node .claude/skills/_lib/ticket.mjs comment <ID> <out>/ship-comment.md
```

Keep the comment to the URL plus the PR title; the *what* and *why* already live in the PR body and in
`/qa-report`'s comment later. No attribution line (§D3).

Then move the ticket to review:

```bash
node .claude/skills/_lib/ticket.mjs status <ID>
node .claude/skills/_lib/ticket.mjs transition <ID> --to "<statusFlow.prOpened>"
```

Read the status first — statuses drift while you work. Already at `statusFlow.prOpened` (e.g.
`/create-pr` moved it) → skip. `statusFlow.prOpened` is `null` → skip with a log line.

---

## Phase 2 — Wait for the *real* CI to go green

```bash
gh pr checks <PR> --watch
```

That blocks until every check settles. Its exit code counts **every** check, including the ones the
project ignores — so never decide green/red from it. Decide from the rollup, filtered on the workflow
name against `ci.ignoreWorkflows`:

```bash
IGNORE=$(node -p "JSON.stringify(require('./.claude/kit.config.json').ci.ignoreWorkflows)")
gh pr view <PR> --json statusCheckRollup -q ".statusCheckRollup[]
  | (.workflowName // .context // .name) as \$wf
  | select($IGNORE | index(\$wf) | not)
  | \"\(\$wf) / \(.name // .context): \(.status // .state) \(.conclusion // \"\")\""
```

**The shadow-check trap.** A no-op workflow can publish check runs with the **same `name`** as the real
ones and finish in seconds. Any green read keyed on the check *name* is meaningless — key on the
workflow name, and list such workflows in `ci.ignoreWorkflows`.

Green = every remaining line `COMPLETED SUCCESS` (or `SKIPPED` / `NEUTRAL`). Only the workflows that
match the touched areas appear — an API-only PR may show one workflow, and that is green, not missing.

**Red CI is not this skill's problem to route around.** Do not merge, do not retry blindly. Pull the
failure and read it:

```bash
gh run view <run-id> --log-failed | head -60
```

Some failures are environmental, not code — e.g. a persistent CI database missing a migration merged
earlier, or regenerated snapshots leaving a dirty tree. Name the cause; the user fixes the environment
(or commits the snapshots), then `gh run rerun --failed <run-id>`.

Anything else — hand it back with the log excerpt. Then, green:

```bash
node .claude/skills/_lib/ticket.mjs status <ID>
node .claude/skills/_lib/ticket.mjs transition <ID> --to "<statusFlow.ciGreen>"
```

`statusFlow.ciGreen` is earned by **passing checks**, not by opening the PR. `null` → skip with a log line.

---

## Phase 3 — Confirm the deploy workflows are enabled

Skipped when Phase 0 said no QA deploy will fire.

A workflow disabled in the Actions UI stays silently disabled: the merge lands, the push event fires,
and nothing deploys. Check before merging, while it is still cheap.

```bash
gh workflow list --all --json name,path,state,id -q '.[] | "\(.name)\t\(.path)\t\(.state)\t\(.id)"'
```

Match each expected workflow from Phase 0 (by name or file path). Anything other than `active`
(`disabled_manually`, `disabled_inactivity`) → enable it, then re-read to confirm:

```bash
gh workflow enable "<workflow>"
gh workflow list --all --json name,state -q '.[] | select(.name=="<workflow>") | .state'
```

Only enable the ones Phase 0 said this PR fires. Leave the rest alone.

### Then: is another deploy already in flight?

Many deploy targets allow **one active deployment per target**. A second one does not queue — it is
rejected and the whole workflow run fails (a "deployment limit exceeded" / "already has an active
deployment" error). The code still lands on `<main>`; only QA is left serving the previous build. So
check for a running deploy **before merging**, when waiting costs nothing:

```bash
for wf in <each expected workflow>; do
  gh run list --workflow "$wf" --branch <main> --limit 5 \
    --json databaseId,headSha,status,displayTitle \
    -q ".[] | select(.status==\"in_progress\" or .status==\"queued\")
        | \"$wf BUSY: \(.databaseId) \(.headSha[0:8]) \(.displayTitle[0:50])\""
done
```

Any output → **do not merge yet.** Wait for that run, then merge:

```bash
gh run watch <that-run-id> --exit-status
```

This is a race, not a conflict: a colleague's merge landing seconds before yours is enough. Re-check
immediately before `gh pr merge`, not once at the top of the phase.

**If you lose the race anyway** (merged, deploy red with a deployment-limit error): the fix is a rerun,
not a re-merge. Wait for the blocking run to finish, then `gh run rerun --failed <your-run-id>` and
watch it. Nothing needs to be reverted or re-pushed.

---

## Phase 4 — GATE, then squash-merge

### C3 preconditions — check both before opening the gate

`.claude/skills/_shared/team-rules.md` §C3: (a) Tech Lead approval, (b) green CI. Phase 2 covers (b).
For (a):

| PR | C3(a) |
|---|---|
| Title starts with `fix(` — a bug-fix PR | **not required** — merges on green CI + the user's go-ahead |
| `techLead.github` is `null` (solo project) | the user's go-ahead is the approval |
| Anything else | the Tech Lead's latest review must be `APPROVED` |

```bash
TL=$(node -p "require('./.claude/kit.config.json').techLead.github")
gh pr view <PR> --json reviews \
  -q "[.reviews[] | select(.author.login==\"$TL\")] | last | .state"
```

`APPROVED` → proceed. Anything else — empty, `CHANGES_REQUESTED`, `COMMENTED`, or an approval a later
review superseded — **do not merge.** Report which precondition is missing and stop. Where the Tech
Lead's approval is required, the user's go-ahead does not substitute for it; the rule is the team's,
not the session's.

**Stop here and ask.** Present: PR number and title, the real CI lines from Phase 2, the C3 approval
state (or why it is not required), the QA deploys that will fire. Wait for an explicit go-ahead. Then,
and only then:

```bash
gh pr merge <PR> --squash --delete-branch
```

`--squash` is the only permitted merge mode. Never `--merge`, never `--rebase`, never `--auto` (it
merges later, unattended, outside the gate).

Capture the merge commit immediately — the rest of the skill keys off it:

```bash
gh pr view <PR> --json mergedAt,mergeCommit -q '"\(.mergedAt) \(.mergeCommit.oid)"'
```

**After this command the branch is gone.** Anything still holding that branch locally is now stale: a
later `git push` re-creates a branch that no longer matches the PR (`* [new branch]` in the push output
is the tell), and `gh pr edit` targets a merged PR and changes nothing on `<main>`. More work needed →
fetch, branch fresh off `<remote>/<main>` (§D1), open a new PR.

---

## Phase 5 — Wait for the QA deploy triggered by the merge commit

Skipped when Phase 0 said no QA deploy will fire, or `deploy.qa` is not a `push-main` trigger.

The deploy workflows key on `push` to `<main>`, so the run to wait for is the one whose `headSha` **is
the merge commit** — not merely the newest run, which may belong to somebody else's merge that landed
seconds earlier.

The run takes a few seconds to appear. Poll for it, then watch it — per expected workflow:

```bash
SHA=$(gh pr view <PR> --json mergeCommit -q .mergeCommit.oid)

for i in $(seq 1 20); do
  ID=$(gh run list --workflow "<workflow>" --branch <main> --limit 10 \
        --json databaseId,headSha -q ".[] | select(.headSha==\"$SHA\") | .databaseId" | head -1)
  [ -n "$ID" ] && break
  sleep 15
done

gh run watch "$ID" --exit-status
```

Run each expected workflow's watch to completion.

Sanity-check the shape of the result:

```bash
gh run list --workflow "<workflow>" --branch <main> --limit 3 \
  --json databaseId,headSha,status,conclusion,createdAt \
  -q '.[] | "\(.databaseId) \(.headSha[0:8]) \(.status) \(.conclusion) \(.createdAt)"'
```

A merge sha missing under one workflow while present under another is the path filter doing its job,
not a broken deploy. Confirm against the Phase 0 list before ever calling a deploy stuck.

Deploy red → the code is on `<main>` but not on QA. Say that plainly, pull
`gh run view <ID> --log-failed`, and stop. Do not run `/qa-report`: it would test the previous build and
report a pass for code that never deployed.

---

## Phase 6 — Hand off to /qa-report

`environments.qa` is `null` → log `No QA environment configured — /ship ends at the merge.` and report.

Otherwise QA now serves this build. Invoke `/qa-report <ID>` and give it the build reference it demands
as a prerequisite:

- PR number and URL
- merge commit sha, `mergedAt`
- the deploy run id(s) and their conclusions (or "no QA deploy fired — path filters" from Phase 0)

`/qa-report` owns everything after this — running the ticket's scenarios against QA, the evidence
files, the ticket comment with attachments, and the final status transition. Do not pre-empt its
comment or its transition here.

---

## Gotchas

| Trap | What it looks like | Rule |
|---|---|---|
| Shadow workflows reuse real check names | a check green in seconds while the real run is still going | Filter on the workflow name, list the shadow in `ci.ignoreWorkflows` |
| Path filters mean a workflow never fires | waiting forever on a web deploy for an API-only PR | Compute expected workflows from the PR files in Phase 0 |
| Newest run ≠ your run | a colleague's merge lands first and you watch their deploy | Match `headSha` against the merge commit |
| Deploy run lags the merge | first `gh run list` right after merging returns nothing | Poll ~20 × 15s before declaring it missing |
| `--delete-branch` orphans local work | later push prints `* [new branch]`; `gh pr edit` no-ops | Branch fresh off `<remote>/<main>` for follow-ups |
| Renaming a branch with an open PR | PR closes, head ref orphaned, reopen fails | Never rename via the API; see `/create-pr` Step 1.5 |
| Disabled workflow | merge succeeds, QA never changes, no error anywhere | Phase 3, before the merge |
| Another deploy already in flight | deploy run red with a deployment-limit error; code on `<main>`, QA on the old build | Phase 3, re-check right before `gh pr merge`; recover with `gh run rerun --failed` |
| `--auto` | merges unattended after the gate | Forbidden; the gate is the point |

---

## Troubleshooting

| Symptom | Fix |
|---|---|
| `gh pr checks --watch` exits non-zero | read the filtered rollup — the failure may be an ignored workflow; if real, `gh run view <id> --log-failed \| head -60` |
| CI red on a missing table/column right after another PR's migration | persistent CI database behind; the user migrates it, then `gh run rerun --failed` |
| CI red right after a snapshot update | regenerated snapshots left a dirty tree; commit them |
| `transition` rejected | unknown status name; check `statuses` / `statusFlow` in the config |
| `gh run watch` returns immediately | you watched an already-completed run — check its `headSha` matches the merge commit |
| Deploy red, log says the target already has an active deployment | a colleague's deploy held it; wait for it, then `gh run rerun --failed <id>` |
| PR shows `MERGED` but no deploy run exists at all | no expected workflow matched the files, or a workflow was disabled at merge time (Phase 3 skipped) |
