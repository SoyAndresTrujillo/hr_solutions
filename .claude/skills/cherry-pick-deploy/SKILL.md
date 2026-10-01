---
name: cherry-pick-deploy
description: "Deploy a subset of tickets by cherry-picking their merge commits onto the last production tag, cutting one tag, and running the staging then production deploy workflows on it. Asks which environments before tagging. Use on '/cherry-pick-deploy', 'deploy with cherry-pick', 'deploy only <ID> to staging/production', 'cherry pick deploy', 'despliega solo esta tarea', 'deploy por cherry-pick'. Use /ship instead when everything on main should go out."
model: opus
---

# /cherry-pick-deploy — selective staging / production release

Use when an environment must receive **some** of what is on the main branch, not all of it. Releases
are a tag-only line: each release tag is the previous production tag plus cherry-picks.

**One tag, both environments.** The same production-marker tag is deployed to staging first, then to
production — two workflow runs on one ref, not two tags. A staging-marker tag is the rare staging-only
exception, not the normal path.

Three hard gates stop and ask: **which environment** (Phase 0.5), **before pushing the tag**, and
**before running each deploy workflow**. The last two are irreversible and outward-facing
(`_shared/team-rules.md` §D2).

Paths are relative to the repo root. Config: `.claude/kit.config.json` — read a key with
`node -p "require('./.claude/kit.config.json').<key>"`.

| Key | Used for |
|---|---|
| `git.mainBranch` (`<main>`), `git.remote` (`<remote>`), `git.worktreesDir` | source of the picks, where the release is built |
| `deploy.tag.format`, `.productionEnv`, `.stagingEnv` | tag names — `{date}` = `YYYYMMDD`, `{env}` = the marker, `{n}` = that day's counter |
| `deploy.staging.workflow`, `deploy.production.workflow` | the `workflow_dispatch` deploys; the tag is the ref |
| `environments.staging`, `environments.production` | `api` + `/health` and `web` for Phase 6 |

Both workflows `null` → say `No staging/production deploy workflow configured (deploy.*.workflow).` and stop.

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

## Phase 0.5 — Ask which environments. Always.

> **GATE — ask the user: staging, production, or both?** Never infer it. Offer all three; the default
> and most common answer is **both**.

| Answer | Tag marker | Base tag | Workflows to run |
|---|---|---|---|
| **Both** (normal) | `productionEnv` | last production tag | `deploy.staging.workflow`, then `deploy.production.workflow`, same tag |
| Production only | `productionEnv` | last production tag | `deploy.production.workflow` |
| Staging only | `stagingEnv` | last production tag | `deploy.staging.workflow` |

A chosen environment whose workflow is `null` → tell the user that environment has no deploy workflow
configured and stop.

The base is the last **production** tag in every case — it is what production actually runs, and
staging is deployed from the same ref. Staging-marker tags are stale by design; never cherry-pick onto
one.

Below, `<ENV>` is the tag marker and `<last-tag>` is the last production tag.

---

## Phase 1 — Start from the last production tag

```bash
git fetch <remote> --tags
PROD_RX=$(node -p "const t=require('./.claude/kit.config.json').deploy.tag; '^'+t.format.replace('{date}','[0-9]{8}').replace('{env}',t.productionEnv).replace('{n}','[0-9]+')+'$'")
git tag --sort=-creatordate | grep -E "$PROD_RX" | head -5
```

Cross-check the top hit against the last successful production run:

```bash
gh run list --workflow "<deploy.production.workflow>" --status success --limit 5 \
  --json displayTitle,headBranch,headSha,createdAt
```

The tag the workflow last ran on (`headBranch`) is the true production HEAD — the newest tag by date
may have been created and never deployed. No production workflow configured (staging only) → the
newest matching tag is the base; say so.

### Check staging first (staging or both)

Compare against what the **staging deploy workflow** last shipped — not against any automatic QA
deploy on push to `<main>`, which is a different environment:

```bash
gh run list --workflow "<deploy.staging.workflow>" --status success --limit 1 \
  --json headBranch,headSha,createdAt,displayTitle
git log --oneline <that headSha> ^<last-tag>
```

Those are commits staging runs today that the base tag lacks. Any of them not among the Phase 0 picks
(compare by subject — a cherry-pick carries a new SHA) means deploying the new tag to staging **rolls
staging back** and loses them. List them, say so, and let the user decide; production is still the
reason to cut the tag.

Then build the release in its own worktree — never a detached checkout in the main checkout, which
peer sessions own (§D1):

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
git diff --name-only --diff-filter=U                          # what conflicted
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

## Phase 3 — Tag

Name: `deploy.tag.format` with `{date}` = today `YYYYMMDD`, `{env}` = `<ENV>` **from the Phase 0.5
answer, not a guess** (both environments = one production-marker tag), `{n}` = 1 + the highest counter
among today's tags for that marker (first today → `1`).

```bash
git tag --sort=-creatordate | grep "^$(date +%Y%m%d)" || echo "first tag today"
git tag -a <new-tag> -m "<IDs> — <what ships>"
git tag -n1 | grep <new-tag>
```

> **GATE — pushing a tag publishes it and cannot be cleanly undone.** Show the user the tag name, the
> message, and `git log --oneline <last-tag>..HEAD`. Wait for an explicit go-ahead.

```bash
git push <remote> refs/tags/<new-tag>
```

Push that one tag only — `git push --tags` would also publish any stray local tag.

---

## Phase 4 — Confirm the tag on GitHub

```bash
gh api "repos/{owner}/{repo}/compare/<last-tag>...<new-tag>" \
  --jq '.commits[] | "\(.sha[0:9])  \(.commit.message | split("\n")[0])"'
```

Every commit from Phase 0, nothing else. A stray commit means Phase 1 started from the wrong place —
delete the tag (`git push --delete <remote> <new-tag>` and `git tag -d <new-tag>`) and redo, before
deploying anything.

---

## Phase 5 — Run the deploy workflow for that environment

> **GATE — this deploys.** Name the environment out loud and ask before each run. Staging and
> production are two separate gates even on one tag.

```bash
gh workflow run "<deploy.<env>.workflow>" --ref <new-tag>
gh run list --workflow "<deploy.<env>.workflow>" --limit 3 --json databaseId,headBranch,status,createdAt
gh run watch <run-id whose headBranch is <new-tag>> --exit-status
```

The web path is the same thing: Actions → the workflow → **Run workflow** → select the tag.

Both environments = run the staging workflow first, verify staging (Phase 6), then run the production
workflow on the **same tag**. Do not cut a second tag.

Deploy red → stop, `gh run view <run-id> --log-failed | head -60`, and report. Never run production
after a red staging.

---

## Phase 6 — Verify

The workflow conclusion is the deploy's own signal; this is the cross-check against the running
environment:

```bash
curl -sf "<environments.<env>.api>/health" && echo API OK
curl -sfI "<environments.<env>.web>" | head -1
```

`environments.<env>` is `null` → say no URL is configured; the workflow conclusion is the only signal.

Then exercise the shipped behavior in the running app for that environment. A green deploy is not
proof the change works.

Clean up once every requested environment is done:

```bash
cd <repo root> && git worktree remove <worktreesDir>/release-<last-tag>
```

---

## Report

- environment (staging / production) + tag name + the commits it carries (SHA + subject)
- workflow run URL + conclusion, per environment
- health / app URL results per environment
- staging rollback warning, if Phase 1 raised one, and the user's decision
- what was verified in the running app, and anything left out
