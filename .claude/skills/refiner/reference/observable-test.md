# The observable behavior test

The single filter for whether something deserves a question or a finding.

> Raise it **only if** its absence would make **someone observe a different result** — the person in
> the flow, another role or customer, an admin, or a downstream consumer: an export, a pay slip, a
> report, an outbound integration. If every path produces the same visible result for everyone, it is
> a technical detail — ignore it.

"Observe" is wider than "see a screen." An accounting export that shifts, a bank payment file that
changes, a total that lands differently in a month-end payroll report — all observable, even if no one
is looking at a page when it happens.

## Two ways in — the trigger differs, the gate is the same

An item earns a question or finding through one of two triggers. Both then face the same self-check
below; observability is always the final gate.

- **Ambiguity** — the spec never defines something, so two reasonable developers would build it
  differently. A new path, a rule with no boundary, an action with no consequence, a new record type
  with no rule for old data.
- **Side effect** — a single correct implementation still changes what an existing flow already
  showed. There is no second interpretation to pick; there is a consumer downstream whose output
  moves, and someone must ratify that the move is intended. A changed calculation reaching a pay slip
  or report; a new state value reaching a switch that assumed the old set.

A side effect is not the weaker kind. A regression that ships silently, because no one ratified it, is
exactly what this review exists to catch.

## The mandatory self-check

Before writing anything, name the **two concrete outcomes that differ in what someone observes**. The
shape depends on the trigger:

- **Ambiguity → A vs. B**: two builds, different visible result.
  _"The Approve button on the leave request: today it follows the company-wide policy — after the split, which one should it follow?"_
- **Side effect → before vs. after**: same consumer, one output today, a different output once the
  change lands.
  _"The pay slip net total: today it deducts X for unpaid leave; after the new leave rule it deducts Y — is that intended?"_

If you cannot name both outcomes, it is not a valid item. Discard it. This is not a formality — it is
what stops forty questions where six would do.

## Ignore

- Where a file goes, what something is named, how state is stored, which library is used.
- Which layer performs a check, as long as everyone hits the same wall.
- Wording of internal logs, structure of the code, test strategy.

## Raise

- A path nobody defined: what someone with no permission sees on arriving at this flow — one developer
  blocks them, another lets them through.
- Data that already exists and has no rule: a new piece of information and nothing says what records
  created before it should show — one developer leaves them empty, another calculates a value.
- Two parts of the document that cannot both be true.
- A rule with no boundary: "recent" records, "large" amounts, "soon" — one developer picks 30 days,
  another picks 7.
- An action with no consequence defined: what happens after the user confirms, what the next state is,
  who gets told.
- A consumer whose output moves as a side effect: a changed calculation or a new state value reaches an
  export, a pay slip, a report, or an integration that already showed the old result — is the shift
  intended, or guarded against?

## Borderline, worked

_"Is the notification sent immediately or in a batch?"_ — sounds technical, but the user either sees
it now or in an hour. Two visible behaviors → **raise it**.

_"Do we validate on the client or the server?"_ — the user gets the same error either way. Same
visible behavior → **ignore it**.

_"The new leave rule also feeds the month-end payroll report."_ — no one sees it on a screen today and
the change is weeks away, but the report lands a different total. Observable, just deferred and to
another reader → **raise it**.
