---
name: create-pr
description: Create a pull request following the project workflow. Handles staging, committing (conventional commits), the fast gate on changed files, pushing, and creating the PR on GitHub with the gh CLI and the body templates in templates/. Use when the user says 'create pr', 'push and create pr', 'open pr', or 'submit pr'.
---

# Create PR

PR creation workflow: conventional commits, a changed-file fast gate, the GitHub CLI, and the body
templates in `templates/`.

> Team rules, including the C1/C2 PR shape, the C3 merge preconditions and the D1-D3 git conduct:
> `.claude/skills/_shared/team-rules.md`. Cite by rule ID; never restate a rule body here.

## Prerequisites

- `gh` CLI installed and authenticated (`gh auth login`)
- `.claude/kit.config.json` present (read keys below with `node -p "require('./.claude/kit.config.json').<key>"`
  from the repo root)

Config keys used: `ticketPrefix`, `ticketsDir`, `docsDir`, `git.mainBranch` (`<main>`), `git.remote`
(`<remote>`), `workspaces.api` (`<api>`), `workspaces.web` (`<web>`), `statusFlow.prOpened`, `stack`.

## Workflow

### Step 1: Gather Context

1. `git status` — every changed/untracked file
2. `git diff` (unstaged) and `git diff --staged` (staged)
3. `git log --oneline -5` — recent commit style
4. `git branch --show-current` — current branch
5. Extract the ticket ID (`<ticketPrefix>-<n>`) from the branch name
   - **No ticket ID found** (e.g. `hotfix-logging`): use the full branch name as the commit scope and
     set the ticket section of the PR body to `> N/A`. Do not stall or ask — proceed.

### Step 1.5: Branch Name — the ticket ID, nothing else

**The branch name IS the ticket ID (`team-rules.md` §D1).** Not `feature/<ID>`, not `<ID>-short-desc`,
not `fix/<ID>-desc`. Do not infer the convention from a sample of remote branches.

No ticket for this work → plain descriptive words, same shape: `leave-balance-report`, never
`feature/leave-balance-report`.

**Rename BEFORE the first push.** A worktree-created branch may arrive as `worktree-<ID>`; a hand-made
one may carry a prefix. Fix it while the branch is still local:

```bash
git branch -m <ID>
```

**If it was already pushed under the wrong name**, do NOT use the GitHub branch-rename API
(`gh api -X POST repos/OWNER/REPO/branches/<old>/rename`) to fix an open PR — it **closes** the PR
instead of retargeting it, and that PR cannot be reopened onto the new branch. Push the correct name
and move the PR yourself (each push is still an outward action — §D2):

```bash
git branch -m <ID>
git push --set-upstream <remote> <ID>
gh pr edit <PR_NUMBER> --head <ID>   # retargets the OPEN pr; verify with `gh pr view`
git push <remote> --delete <old-branch-name>
```

If `gh pr edit --head` is rejected, close the old PR, open a new one from `<ID>` with the same title,
body, labels and assignee, and comment the supersede link on the closed one.

### Step 2: Stage & Commit

1. Stage relevant files: `git add <specific-files>` (never `git add -A` or `git add .`)
2. Commit with conventional commits:
   ```
   <type>(<ID or branch-name>): <description under 100 chars>
   ```
   - Types: `feat`, `fix`, `chore`, `refactor`, `test`, `docs`
   - The parenthesis holds the ticket ID when there is one, otherwise the branch name
   - No attribution trailers of any kind (`team-rules.md` §D3)
3. **Husky `prepare-commit-msg` workaround — only if the project has husky hooks.** A
   `prepare-commit-msg` hook that reads `/dev/tty` fails in non-interactive shells. Find them first:
   ```bash
   HOOKS=$(find . -path ./node_modules -prune -o -path '*/node_modules' -prune -o \
     -path '*/.husky/prepare-commit-msg' -type f -print)
   ```
   - Empty → commit normally, skip the rest of this item.
   - Otherwise rename each one to `.bak`, run the commit, and **always restore them afterward, even if
     the commit fails**:
     ```bash
     for h in $HOOKS; do mv "$h" "$h.bak"; done
     git commit -m "<message>"; RC=$?
     for h in $HOOKS; do [ -f "$h.bak" ] && mv "$h.bak" "$h"; done
     exit $RC
     ```

