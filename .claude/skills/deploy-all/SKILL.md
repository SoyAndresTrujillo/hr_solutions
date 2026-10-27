---
name: deploy-all
description: "Deploy everything on the main branch to staging and/or production: tag the current remote main HEAD with an all-of-main tag, push it, and run the staging then production deploy workflows on it. Asks which environments before tagging. Use on '/deploy-all', 'deploy all', 'deploy all to staging', 'deploy all to production', 'release main', 'despliega todo', 'deploy de todo a staging'. Use /cherry-pick-deploy instead when only some tickets should go out."
model: opus
---

# /deploy-all — release all of main to staging / production

Use when an environment must receive **everything** on the main branch. Shipping only some tickets is
`/cherry-pick-deploy`.

Choosing environments, cutting and pushing the tag, running the workflows and verifying live in
`.claude/skills/_shared/tag-deploy.md` (phases T0–T4). This skill owns only what goes on the tag:
`<remote>/<main>` HEAD (`git.remote`, `git.mainBranch` in `.claude/kit.config.json`).

---

## Phase 0 — Environments

Run **T0** from `tag-deploy.md`. Note the last production tag and what staging runs now.

---

## Phase 1 — Pin main

Tag `<remote>/<main>` after a fetch — never `checkout` + `pull` in the main checkout, which peer
sessions may be using on another branch (`_shared/team-rules.md` §D1).

```bash
git fetch <remote> <main> --tags
git rev-parse --short <remote>/<main>
```

**Is main healthy?** The runs on main HEAD must be green — a red or missing QA deploy means main HEAD
has never run anywhere:

```bash
gh run list --branch <main> --commit $(git rev-parse <remote>/<main>) \
  --json workflowName,conclusion,status --jq '.[] | "\(.workflowName)  \(.status) \(.conclusion)"'
```

Every workflow in `deploy.qa.workflows` that fired must be `success`; ignore `ci.ignoreWorkflows`.
`deploy.qa.workflows` empty → the CI runs on that SHA are the only signal; say so.
Red or still running → stop and report. Do not tag an unverified main.

---

## Phase 2 — What ships, and what would be lost

```bash
LAST=<last-tag>
# new on main since production (cherry-picked copies already in production are hidden)
git log --oneline --no-merges --cherry-pick --right-only $LAST...<remote>/<main>
# on the production tag but NOT on main — a hotfix made only on the tag
git log --oneline --cherry-pick --left-only $LAST...<remote>/<main>
```

- First list empty → nothing to deploy. Say so and stop.
- Second list **not** empty → deploying main **removes** those commits from production. Stop and show
  them. They must land on `<main>` first.

For staging-only or both, repeat the first command against staging's current ref from T0 — staging can
lag or lead production.

Show the user the list grouped by ticket ID (prefix `ticketPrefix`). Releases reach users — the user
confirms the list before the tag.

---

## Phase 3 — Tag, push, confirm, deploy, verify

Follow `tag-deploy.md`:

- **T1** — `{kind}` = `deploy.tag.allEnv` (default `A`), `<ref>` = `<remote>/<main>`. Message: the
  ticket IDs that ship.
- **T2** — the compare must equal the Phase 2 list, plus any commits that were cherry-picked into the
  last tag (their main originals appear again). The tag's SHA must equal
  `git rev-parse <remote>/<main>` from Phase 1.
- **T3** — staging first, then production, on the same tag. Each run is its own gate.
- **T4** — verify, then report per the shared format, adding any Phase 2 warning and the user's
  decision.
