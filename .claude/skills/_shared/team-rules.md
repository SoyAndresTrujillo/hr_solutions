# Team development rules

Every PR solves the right thing, with the right approach, and leaves a trace of its architectural
decisions. **Breaking a rule blocks the merge until it is corrected.**

Tech Lead (the approver named by every G0 gate and by C3): `techLead` in `.claude/kit.config.json`.
When it is `null` the project is solo and **the user is the approver** — the gates still stop and wait.

Cite this file by rule ID (`team-rules.md §S5`). Never restate a rule body in a skill, a step file, an
agent file or a subagent prompt — point here.

## Layer A — Pre-development

- **S1 Scope.** The PR solves only the ticket's objective. It does not touch other features (except S2, S3, S4). Touching another module the plan did not name → flag it, do not do it.
- **S2 Refactors.** A refactor needs prior Tech Lead approval (G0), ships in its own PR, and preserves existing behavior unless the Tech Lead agreed otherwise.
- **S3 Bug found during development.** Create a ticket for it (`ticket.mjs new --type bug`) and ask the user before folding the fix into the current ticket.
- **S4 Update the consumers.** A change to an endpoint, DTO/schema or exported contract updates every consumer. That work is inside the ticket's scope.
- **S5 Migrations.** A migration needs prior Tech Lead approval (G0). Every migration is reversible (working `down`) and carries its backfill. Data repairs are migrations, never manual scripts against a database.
- **S6 Shared code.** A change to code shared by several roles, flows or customers verifies — and records in the PR — that the others still behave the same. If the ticket does not define the behavior for one of them, ask; never assume.
- **S7 Where customizations live.** Per-customer, per-role and feature-flag behavior goes through the routes in `CLAUDE.md` §Customization. Never an inline `if (customer === 'X')`.
- **S8 Data isolation and authorization.** Every query respects the ownership/tenant filter and every endpoint its authorization check. No change exposes data outside its owner.
- **S9 Later ticket wins.** When a newer ticket's rule clashes with an older one, the newer ticket wins; the clash is a bug of the newer ticket's implementation, not a product question.

## Layer B — During development

- **B1 Write it where it belongs.** Each change goes in the file or function that owns that responsibility, not the first place it is easy to write.
- **B2 Respect the layers.** API: route → controller/handler (no business logic) → service → data access. Web: page → component → hook → API client. The stack profile names the folders.
- **B3 Follow the established way.** When the project already does something one way (API calls, validation, errors, responses), use that way. No second way.
- **B4 Reuse before creating, extract on write.** Grep for an equivalent before creating a helper, component or guard. Never author the same logic at two call sites — extract it the moment the second copy would appear.
- **B5 New libraries.** Adding a dependency needs prior Tech Lead approval (G0). While the project is being bootstrapped, the stack profile's default set is pre-approved.
- **B6 Unit tests.** New or corrected business logic carries unit tests that cover it.
- **B7 Secrets.** No secret, credential or token enters the repository. They live in `.env`; each variable is registered, in order, in `.env.example`.
- **B8 Efficient queries.** Consolidate reads. No N+1 patterns.
- **B9 User-facing text.** No hardcoded UI text when the project has an i18n catalog (stack profile §i18n).
- **B10 Typing.** Declare the correct type. No `any`, `unknown` or casts where a type can be declared (mechanical half: `.claude/hooks/no-any-casts.cjs`).
- **B11 Comments.** Only where the logic is not obvious. Three lines or fewer, plain words, no arrows, no emoji.

## Layer C — Sending a PR to review

- **C1 Title and ticket.** Title `type(<ID>): description` (≤100 chars). The body names the ticket ID (`HR-12`); tickets are local gitignored files, so name, never link. The ticket holds every G0 record.
- **C2 PR description.** a) one context sentence; b) a flat bullet list (4-8), one unit of observable behavior per bullet; c) `Modified flows:` one per line in plain language; d) `Env vars:` added/changed/removed, omitted when none.
  - No group headings. One line per bullet, each fact once. A feature's plumbing is one bullet. Describe the what; the why only when not evident.
- **C3 Preconditions before merge.** (a) Tech Lead approval — **not required for bug-fix PRs** (`fix(...)`), which merge on green CI plus the user's go-ahead; (b) CI green.

## Layer D — Git and outward-facing actions

- **D1 Branch = ticket ID.** Branch name is the bare ticket ID (`HR-12`), created in a worktree under `git.worktreesDir`, never with `checkout -b` in the main checkout.
- **D2 Push only on an explicit OK.** Commit freely; `git push`, PR creation, merges, tags and deploys need an explicit go-ahead in the current request.
- **D3 No self-attribution.** No `Co-Authored-By`, "Generated with" or session links in commits, PR bodies or ticket comments.

## G0 — traceability

Rules needing prior Tech Lead approval — **S2 refactors, S5 migrations, B5 new libraries** — are
recorded on the ticket as a comment in two parts: (1) the proposal — what, why, risk; (2) the Tech
Lead's confirmation. Record with `node .claude/skills/_lib/ticket.mjs comment <ID> <file>`.

### Pipeline gate

A pipeline reaching an S2, S5 or B5 trigger **stops before writing code**, prints the G0 proposal draft
(what / why / risk), and waits for the user to confirm the approval. Never assume approval.

## Already enforced elsewhere — do not restate

| Rule | Owner |
|---|---|
| S7, B4, B10 | `CLAUDE.md` §Reuse and §Customization |
| B4 (audit table) | `.claude/skills/_shared/reuse-audit.md` |
| B6, C3b (commands) | `.claude/skills/_shared/verify-commands.md` + stack profile |
| B10 (mechanical) | `.claude/hooks/no-any-casts.cjs` |
| S5 `down` | `.claude/agents/backend.md` → Migrations |