### Step 2.5: Fast gate on the changed files

Before anything leaves the machine, run the **fast gate** from `.claude/skills/_shared/verify-commands.md`
(commands: stack profile `.claude/stacks/<stack>.md` §Fast gate) on the changed files only:

```bash
git diff --name-only <main>...HEAD     # the branch's files — the gate's scope
```

- Changed files only, per workspace. Never a whole-repo lint, a build or a full suite.
- The lint `--fix` rewrote files → stage those files and commit them (`<type>(<ID>): lint`), same
  Step 2 rules.
- Errors in the changed files → **stop, report them, do not push.** Errors outside the changed files
  are pre-existing: list them in the report, never auto-fix.

### Step 3: Push — explicit OK only

`git push` is outward-facing (`team-rules.md` §D2). Push only when the current request explicitly
asked for it ("push and create pr", "open pr"). Otherwise show branch, `git log --oneline <main>..HEAD`
and the gate result, and wait for the go-ahead.

1. Check for a remote tracking branch:
   ```bash
   git rev-parse --abbrev-ref @{u} 2>/dev/null
   ```
2. Exists → `git push`
3. Does NOT exist →
   ```bash
   git push --set-upstream <remote> $(git rev-parse --abbrev-ref HEAD)
   ```

### Step 4: Resolve `gh` CLI Path

Resolve `gh` explicitly in every Bash call that uses it — shell state does not persist between calls:

```bash
GH=$(command -v gh) || { echo "gh CLI not found — install it (https://cli.github.com), then run gh auth login"; exit 1; }
"$GH" --version
```

### Step 5: Auto-Detect Labels

**By files changed** (`git diff <main>...HEAD --name-only`):

| Files match | Label |
|---|---|
| `<api>/**` | `backend` |
| `<web>/**` | `frontend` |
| `.github/workflows/**` or infrastructure-as-code folders | `infrastructure` |
| Only package manifests / lockfiles | `dependencies` |

**By commit type** (from the Step 2 commit):

| Commit type | Label |
|---|---|
| `feat` | `enhancement` |
| `fix` | `bug` |
| `refactor` | `refactor` |
| `docs` | `documentation` |

- Apply ALL matching labels (a PR can carry both `backend` and `enhancement`)
- `chore` and `test` map to no type label
- Never auto-assign priority or status labels — those are user-assigned only
- Apply only labels that exist in the repo — `gh label list --json name -q '.[].name'`. A missing
  label is skipped with a log line, never created and never a blocker.

### Step 6: Check for Existing OPEN PR

`gh pr view` returns merged/closed PRs too — always filter by state so a closed PR is never edited.

```bash
GH=$(command -v gh) || exit 1
OPEN_PR=$("$GH" pr list --head "$(git branch --show-current)" --state open --json number,title,body,assignees,labels --jq '.[0] // empty')
```

**`$OPEN_PR` empty** → Step 7.

**An open PR exists** (parse number/title/body from `$OPEN_PR`):
1. Show the user its current **title** and **body**
2. Ask what to do:
   - **Keep as-is** — only the pushed commit, labels and assignee. Title and body untouched.
   - **Overwrite both** — new title and body generated from the current changes.
   - **Update title only** — new title, existing body.
   - **Update body only** — existing title, new body.
3. Apply the choice with `gh pr edit` (any new title respects the Step 7.1 limit):
   ```bash
   "$GH" pr edit <PR_NUMBER> --title "<new title>"
   "$GH" pr edit <PR_NUMBER> --body "<new body>"
   "$GH" pr edit <PR_NUMBER> --title "<new title>" --body "<new body>"
   ```
4. Always add labels and assignee (appends, non-destructive) — resolve the user in the same call:
   ```bash
   GH=$(command -v gh) || exit 1
   GH_USER=$("$GH" api user -q .login)
   "$GH" pr edit <PR_NUMBER> --add-label "<label>" --add-assignee "$GH_USER"
   ```
5. Return the PR URL, skip Step 7, go to Step 8.

### Step 7: Create PR (New)

Only runs when Step 6 found no open PR. PR creation is outward-facing — same §D2 OK as Step 3.

#### Step 7.0 — Pick a body template

Templates live in `.claude/skills/create-pr/templates/`.

