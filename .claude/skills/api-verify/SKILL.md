---
name: api-verify
description: "Verify API changes end-to-end with no browser: make sure the API is running, get a real token the way the app issues one, hit the endpoints with curl, and save every request/response as evidence. Use on '/api-verify', 'verify the endpoint', 'hit the API', 'check the response', 'curl the endpoint', 'prove the API change works', or when a backend-only change needs runtime proof beyond tests."
---

# /api-verify — prove an API change at runtime, no UI

Tests prove the code; this proves the running API answers the way the ticket says. The split:

| Skill | Owns |
|---|---|
| `/run-app` | starting the app, health, "why is it not up" |
| `/e2e` | driving the web app in a browser |
| **api-verify** (here) | the API alone: token → request → saved response |

Every command below runs from the project root. Each Bash call is a fresh shell — a `cd` does
not persist, so put `cd <ws> && …` in the same call.

## Handle

1. **Is the API up, and running your code?**
   - `node .claude/skills/run-app/driver.mjs status` — or the port directly:
     `lsof -nP -iTCP:<port> -sTCP:LISTEN` (port from `environments.local.api` in the config).
   - Not up → `node .claude/skills/run-app/driver.mjs up` (or stack profile §Run locally).
   - Up but started **before** your change and not in watch mode → restart it
     (`driver.mjs down && driver.mjs up`). A server that predates the patch verifies the old code.
2. **Base URL:** `environments.<env>.api` from `.claude/kit.config.json` (`local` by default).
   Another environment → only with the user's consent; `production` never.
3. **Routes:** read them from the route table the stack profile §Layout names — do not guess a
   prefix. A 404 on a route you "know" is usually a missing prefix, not a missing handler.

## Auth

Get a token **the way the app issues one** — stack profile §Auth, and `CLAUDE.md` §Auth when the
project documents its real flow. Never mint tokens with the app's signing secret; a self-signed
token skips the code path under test.

```bash
set -a; . ./<e2e.envFile>; set +a     # loads the vars named in e2e.credentialsEnv
TOKEN=$(curl -sf "$API/<login route>" -H 'Content-Type: application/json' \
  -d "{\"email\":\"$<email var>\",\"password\":\"$<password var>\"}" | jq -r '.token')
[ -n "$TOKEN" ] && [ "$TOKEN" != null ] || echo "login failed"
```

- Credentials come from the env vars named in `e2e.credentialsEnv`, read from `e2e.envFile`.
  They never appear in output, evidence or a saved log — do not `echo` them, and redact the
  login request body in saved evidence.
- A role-specific check needs that role's account; none configured → "not verifiable with the
  credentials available". Never approximate with an admin.
- Short-lived tokens → log in again per request batch, not once per session.

## Hit and record

One case per request. Save each as `<out>/qa/api-<case>.json` (`<out>` from
`_shared/output-location.md`; no ticket → the scratchpad):

```bash
curl -s -o /tmp/body.json -w '%{http_code}' -X POST "$API/<route>" \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"employeeId":42,"type":"annual","from":"2026-10-01","to":"2026-10-03"}' > /tmp/code.txt
jq -n --arg m POST --arg u "<route>" --argjson req '{"employeeId":42,"type":"annual","from":"2026-10-01","to":"2026-10-03"}' \
  --argjson status "$(cat /tmp/code.txt)" --slurpfile res /tmp/body.json \
  '{request:{method:$m,url:$u,body:$req},status:$status,response:$res[0]}' > <out>/qa/api-<case>.json
```

- Record the **read-back** too: after a write, GET the record and save it — the persisted state
  is the claim, the write's 2xx is not.
- Every case gets a **control** request (the valid path that must still work).
- Binary responses (PDF, CSV export): save the raw bytes (`curl -o <out>/qa/<case>.pdf`), then
  Read the file — Claude reads PDFs and images directly. Base64 inside JSON →
  `jq -r '<path>' | base64 -d > <file>`.
- Name every record the requests created; they are listed in the report.

## Report

Per case: method + route, status, the verbatim field(s) the ticket cares about, PASS/FAIL
against the ticket's expectation, evidence file name. Feeds `/implement` Step 6, `/fix` Step 5
and `/qa-report` Phase 1.

## Gotchas

- A one-off script needing a dependency the API already has: resolve it from that workspace
  (`createRequire('<api>/package.json')('<pkg>')`) instead of installing a copy.
- Port busy but the API does not answer → a stale process; `lsof -nP -iTCP:<port> -sTCP:LISTEN`
  names the PID. Kill only a process `/run-app` started (its PID file), otherwise ask.
- Environment data drifts — a surprising value in an old record is not your diff until the
  control case says so.
