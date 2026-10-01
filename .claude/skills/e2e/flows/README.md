# Flow index — read this before writing any UI interaction

One row per reusable app action. Folders mirror the app's own modules. A flow
**performs and returns; it never asserts** — assertions belong to the ticket's
scenario, otherwise the flow is bound to one ticket and the next one forks it.

Machine-readable version: `node ../flow-check.mjs --list`.

| Path | Returns | Needs | Creates | Last verified |
|---|---|---|---|---|
| `auth/login` | `{url}` | `email`, `password` (opt: `route`, default `/login`) | — | kit default — adjust to the app, then stamp |
| `shared/read-detail-page` | `{url, sections, sectionTitles, flat, tables, tableHeaders, text, detail(), mentions(), matching()}` | `route` (opt: `pair`/`label`/`value` selectors, `expand`, `settle`) | — | kit default — stamp on first use |

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