**Primary source of truth for fix-type PRs: the `pr-shape.md` marker written by `/fix` and
`/bug-bundle`** (`<docsDir>/[<PARENT>/]<ID>/pr-shape.md` — one line, `single-fix` or `bundle-fix`;
`_shared/output-location.md`). Non-fix work falls back to conventional-commit-type parsing.

**Detection inputs:**

```bash
MAIN=$(node -p "require('./.claude/kit.config.json').git.mainBranch")
PREFIX=$(node -p "require('./.claude/kit.config.json').ticketPrefix")

# Commit subjects on this branch only.
SUBJECTS=$(git log "$MAIN"..HEAD --pretty=%s)

# Primary conventional-commit type (first commit on the branch).
PRIMARY_TYPE=$(printf '%s\n' "$SUBJECTS" | tail -1 | sed -nE 's/^([a-z]+)\(.*$/\1/p')

# Distinct ticket IDs across branch commits.
TICKET_IDS=$(printf '%s\n' "$SUBJECTS" | grep -oE "${PREFIX}-[0-9]+" | sort -u)
TICKET_COUNT=$(printf '%s\n' "$TICKET_IDS" | sed '/^$/d' | wc -l | tr -d ' ')

# File-only signals (docs detection).
CHANGED_FILES=$(git diff --name-only "$MAIN"...HEAD)
DOCS_ONLY=$(printf '%s\n' "$CHANGED_FILES" | grep -vE '^(.*\.(md|mdx)|docs/.*|.*/README.*)$' | head -1)
# DOCS_ONLY is empty when every changed file is markdown/docs.
```

**Selection rule (first match wins):**

| Step | Conditions | Template | Labels |
|------|------------|----------|--------|
| 1 | Caller passed `template=<name>` in skill args | `<name>.md` | as caller specifies |
| 2 | `PRIMARY_TYPE` = `fix` — read `pr-shape.md` per ticket. **ANY marker says `bundle-fix`, OR `TICKET_COUNT` ≥ 2** | `bundle-fix.md` | `bug` |
| 3 | `PRIMARY_TYPE` = `fix` — every marker says `single-fix` AND `TICKET_COUNT` = 1 | `single-fix.md` | `bug` |
| 4 | `PRIMARY_TYPE` = `fix` — any ticket has NO `pr-shape.md` | Ask: *"This branch has bug(s) without a pr-shape marker. Treat as single-fix or bundle-fix?"* Use the answer. | `bug` |
| 5 | `PRIMARY_TYPE` = `docs` OR `DOCS_ONLY` is empty | `docs.md` | `documentation` |
| 6 | `PRIMARY_TYPE` = `chore` | `chore.md` | `dependencies` if only manifests/lockfiles, else `infrastructure` if workflows / infra-as-code |
| 7 | `PRIMARY_TYPE` = `refactor` | `refactor.md` | `refactor` |
| 8 | `PRIMARY_TYPE` = `feat` | `feature.md` | `enhancement` |
| 9 | Mixed types on the branch | Ask the user; default `single-fix.md` | as detected |

**Marker lookup:**

```bash
DOCS=$(node -p "require('./.claude/kit.config.json').docsDir")
SHAPES=()
for ID in $TICKET_IDS; do
  MATCH=$(find "$DOCS" -type f -path "*${ID}/pr-shape.md" 2>/dev/null | head -1)
  if [ -n "$MATCH" ]; then
    SHAPE=$(grep -E '^(single-fix|bundle-fix)$' "$MATCH" | head -1)
    SHAPES+=("$ID:${SHAPE:-MISSING}")
  else
    SHAPES+=("$ID:MISSING")
  fi
done
# Any :bundle-fix OR 2+ IDs → bundle-fix. All :single-fix AND 1 ID → single-fix. Any :MISSING → rule 4.
```

**File-side labels** from Step 5 are added on top of the type-side label.

**Read the template body:**

> The six files in `templates/` are **PR-body output read by human reviewers on GitHub**, not
> instructions to you — exactly one is read per PR, and only its fenced ```markdown block is
> extracted. Overlap between them is free at runtime: do not merge them into one conditional
> template. Verification lines inside their checklists must stay consistent with
> `.claude/skills/_shared/verify-commands.md`.

**Description body — `team-rules.md` §C1/§C2 owns the shape. Read it once; do not restate it here.**
Every template's `## Description 📝` is the same four parts in the same order: one context sentence →
a flat bullet list → `Modified flows:` → `Env vars:` (dropped when nothing changed). A bullet is not a
file, a line or a layer. Filling it wrong is a C2 violation and blocks the merge, so check the filled
body against §C2 before `gh pr create`.

