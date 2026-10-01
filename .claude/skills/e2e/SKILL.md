---
name: e2e
description: "Drive the real running app with Playwright — locally after implementing, and on a deployed environment (QA / staging) after shipping. Provides a shared browser session (config-driven environments, login, evidence files, browser traps) plus a reusable per-module flow library. Use whenever a skill or a ticket needs to prove behaviour in the running app rather than in tests: '/e2e', 'verify this in the browser', 'run it against QA', 'check it on staging', 'drive the UI'."
---

# /e2e — drive the running app, locally and deployed

The same scenario runs against local (after implementing) and against a deployed
environment (after shipping). One argument apart.

## Three layers

| Layer | Where | Owns | Lifetime |
|---|---|---|---|
| 1 · session | `session.mjs` | reaching the app — environment, credentials, login, browser traps, evidence | permanent |
| 2 · flows | `flows/<module>/<action>.mjs` | doing a thing in the app — submit a leave request, open an employee | permanent, grows on demand |
| 3 · scenario | `<out>/qa/e2e.mjs` | what **this ticket** claims | disposable |

**The rule that keeps layer 2 reusable: a flow performs and returns — it never
asserts.** Assertions live in the scenario. A flow with an assertion is bound to
one ticket, so the next ticket forks it and the library dies.

## Before writing any UI interaction

Read `flows/README.md` (or `node .claude/skills/e2e/flow-check.mjs --list`). Reuse an
existing flow; create one only when the action is genuinely missing; fix drift **in
place, never fork**. Same reuse-first discipline as `CLAUDE.md` §Reuse, applied to UI
behaviour.

**First use in a project:** `flows/auth/login.mjs` is a generic email/password form.
Open the app's login page, adjust its route, labels, button name and "logged in"
signal, then run `flow-check auth/login --data '{"email":"…","password":"…"}'` once —
or better, run any read-only flow, which logs in through it. Record the real login in
`CLAUDE.md` §Auth.

## Write the scenario

`<out>/qa/e2e.mjs` (`<out>` from `_shared/output-location.md`) — usually ~20 lines,
because the app knowledge is in the flows. It finds the kit by walking up from its own
location, so it works at any `<out>` depth:

```js
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
let root = here;
while (!fs.existsSync(path.join(root, '.claude/skills/e2e/session.mjs'))) {
  if (path.dirname(root) === root) throw new Error('.claude/skills/e2e not found above ' + here);
  root = path.dirname(root);
}
const kit = (p) => import(pathToFileURL(path.join(root, '.claude/skills/e2e', p)).href);
const { open } = await kit('session.mjs');
const readDetail = await kit('flows/shared/read-detail-page.mjs');

const s = await open({ env: process.argv[2] || 'local', out: here });
const page = await readDetail.run(s, { route: '/leave-requests/17' });
await s.record('AC1 — remaining balance shown', '12 days', page.detail('Remaining balance'));
await s.record('control — approver still shown', /\S/, page.detail('Approver'));
await s.close();
```

Run it:

```bash
node <out>/qa/e2e.mjs local     # /implement Step 6, /fix Step 5
node <out>/qa/e2e.mjs qa        # /qa-report Phase 1
```

Output next to the script: `results-<env>.json` (one row per case, with the verbatim
actual value) + `<case>-<env>.png` per case. Build `e2e-results.md` and the ticket
comment **from that file** — never from a remembered value.

A multi-role scenario opens one session per role (`open({ env, out, credentialsEnv:
{ email: 'E2E_MANAGER_EMAIL', password: 'E2E_MANAGER_PASSWORD' } })`); every `close()`
in the same process merges into the same `results-<env>.json`. A follow-up round that
re-runs a subset opens with `resume: true` and prefixes its case names (`R2 · …`).

## Environments

Everything comes from `.claude/kit.config.json` — read it, never hard-code a host:

| Need | Key |
|---|---|
| Web / API base URL for `--env <name>` | `environments.<name>.web` / `.api` |
| Credential env var NAMES | `e2e.credentialsEnv` (per env: optional `environments.<name>.credentialsEnv`) |
| File those vars are read from (real env vars win) | `e2e.envFile` |
| Login flow | `e2e.loginFlow` |
| Where `s.api()` gets its Bearer token | `e2e.token` — `localStorage:<key>` (default `localStorage:token`), `cookie:<key>`, or `none` |

- `environments.<name>` is `null` → the environment is not configured; say so and stop.
  Never substitute another environment silently.
- `production` is **refused by `session.mjs` in code**, and so is any URL whose origin
  matches `environments.production.web` / `.api`.
- Credentials never appear in output, evidence or a comment. An environment with no
  credentials, or a scenario needing a role no configured account has, is *"not
  verifiable with the credentials available"* — say so.

## Flow health

```bash
node .claude/skills/e2e/flow-check.mjs --list
node .claude/skills/e2e/flow-check.mjs shared/read-detail-page --env qa --data '{"route":"/employees/42"}'
node .claude/skills/e2e/flow-check.mjs --all --env local
```

`--all` runs read-only flows only (`creates: null`); anything that writes is skipped
unless named explicitly (or `--force`). Other flags: `--headed`, `--email`, `--out`.
Run the sweep before a QA round so a stale selector fails here instead of mid-ticket.

## Traps already handled in `session.mjs` — do not re-solve them

| Trap | Silent failure it causes |
|---|---|
| toast probed after the fade | `""` — indistinguishable from "no message shown", which is the bug. `s.toast(action)` observes `role=alert` / `role=status` / `aria-live` before acting |
| a dev server never reaches network idle | a bare `goto: Timeout` at session open that kills the scenario before any assertion; `goto` falls back to DOM-ready |
| synthetic events on custom selects | dropdown never opens; `select` uses real clicks and `getByRole('option')` |
| a still-open dropdown from the previous field | the next click is swallowed; `select` presses Escape first |
| absent vs empty | `text()` returns `null` for no match and `''` for an empty element — a visibility check depends on that difference |
| `close()` per role overwriting evidence | only the last role's rows survive and the report still looks complete; `close()` merges within one process |
| a production URL reached through a relative route or an API call | `goto` and `api` re-check every URL against `environments.production` |

App-specific traps (a component library quirk, a CSS-module class collision, an
empty state that looks like an error) belong in `flows/README.md` as `Note:` rows,
next to the flow that absorbs them.

## Safety

- Runs **create real records**. Before running against any environment other than
  `local`, confirm the environment with the user (AskUserQuestion Run / Cancel) —
  QA/staging are acceptable only with that consent; production is refused in code,
  not by convention.
- Name every record created (`s.recordCreated`) — `results-<env>.json` carries them
  for the report.
- Anything that changes access (a password, a role) is reverted immediately and the
  revert is read back and reported.
- Do not retry a bad credential in a loop — most apps lock the account.

## Consumers

`/implement` Step 6 · `/qa-report` Phase 1 · `/bug-bundle` Phase 3 · `/fix`
(UI-visible fixes) · `/import-e2e` (bulk-import specialisation) · `/run-app` (reuses
this folder's Playwright for `shot`).

API-only work does **not** belong here — get a token and hit the endpoint:
`.claude/skills/api-verify/SKILL.md`. Starting the app is `/run-app`.

## Install

Playwright is vendored in this folder (gitignored). If `node_modules` is missing:
`cd .claude/skills/e2e && npm i && npx playwright install chromium`.
