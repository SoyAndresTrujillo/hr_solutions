# Tag deploy — shared tail for /deploy-all and /cherry-pick-deploy

Single source of truth for choosing environments, cutting the release tag, pushing it, running the
deploy workflows and verifying. The calling skill owns *what goes on the tag* (main HEAD, or
cherry-picks on the last production tag). Never restate these phases in a skill — point here.

Paths are relative to the repo root. Config: `.claude/kit.config.json` — read a key with
`node -p "require('./.claude/kit.config.json').<key>"`.

| Key | Used for |
|---|---|
| `git.remote` (`<remote>`) | where the tag is pushed |
| `deploy.tag.format`, `.productionEnv`, `.stagingEnv` | tag names — `{date}` = `YYYYMMDD`, `{env}` = the marker, `{n}` = that day's counter |
| `deploy.tag.allEnv` (default `A`), `deploy.tag.cherryPickEnv` (default `C`) | `{kind}` in the format, when it has one: all of main vs cherry-pick |
| `deploy.staging.workflow`, `deploy.production.workflow` | the `workflow_dispatch` deploys; the tag is the ref |
| `deploy.qa.trigger` | `push-main` → a push to main deploys **QA**, not staging |
| `environments.staging`, `environments.production` | `api` + `/health` and `web` for T4 |

Both workflows `null` → say `No staging/production deploy workflow configured (deploy.*.workflow).` and stop.

**One tag, both environments.** The same production-marker tag is deployed to staging first, then to
production — two workflow runs on one ref, not two tags. A staging-marker tag is the rare staging-only
exception, not the normal path.

**Push to main deploys QA, not staging.** Staging and production change only when a tag is deployed
by hand through these phases.

Three hard gates stop and ask: **which environments** (T0), **before pushing the tag** (T1), and
**before each deploy workflow run** (T3). The last two are irreversible and outward-facing
(`_shared/team-rules.md` §D2).

---

## T0 — Ask which environments. Always.

> **GATE — ask the user: staging, production, or both?** Never infer it, even when the request says
> "to staging". Offer all three; the default and most common answer is **both**.

| Answer | Tag marker | Workflows to run |
|---|---|---|
| **Both** (normal) | `productionEnv` | `deploy.staging.workflow`, then `deploy.production.workflow`, same tag |
| Production only | `productionEnv` | `deploy.production.workflow` |
| Staging only | `stagingEnv` | `deploy.staging.workflow` |

A chosen environment whose workflow is `null` → tell the user that environment has no deploy workflow
configured and stop.

**Last production tag** = the ref of the last *successful* production deploy run, not the newest tag
by date (a tag can be cut and never deployed). Fetch first — tags cut on another machine are missing
locally until then:

```bash
git fetch <remote> --tags
gh run list --workflow "<deploy.production.workflow>" --status success --limit 1 \
  --json headBranch --jq '.[0].headBranch'
gh run list --workflow "<deploy.staging.workflow>" --status success --limit 1 \
  --json headBranch,headSha --jq '.[0]'
```

The second command is what staging runs now. Name both refs to the user. No production workflow
configured (staging only) → the newest tag matching the production marker is the base; say so:

```bash
PROD_RX=$(node -p "const t=require('./.claude/kit.config.json').deploy.tag; '^'+t.format.replace('{date}','[0-9]{8}').replace('{env}',t.productionEnv).replace('{n}','[0-9]+').replace('{kind}','[A-Z]+[0-9]*')+'$'")
git tag --sort=-creatordate | grep -E "$PROD_RX" | head -5
```

Below, `<last-tag>` is the last production tag and `<ENV>` the marker from the answer.

---

## T1 — Cut the tag

Name: `deploy.tag.format` with `{date}` = today `YYYYMMDD`, `{env}` = `<ENV>` **from the T0 answer,
never guessed** (both environments = one production-marker tag), `{n}` = 1 + the highest counter among
today's tags for that marker (first today → `1`), `{kind}` = the value the calling skill names.

```bash
git tag --sort=-creatordate | grep "^$(date +%Y%m%d)" || echo "first tag today"
git tag -a <new-tag> <ref> -m "<IDs> — <what ships>"
git tag -n1 | grep <new-tag>
```

`<ref>` is given by the calling skill (`<remote>/<main>` or `HEAD`).

> **GATE — pushing a tag publishes it and cannot be cleanly undone.** Show the user the tag name, the
> message, its target SHA, and the commit list from the calling skill. Wait for an explicit go-ahead.

```bash
git push <remote> refs/tags/<new-tag>
```

Push that one tag only — `git push --tags` would also publish any stray local tag.

---

## T2 — Confirm the tag on the remote

```bash
git ls-remote --tags <remote> <new-tag>
gh api "repos/{owner}/{repo}/compare/<last-tag>...<new-tag>" \
  --jq '.commits[] | "\(.sha[0:9])  \(.commit.message | split("\n")[0])"'
```

The calling skill says what the compare must contain. A mismatch means the tag points at the wrong
commit — delete it (`git push --delete <remote> <new-tag>` and `git tag -d <new-tag>`) and redo,
before deploying anything.

---

## T3 — Run the deploy workflows

> **GATE — this deploys.** Name the environment out loud and ask before each run. Staging and
> production are two separate gates even on one tag.

```bash
gh workflow run "<deploy.<env>.workflow>" --ref <new-tag>
gh run list --workflow "<deploy.<env>.workflow>" --limit 3 --json databaseId,headBranch,status,createdAt
gh run watch <run-id whose headBranch is <new-tag>> --exit-status
```

Check `headBranch` equals `<new-tag>` before watching — a colleague's run can be newest. The web path
is the same thing: Actions → the workflow → **Run workflow** → select the tag.

Both environments = run the staging workflow, verify staging (T4), then run the production workflow on
the **same tag**. Never cut a second tag.

Deploy red → stop, `gh run view <run-id> --log-failed | head -60`, and report. Never run production
after a red staging.

---

## T4 — Verify

The workflow conclusion is the deploy's own signal; this is the cross-check against the running
environment:

```bash
curl -sf "<environments.<env>.api>/health" && echo API OK
curl -sfI "<environments.<env>.web>" | head -1
```

`environments.<env>` is `null` → say no URL is configured; the workflow conclusion is the only signal.
If the workflow runs migrations, read that step in `gh run view <run-id> --log` and report it.

Then make one real request that exercises the shipped behaviour in that environment. A green deploy
is not proof the change works.

---

## Report

- environments + tag name + target SHA + the commits it carries (SHA + subject)
- workflow run URL + conclusion, per environment
- health / app URL results per environment
- what the calling skill adds (rollback warnings, the user's decisions)
- what was verified in the running app, and anything left out