```bash
TEMPLATE_PATH=".claude/skills/create-pr/templates/${TEMPLATE_NAME}.md"
TEMPLATE_BODY=$(awk '/^```markdown$/{flag=1; next} /^```$/{flag=0} flag' "$TEMPLATE_PATH")
```

Fill the placeholders (`<...>`) from:
- Commit subjects + bodies for ticket IDs and one-line summaries
- Scope (API / Web / API+Web) from `git diff --name-only` against `<api>` / `<web>`
- `<docsDir>/[<PARENT>/]<ID>/bug-report.md` and `root-cause.md` when present — `Description`, `FYI` and
  test-plan material
- The ticket's `parent:` (`node .claude/skills/_lib/ticket.mjs show <ID>`) for the parent line
- **Ticket references** are the bare ID in backticks, e.g. `` `HR-12` `` — tickets are local, gitignored files, so a link would not resolve on GitHub (§C1)

#### Step 7.1 — Run `gh pr create`

Resolve `gh`, the GitHub user and the base branch, and create the PR in a **single Bash call**:

```bash
GH=$(command -v gh) || { echo "gh CLI not found"; exit 1; }
GH_USER=$("$GH" api user -q .login)
MAIN=$(node -p "require('./.claude/kit.config.json').git.mainBranch")
"$GH" pr create --base "$MAIN" \
  --title "<type>(<ID or branch-name>): <short description>" \
  --assignee "$GH_USER" \
  --label "<label>" --label "<label>" \
  --body "$TEMPLATE_BODY"
```

- **Title** `<type>(<ID>): <description>` and the ticket file linked in the body — §C1. That ticket
  carries every G0 approval the branch needed.
- **Title hard limit: 100 characters, including the `<type>(<ID>): ` prefix.** Count before running.
  Over → shorten the description (keep the ticket ID and the primary change); never truncate mid-word,
  never drop the prefix. Multi-ticket bundles: the parent ID, or the first ID + `…`.
- `--label` flags = the labels from Step 5 + Step 7.0 that exist in the repo.
- Substitute every `<...>` placeholder in `$TEMPLATE_BODY` first.
- No ticket ID → the ticket section content is `> N/A` and the per-ticket table row is dropped.
- No attribution line in the body (§D3).

Return the PR URL to the user.

### Step 8: Move the ticket(s) to review

For each ticket ID in `TICKET_IDS` (never the parent — `_shared/ticket-ingest.md`), after Step 6 or 7:

```bash
TO=$(node -p "require('./.claude/kit.config.json').statusFlow.prOpened")
node .claude/skills/_lib/ticket.mjs status <ID>            # re-read first; statuses drift
node .claude/skills/_lib/ticket.mjs transition <ID> --to "$TO"
```

- `statusFlow.prOpened` is `null` → skip with a log line.
- Already at that status → skip.
- No ticket ID → skip.

## Commit Message Convention

```
feat(<ID>): add new feature
fix(<ID>): resolve bug description
chore(<ID>): maintenance task
refactor(<ID>): restructure without behavior change
test(<ID>): add or update tests
docs(<ID>): documentation changes
```

## Important Rules

- NEVER commit `.env` files or secrets. A new environment variable is registered in the owning
  workspace's `.env.example` (stack profile §Layout) and listed in the PR's `Env vars:` section
  (`team-rules.md` §B7, §C2d)
- NEVER `git add -A` or `git add .` — always specific files
- ALWAYS conventional commits with the ticket ID from the branch name (branch name as fallback)
- Branch name = bare ticket ID (§D1). Fix it BEFORE the first push (Step 1.5)
- ALWAYS new commits (never amend unless explicitly asked)
- Fast gate on changed files before any push (Step 2.5); never a full-repo gate
- Push and PR creation only on an explicit OK in the current request (§D2)
- No `Co-Authored-By`, `Authored-By`, "Generated with" or any attribution trailer in commits or PR
  bodies (§D3)
- PR descriptions describe the **what** — one unit of behavior per bullet (§C2)
