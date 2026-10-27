---
name: cherry-pick-deploy
description: "Deploy a subset of tickets by cherry-picking their merge commits onto the last production tag, cutting one tag, and running the staging then production deploy workflows on it. Asks which environments before tagging. Use on '/cherry-pick-deploy', 'deploy with cherry-pick', 'deploy only <ID> to staging/production', 'cherry pick deploy', 'despliega solo esta tarea', 'deploy por cherry-pick'. Use /deploy-all instead when everything on main should go out."
model: opus
---

# /cherry-pick-deploy — selective staging / production release

Use when an environment must receive **some** of what is on the main branch, not all of it. Deploying
everything is `/deploy-all`. Releases are a tag-only line: each release tag is the previous production
tag plus cherry-picks.

Choosing environments, cutting and pushing the tag, running the workflows and verifying live in
`.claude/skills/_shared/tag-deploy.md` (phases T0–T4). This skill owns only what goes on the tag: the
last production tag plus the picked commits.

Paths are relative to the repo root. Config: `.claude/kit.config.json` — `git.mainBranch` (`<main>`),
`git.remote` (`<remote>`), `git.worktreesDir` (where the release is built).

---

## Phase 0 — Collect the commits

Ask for the ticket(s) if not given. For each ticket, list its merged PRs **oldest first**:

```bash
gh pr list --state merged --base <main> --search "<ID>" --json number,title,mergedAt,mergeCommit,url \
  --jq 'sort_by(.mergedAt)[] | "\(.mergedAt)  #\(.number)  \(.mergeCommit.oid[0:9])  \(.title)"'
```

Which SHA to cherry-pick:

| How the PR landed | Take |
|---|---|
| **Squash and merge** (the `/ship` default) | the single `mergeCommit` SHA on `<main>` |
| Plain merge | the branch's own commits, **not** the merge commit |

A merge commit cherry-picks with no `-m` and fails, or drags in unrelated work. Check before assuming —
`gh pr view <PR> --json mergeCommit` plus `git show --no-patch --format=%p <sha>`: two parents = merge
commit.

Print the final ordered list (oldest → newest across all tickets) and confirm it with the user before
touching git.

---

## Phase 0.5 — Environments

Run **T0** from `tag-deploy.md`. The base is the last **production** tag in every case, staging-only
included — it is what production runs, and staging is deployed from the same ref. Staging-marker tags
are stale by design; never cherry-pick onto one. Below, `<last-tag>` is that production tag.

**Staging rollback check** (staging or both). Compare against what the staging deploy workflow last
shipped (its `headSha` from T0) — not any automatic QA deploy on push to `<main>`:

```bash
git log --oneline <staging headSha> ^<last-tag>
```

Those are commits staging runs today that the base tag lacks. Any of them not among the Phase 0 picks
(compare by subject — a cherry-pick carries a new SHA) means deploying the new tag to staging **rolls
staging back** and loses them. List them, say so, and let the user decide; production is still the
reason to cut the tag.

---

## Phase 1 — Start from the last production tag

T0 already fetched tags and resolved `<last-tag>`. Build the release in its own worktree — never a
detached checkout in the main checkout, which peer sessions own (`_shared/team-rules.md` §D1):

```bash
git worktree add --detach <worktreesDir>/release-<last-tag> <last-tag>
cd <worktreesDir>/release-<last-tag>
```

---

## Phase 2 — Cherry-pick, oldest to newest

One at a time, in the confirmed order:

```bash
git cherry-pick <sha>
```

**A conflict means the target environment is missing a commit this one depends on.** Do not invent the
missing code and never commit a half-resolved file:

```bash
git diff --name-only --diff-filter=U                                  # what conflicted
git log --oneline <last-tag>..<remote>/<main> -- <conflicted files>   # the likely missing dependency
git cherry-pick --abort
```

Say which earlier commit is missing and stop. The answer is usually "that PR must go out too", which
changes the list in Phase 0 — restart from there.

After the last pick:

```bash
git log --oneline <last-tag>..HEAD
```

Count must equal the list. Verify before tagging — a tag is public. Run the **fast gate** from
`.claude/skills/_shared/verify-commands.md` on the files the picks touched, only in the workspaces they
touched:

```bash
git diff --name-only <last-tag>..HEAD
```

Fast gate red → stop; the picks do not stand alone on this base.

---

## Phase 3 — Tag, push, confirm, deploy, verify

Follow `tag-deploy.md`:

- **T1** — `{kind}` = `deploy.tag.cherryPickEnv` (default `C`), `<ref>` = `HEAD` (the release
  worktree). Message: the ticket ID(s) and what ships. Show `git log --oneline <last-tag>..HEAD` at the
  push gate.
- **T2** — the compare must contain every commit from Phase 0 and nothing else. A stray commit means
  Phase 1 started from the wrong place.
- **T3** — both environments = staging first, then production, on the same tag.
- **T4** — verify, then report per the shared format, adding the staging rollback warning (if Phase 0.5
  raised one) and the user's decision.

Clean up once every requested environment is done:

```bash
cd <repo root> && git worktree remove <worktreesDir>/release-<last-tag>
```
