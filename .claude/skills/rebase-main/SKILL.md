---
name: rebase-main
description: "Update an old branch and its open PR onto the latest main with a rebase, not a merge — preflight safety checks, conflict escalation by scope, a post-rebase gate, and a lease-protected force-push. Use on '/rebase-main', 'update my branch with main', 'rebase onto main', 'my branch is behind main', 'my PR has conflicts', 'actualiza mi rama con main', 'rebasea esto sobre main'."
---

# /rebase-main — replay this branch on top of the latest main

> A rebase preserves the branch's scope: it replays the same commits, it does not fold in new work.
> Resolving a conflict by rewriting behavior is a scope change — `.claude/skills/_shared/team-rules.md`
> §S1, and §S2 if it turns into a refactor.

Rebase, not merge: your commits are replayed on top of `<remote>/<main>` so the PR shows clean linear
history with no merge commit. It **rewrites history**, so the remote branch must be force-pushed —
which is why the preflight and the gate below are not optional.

Config (`.claude/kit.config.json`, read with `node -p "require('./.claude/kit.config.json').<key>"`):
`git.mainBranch` → `<main>`, `git.remote` → `<remote>`, `workspaces.api` → `<api>`,
`workspaces.web` → `<web>`.

## Model routing

No `model:` / `effort:` on this skill — a skill's own tier applies only for the rest of the turn that
invoked it, so on a multi-turn procedure it would revert mid-rebase. It runs at the session tier. What
*is* routed is the one step where a cheap resolution does silent damage:

| Work | Tier |
|---|---|
| Every step except conflicts | session tier |
| **Conflict resolution** | subagent by scope — `backend` (`<api>` files) · `frontend` (`<web>` files) · `architect` (both sides, or a shared util / migration / API contract) |

Dispatch the conflict agent with the conflicted paths and **the two sides**, never just "fix the
conflict". Agent frontmatter carries each agent's model — do not pass a `model` override at the call
site. Prompt boilerplate: `_shared/token-rules.md` §Subagent prompt boilerplate.

## Preflight — all of it, before touching anything

```bash
git rev-parse --abbrev-ref HEAD                  # 1. which branch
git status --porcelain                           # 2. must be empty
git rev-parse <remote>/<branch>                  # 3. RECORD THIS — pre-fetch remote SHA, see step 3
git log --oneline <remote>/<main>..HEAD          # 4. what you are about to replay
```

Hard stops, in order:

1. **On `<main>`?** Abort. Never rebase `<main>`.
2. **Dirty tree?** `git stash push -u -m "pre-rebase"`, and say so — an unstashed rebase either refuses
   to start or strands the work. Restore with `git stash pop` after the push, and verify it applied.
3. **Record the remote SHA before fetching**: `git rev-parse <remote>/<branch>`. The force-push needs
   the value from *before* the fetch. Never pushed (no remote branch) → no lease needed; the push is a
   normal `git push --set-upstream <remote> <branch>`, still behind the explicit OK.
4. **Someone else's commits on the remote branch?** `git log --oneline <remote>/<branch> ^HEAD` — if it
   returns anything, another person pushed. Rewriting that history destroys their work. STOP and ask.
5. **Nothing to replay?** If `<remote>/<main>..HEAD` is empty the branch has no commits of its own —
   there is nothing to rebase. Say so and stop.

## Rebase

```bash
git fetch <remote>
git rebase <remote>/<main>
```

Clean → skip to the gate. Conflicted → below.

## Conflicts

```bash
git diff --name-only --diff-filter=U     # what is conflicted
```

Route by path: `<api>/**` → `backend` · `<web>/**` → `frontend` · both sides, or a shared util /
migration / API contract / `CLAUDE.md` → `architect`.

The agent gets the file list, `git log -1 --format=%s HEAD` (the main-side commit) and
`git log -1 --format=%s REBASE_HEAD` (your commit being replayed), and this rule: **keep both
intents.** A conflict marker resolved by deleting one side is how a feature silently disappears in a
rebase. When the two intents genuinely cannot coexist, stop and ask — do not pick one.

```bash
git add <resolved files>                 # not `git add .` — that stages unrelated strays too
git rebase --continue
```

Repeat per commit; a rebase stops once per conflicted commit, not once in total.

**Escape hatch, always available:** `git rebase --abort` returns the branch exactly as it was. Use it
rather than fighting a rebase that has gone wrong — two failed attempts on the same commit means
`git rebase --onto` or a fresh branch is the better tool.

## Gate — a clean rebase is not a working branch

Both sides can compile alone and fail together (a semantic conflict: main renames a symbol your commits
still call). Nothing in git detects that.

Run the **fast gate** from `.claude/skills/_shared/verify-commands.md` on the branch's changed files
(`git diff --name-only <remote>/<main>...HEAD`) for each workspace the diff touches — changed files
only, never a full-repo gate. Broken → fix on the branch and commit normally; the rebase is already
finished. Failure handling is bounded by `verify-commands.md` §Failure handling.

## Force-push — STOP for the ship-word

Force-push rewrites shared history. It is outward-facing: **never run it without an explicit OK in the
current request** (`team-rules.md` §D2). Show what will change first:

```bash
git log --oneline <remote>/<branch>..HEAD    # gaining
git log --oneline HEAD..<remote>/<branch>    # LOSING — must be empty or explained
```

Then, on the go-ahead:

```bash
git push --force-with-lease=<branch>:<pre-fetch SHA from preflight step 3> --force-if-includes <remote> <branch>
```

**Why not a bare `--force-with-lease`:** it leases against your *remote-tracking ref*, and the
`git fetch` two steps earlier already updated that ref. If a teammate pushed before your fetch, the
bare lease compares against their new commit, passes, and overwrites them — the protection is gone
exactly when you needed it. Pinning the SHA you recorded *before* fetching, plus `--force-if-includes`
(git ≥ 2.30 — check `git --version`), restores it.

Rejected lease → someone pushed. Do **not** retry with `--force`. Re-run the preflight.

## After

- `git stash pop` if preflight stashed, and confirm it applied cleanly.
- The PR updates itself — same branch, rewritten history, no new PR.
- CI re-runs from scratch; previous green results do not carry over.
- Approvals may reset on a force-push depending on branch protection. Warn the user if the PR was
  already approved.

## Not this skill

- Merging the PR → `/ship`.
- Creating the PR → `/create-pr`.
- Branch is fine and you only want main's commits *available* without rewriting → that is a merge, and
  this kit's convention is rebase; say so rather than silently merging.
