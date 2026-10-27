# Flow index — read this before writing any UI interaction

One row per reusable app action. Folders mirror the app's own modules. A flow
**performs and returns; it never asserts** — assertions belong to the ticket's
scenario, otherwise the flow is bound to one ticket and the next one forks it.

Machine-readable version: `node ../flow-check.mjs --list`.

| Path | Returns | Needs | Creates | Last verified |
|---|---|---|---|---|
| `auth/login` | `{url}` | `email`, `password` (opt: `route`, default `/login`) | — | kit default — adjust to the app, then stamp |
| `shared/read-detail-page` | `{url, sections, sectionTitles, flat, tables, tableHeaders, text, detail(), mentions(), matching()}` | `route` (opt: `pair`/`label`/`value` selectors, `expand`, `settle`) | — | kit default — stamp on first use |

**Stamping *Last verified*:** `<env> <YYYY-MM-DD> (<what it ran on — role, record> — <ID>)`. A
re-verification or a new option appends ` · <option> <env> <date> (… — <ID>)` to the same cell;
never overwrite an older stamp — it records which shapes were proven where.

App-specific notes (a selector trap, a silent empty state, a dev-server quirk) go
below this table as `Note:` paragraphs, one per trap, naming the flow that absorbs it.

`imports/*.mjs` are **import descriptors** for `/import-e2e`, not flows: they export
selectors, not `run`, so `flow-check` ignores them. See `../../import-e2e/SKILL.md`.

## Lifecycle

| Operation | Rule |
|---|---|
| **Reuse** | search this table before writing any UI interaction. Cite the flow path in the ticket's `e2e-results.md` |
| **Create** | only when a ticket needs an action that is not here. Add the row in the same change. Never scaffold ahead of demand — an empty module folder reads as coverage that does not exist |
| **Update** | selectors drift → **fix in place, never fork.** A forked flow is the failure mode this library exists to prevent. Re-run `flow-check` and restamp *Last verified* |
| **Delete** | app feature removed → delete the flow and its row. A dead flow is worse than no flow |

## Writing a flow

`flows/<module>/<action>.mjs`, ESM, named exports:

```js
export const module = 'leave';
export const action = 'submit a leave request';
export const needs = ['employee', 'type', 'from', 'to']; // fail fast, and tells the caller what to harvest
export const creates = 'leave request';                  // null = read-only, and therefore safe in `flow-check --all`

export async function run(s, d) {
  await s.goto('/leave/new');
  await s.select('Leave type', d.type);
  await s.fill('From', d.from);
  await s.fill('To', d.to);
  const toasts = await s.toast(() => s.click(/submit/i));
  const id = new URL(s.page.url()).pathname.split('/').pop();
  s.recordCreated('leave request', id);
  return { id, toasts, url: s.page.url() };            // identifiers, never assertions
}
```

- `s` is the session (`../session.mjs`): `goto` `fill` `select` `click` `text` `texts` `eval` `toast` `api` `shot` `record` `recordCreated`, plus `page`, `ctx`, `web`, `api`, `env`.
- Use `s.api()` freely for **setup and read-back**; drive the surface under test through the UI.
- A flow may call another flow for its precondition (`import * as submit from '../leave/submit.mjs'`). Compose, do not copy.
- `creates: null` opts the flow into the `--all` health sweep. Anything that writes stays out of it.

## Conventions — what every flow returns

Each one exists because its absence produced a run that looked fine and was wrong.

- **Absent ≠ empty.** A map of what the page rendered keeps a label that was not rendered *out of the
  map* and a label rendered blank as `''`. Collapsed, "the field is hidden" and "the field is empty"
  read the same.
- **Name the miss.** No row, option or record matching the input → throw with what *was* there (first
  ~20 values). A 30s timeout reads as a broken selector; an empty `{}` reads as a pass.
- **Partial lists lie.** A virtualized dropdown renders only the visible slice; a results table
  paginates. Answer "is X offered / listed" through the page's own search box or a raised page size,
  never from the rendered rows.
- **Required fields are read, not hard-coded.** What a create form marks required depends on role
  and configuration; a submit flow scans the form for required fields, fills the empty ones, and
  returns `required` and `filled`. A `skip` option leaves named fields empty on purpose. Look for
  required controls the scan cannot see (a required star with no label, an approver chain).
  When a third submit flow needs the same scan, extract it to `../form-fill.mjs` beside the session —
  not before.
- **Report where the error went.** Return inline field errors *and* any top banner / alert text — some
  forms put the message only in the banner and leave the inline error empty.
- **Return the request.** A write flow returns `sent` — the request body it sent, `null` when
  client-side validation blocked the submit — plus the response status and message. That separates
  "the UI blocked it" from "the server rejected it". An `abort` option that captures the body and
  cancels the request gives the exact client payload without saving.
- **Read before the submit destroys it.** A write flow that also answers "what did the form prefill"
  offers `submit: false`: open, read, create nothing.
- **Restore from a snapshot.** A flow that mutates an existing record returns its `before` state.
  Restore it directly; saving the form again can have side effects (status changes, re-derived
  fields).
- **Success is not navigation.** Some forms stay on the page after a successful submit; key success
  on the response or the toast, never on "the URL changed".
- **Verify under the role the ticket names.** Pages render differently per role; the default login
  is not a stand-in for another role. An empty list for a role with no scope looks like a broken
  selector — name it.
- **Readonly pickers.** A date input marked `readonly` makes `fill()` retry for 30s against a visible,
  enabled element; drive the calendar and click a day cell.
