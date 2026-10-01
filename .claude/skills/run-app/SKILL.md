---
name: run-app
description: "Bring the app UP locally and prove it is usable — the API and the web dev servers from the config — then health-check or screenshot it; also stop what it started. Use on '/run-app', 'run the app', 'start the app locally', 'start the API', 'start the frontend', 'is the app running', 'stop the app', 'screenshot the app', 'why is the app not up'. This owns LAUNCH and health; /e2e owns DRIVING the running app and /api-verify owns hitting the API with no UI."
---

# /run-app — get the app up, and prove it

`/e2e` and `/api-verify` start against an app that is **already running**. This skill gets it
there. The split:

| Skill | Owns |
|---|---|
| **run-app** (here) | API → web, readiness, health, logs, stop, "why is it not up" |
| `/e2e` | driving the running app: login, flows, evidence |
| `/api-verify` | API endpoints with a real token, no browser |

The driver is `.claude/skills/run-app/driver.mjs`. It reads everything from
`.claude/kit.config.json` — `environments.local.api` / `.web`, `workspaces`, `packageManager`,
`project` — and reuses the Playwright vendored under `.claude/skills/e2e/node_modules`.

## Status first, always

```sh
node .claude/skills/run-app/driver.mjs status
```

Probes `environments.local.api` + `/health` and `environments.local.web`, prints each part's
state, the PID `up` recorded and its log file. Exit 0 only when both answer 2xx/3xx.
`ANSWERS 404` on the API = something listens on the port but has no `/health` route (add it —
stack profile §Run locally names the convention) or it is another process.

## Start

```sh
node .claude/skills/run-app/driver.mjs up
```

For each part that is down, runs `<packageManager> run dev` in its workspace (the command stack
profile §Run locally documents) in the background, writes the output to
`/tmp/<project>-<ws>.log` and the PID to `/tmp/<project>-<ws>.pid`, then polls until healthy
(default 120 s, `RUN_APP_WAIT=<s>` to change). A part that exits early prints its last 20 log
lines — read them before anything else. Parts already up are left alone.

Prerequisites the driver does not handle — say which one is missing, do not work around it:
dependencies not installed in a workspace, a database or other service the API needs (record
how to start it in stack profile §Run locally once the project has one), a missing `.env`
(copy `.env.example` and ask the user for the secrets — team-rules §B7).

## Prove it renders

```sh
node .claude/skills/run-app/driver.mjs shot <environments.local.web>/ /tmp/<project>-web.png
```

Prints title, control count, text length, `rendered YES/NO` and console errors, and saves a
full-page screenshot — Read it. `rendered` is the point: a 200 alone proves nothing, because a
single-page app whose bundle failed still serves its HTML shell.

## Stop

```sh
node .claude/skills/run-app/driver.mjs down
```

Stops the process groups `up` started (by PID file). It never kills a server it did not start —
for a stray one, `lsof -nP -iTCP:<port> -sTCP:LISTEN` names the PID; ask before killing it.

## Direct invocation — no app

Most API changes need only the targeted tests (stack profile §Targeted tests, under the lock in
`_shared/verify-commands.md`), which run with nothing up. Start the app when the claim is about
runtime behaviour.

## Gotchas

| Trap | What actually happens |
|---|---|
| the API hangs instead of failing | a dependency (database, queue) is down and the server retries forever without binding the port — no exit code to detect. `up` times out; read the log, do not wait on the process |
| port already taken | a dev server from another session. `status` shows `UP` with no PID of ours — reuse it only if it started after your change |
| a server started before your change | verifies the old code unless it runs in watch mode. `down && up` |
| a production build while a dev server runs | on stacks that share a build folder, the dev server serves broken chunks while pages still return 200 — `shot` shows `rendered NO` |
| logs from an earlier run | the log file is appended, not truncated; read the tail |

## Troubleshooting

| Symptom | Fix |
|---|---|
| `playwright not found` from `shot` | `cd .claude/skills/e2e && npm i && npx playwright install chromium` |
| `environments.local.<ws> not set` | fill `environments.local` in `.claude/kit.config.json` |
| exits immediately, `command not found` / missing script in the log | the workspace has no `dev` script — stack profile §Run locally / §Bootstrap |
| `EADDRINUSE` in the log | another process holds the port — `lsof -nP -iTCP:<port> -sTCP:LISTEN` |
