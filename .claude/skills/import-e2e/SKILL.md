---
name: import-e2e
description: "Automate bulk-import verification end-to-end through the app's import UI: harvest valid values from the app's own APIs, prefill a CSV from the downloaded template, upload it, read the per-row results and failed-records file, then verify the created records. Use on '/import-e2e', 'test the import', 'verify the employee import', 'prefill the import CSV', 'upload this CSV and check the result'."
---

# /import-e2e — Bulk-import E2E verification

Drives the running app (web + API) with Playwright to prove an import flow works:
template → prefilled CSV with REAL values → UI upload → per-row result → created-record
verification.

**This is the bulk-import specialisation of `/e2e`.** Session plumbing (environments,
credentials, login, production refusal, evidence) lives in `.claude/skills/e2e/session.mjs`;
read `.claude/skills/e2e/SKILL.md` §Environments. Fix a trap or a selector there, or in the
import descriptor — not in the runner.

## Prerequisites (check first, fail fast)

1. The target environment is running / reachable. `--env local` (default) → `/run-app status`;
   any other env must be non-null in `environments` (config), else say so and stop.
2. Credentials resolve from the env vars named in `e2e.credentialsEnv` (config). Nothing to source.
3. Playwright is vendored at `.claude/skills/e2e/node_modules`. Missing →
   `cd .claude/skills/e2e && npm i && npx playwright install chromium`.
4. An **import descriptor** exists for the import under test — see below. Missing → create it
   (first use), or pass every selector as a flag.

## Import descriptor (first use per import)

`.claude/skills/e2e/flows/imports/<name>.mjs` — one per import page, e.g. `employees.mjs`.
Open the import page once (`--headed` or `/run-app shot`), then write it. Selectors are
Playwright selector strings (CSS, `role=button[name="…"]`, `text=…`).

```js
export default {
  page: '/imports/employees',                       // web route of the import page
  startControl: 'role=button[name=/start import/i]', // optional: opens the upload dialog
  templateControl: 'role=link[name=/download template/i]',
  descInput: 'role=textbox[name=/description/i]',   // optional: the description field (how the run is found)
  fileInput: 'input[type="file"]',
  submitControl: 'role=button[name=/upload|save/i]',
  resultsRow: 'table tbody tr',                     // rows of the imports history table
  statusColumn: 1, importedColumn: 3, failedColumn: 4,  // 0-based <td> indexes
  pendingStatus: 'processing|pending|queued',       // regex source: still running
  failedDownload: 'role=link[name=/failed/i]',      // optional: inside the row, downloads failed records
  detailRoute: '/employees/{id}',                   // verify --id
  harvest: { departments: '/api/departments', managers: '/api/employees?role=manager' },
};
```

It exports no `run`, so `/e2e`'s `flow-check` ignores it. Add a `Note:` to
`.claude/skills/e2e/flows/README.md` for any trap the page has.

## Runner (deterministic part)

`node .claude/skills/import-e2e/runner.mjs <cmd> --import <name> [--env <name>] [--outDir <dir>] ...`

| Cmd | Does | Key flags |
|---|---|---|
| `harvest` | Calls each `harvest` API route through the logged-in session → one JSON of real, selectable values | `--out harvest.json` |
| `template` | Opens the import page → clicks the template control → saves the download, prints the header row | `--out template.csv` |
| `upload` | Opens the page → description + file → submit → polls the results table until the row leaves `pendingStatus` → prints the row; downloads the failed-records file when the failed count > 0 | `--csv rows.csv --desc "<unique>" --failedOut failed.csv` |
| `verify` | Reads the created record: web detail page (`--id` via `detailRoute`, or `--route`) through `shared/read-detail-page`, or the API (`--apiRoute`) | `--out created.json` |

- `--outDir <dir>` is where `results-<env>.json` and screenshots land, **and** the base every
  relative `--out` / `--csv` / `--failedOut` resolves against. Point it at `<out>/qa/` when
  working a ticket (`<out>` from `_shared/output-location.md`).
- Any descriptor key can be overridden by a flag of the same name (`--page`, `--fileInput`,
  `--statusColumn 2`, `--harvest '{"departments":"/api/departments"}'`), so a one-off run
  needs no descriptor.
- The runner handles login, the upload, polling, the "status settled before the counts" race,
  and the failed-records download. `upload` records the import job as a created record.

## Workflow (judgment part — the model does this)

1. **Template first**: `template` → the header row IS the column contract. Diff it against the
   create form when auditing.
2. **Learn the parser's formats** — read the import's parser in `<api>` (find it from the upload
   endpoint's route; stack profile §Layout). Per column determine: required, enum/format, and
   the lookup it resolves against. Traps worth checking every time:
   - Option APIs often return **display labels** ("Engineering (ENG)") while the parser matches
     the bare code. Split before use.
   - A lookup the option API does not expose (an email, an external ID) → read it from an
     existing record's detail, or ask.
   - Duplicate active codes make a row unimportable when the parser counts matches — pick
     unique values.
   - Dates: the app's date format, start ≤ end, future-safe.
3. **Harvest**, pick values, **build the CSV**: template header + data rows only (drop any
   example row). Unique description per run — it is how the run is found in the results table.
4. **Upload** with a unique `--desc`. Failed rows → the failed-records file names the parser
   error per row → fix the cell (or report a real bug — that is the point of the skill) and
   re-upload.
5. **Verify** the created records: derived fields, defaults, persisted values. Compare against
   the create form's behaviour.
6. **Report**: per-row results, created record IDs, any parser-vs-form gaps. With a ticket,
   evidence goes under `<out>/qa/` and the results feed `/qa-report`.

## Safety

- Import runs CREATE REAL RECORDS. Confirm the environment and the user's awareness before
  `upload` (AskUserQuestion Run / Cancel) — QA fine with consent; production is refused by
  `session.mjs` in code.
- Never hardcode credentials in scripts, descriptors or docs — env only.
- Each run leaves records behind — tell the user what was created so they can clean up.

## Extending to other imports

Same runner, a new descriptor. Step 2 changes (that import's parser); template, upload, poll
and failed-records mechanics are shared.
