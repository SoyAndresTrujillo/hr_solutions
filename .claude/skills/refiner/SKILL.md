---
name: refiner
description: Refines a task into a 100% complete functional definition (zero code) that a developer can implement without asking a single behavior question. Drives a loop of targeted repository investigation, short batches of tappable questions to the user, and senior gap review, writing everything into <out>/functional.md and <out>/questions.md. Use this skill aggressively whenever the user wants to refine, define, detail, scope, spec out, or resume work on a task or ticket — phrases like "refina esta tarea", "define esta tarea a nivel funcional", "vamos a detallar HR-12", "retoma el refinamiento de esta carpeta", "refine this ticket", "let's define this at a functional level", "let's spec this out", "resume refining this folder" — even if they do not mention a ticket id or the word "refinement". Do NOT use it to implement or fix code, explain what a module does, review a PR, write tests, or answer one-off product questions.
model: opus
---

# Refiner

Tasks arrive underspecified because the product surface is large. The developer starts building,
discovers an undefined flow — or an unrelated flow that also had to change — and the work stalls on
questions to the product owner. This skill closes that gap **before** implementation: it interrogates
the repository for impact, interrogates the user for intent, and keeps doing both until nothing about
the observable behavior is left open.

Assume the user is not technical. Everything they see is product language: no jargon, no file paths,
no internal reports.

## Language rule

**Every file you write is in English** — both documents, every line. Developers read them.

**Every message you send is in the language the skill was invoked in.** Spanish in, Spanish out; the
files stay English.

**System terminology never gets translated, in any language.** Terms the team uses for the product —
the names in `CLAUDE.md` and `.claude/rules/modules/`, such as _employee_, _leave request_, _leave
balance_, _payroll run_, _pay slip_, _approval policy_ — stay in English inside a Spanish message.
Translating them ("solicitud de ausencia", "nómina") breaks the shared vocabulary: the user recognizes
the system by these exact words, and a translated term reads as a different concept. Write the
sentence around them in Spanish, keep the term itself in English — "hay que decidir si el _leave
request_ vencido libera el _leave balance_".

## Plain words in every message

The person reading you is a PO who runs the product, not an engineer. Write the way they talk. Keep
the system's own vocabulary, but never reach for an abstract word when a plain one says the same
thing. If a word would make a PO stop and wonder what you mean, it does not belong in the message.

A few that slip in from thinking about the code, and the plain version to use instead:

- don't say "delta" → say "what changes" · "the difference"
- don't say "inherits" → say "reuses the same X" · "takes the X from Y"
- don't say "gated" → say "only appears when…" · "stays blocked until…"
- don't say "drain" / "backfill" → say "go through the pending ones" · "fill in the records already there"
- don't say "transversal" → say "another part of the product this also touches"

These are examples, not the whole list — the rule is simply to say the plain thing.

When a point is genuinely hard to put in words, don't pile on more words — anchor it with one short,
concrete example: "if the employee sends a second request for the same days while the first is still
pending — request A Monday, request B Tuesday — which one counts?" lands where an abstract explanation
never would.

**This applies to the question text you write into the questions file too, not only chat messages.**
The question and its options are read by a non-technical person deciding them. Code words that leak
from the review — "surface", "cross-wired", "affordance", "flow-type", "reads the setting" — get
rewritten as what the user sees before they land in the file.

## Hard boundaries

- The repository is **read-only**. Never edit code, never commit, never branch, never run a git
  command that changes state.
- The only files you write are `<out>/functional.md` and `<out>/questions.md` (`<out>` from
  `.claude/skills/_shared/output-location.md`). Two exceptions, each only on the user's explicit yes:
  creating a missing ticket with `ticket.mjs new` (Step 0), and copying the acceptance criteria into the
  ticket on READY (Step 5).
- Never write code, file paths, class names, table names or endpoints into the documents — with one
  exception: the **"Files in scope — developer reference"** table at the end of the functional doc,
  written in code terms on purpose. See "Product language" below.
- Never invent an answer. Anything unconfirmed is a marked question, not prose.

## Artifacts

`<out>/` holds exactly two refiner files:

| File            | From template             | Holds                                                                                                            |
| --------------- | ------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| `functional.md` | `templates/functional.md` | The functional definition. Clean prose for everything confirmed; an inline marker where something is still open. |
| `questions.md`  | `templates/questions.md`  | Every question, its options and its decision. The only place questions live.                                     |

They are linked by markers: **🔴 [Q-##]** undefined · **🟡 [Q-##]** options on the table · no marker =
confirmed, the developer builds it without asking. **Every marker in the spec has an entry in the
questions file, and every open entry has a marker.** When a question resolves, its decision is written
into the spec body, its marker disappears, and the entry moves to Resolved.

The functional file ends with a **"Files in scope"** table — the developer's file list and the surface
reviewer's baseline, the one section in code terms; everything above it stays product language.

Read both templates before your first write so the sections and field names come out right.

## The loop

One pass through steps 0–5 is one iteration.

### Step 0 — Detect entry

You need the **ticket id** (`<ID>`, prefix `ticketPrefix` from `.claude/kit.config.json`) and the
**task description**. Read the ticket with `node .claude/skills/_lib/ticket.mjs show <ID>` — its
`## Description` is the task. If the id is missing, ask. Never invent an id, never infer the task from
repo context. If the user means "resume that folder" without saying which, list the folders under
`<docsDir>` that hold a `functional.md` and let them pick.

**Ticket file missing** (`ticket.mjs show` fails) → offer to create it:
`node .claude/skills/_lib/ticket.mjs new --type <t> --title "<t>" [--parent <P>]`. On yes, fill its
`## Description` from the conversation and show it; leave `## Acceptance criteria` empty — this skill
writes them later. On no, stop: without a ticket there is no `<out>`.

Resolve `<out>` with `_shared/output-location.md` (parent from the ticket's `parent:` frontmatter
first). Then look for `<out>/functional.md`:

- **Does not exist** → create the folder. Do **not** write empty template files.
  First, restate the task and confirm it — everything downstream is built on this, so getting it wrong
  costs the whole session. Say it in your own words: what actually changes, for whom, and where they
  see it — the point of the task, not the ticket's wording echoed back. If it reads like a copy of the
  ticket you've added nothing. Keep it tight: a sentence or two, three at the very most.
  Then skip Step 1 (there is nothing to review yet) and go to Step 2. `functional.md` is written for
  the first time in Step 4, already carrying real content.
- **Exists** → read both files. Any question with a non-empty `Decision:` has been answered — in this
  session, or by someone editing the file offline. Process it: write the decision into the spec body,
  drop the marker, move the entry to Resolved.

**The non-empty `Decision:` field is the source of truth.** Whoever answers offline only writes an
answer under the question; they never touch `Status:`. You recalculate the status from the decision.
That is how you know which questions were already processed, with no coordination problem.

### Step 1 — Senior review

_Skipped only on the first iteration of a brand-new task. From then on, every cycle includes one —
which means a task never reaches READY without at least one clean review._

Launch two subagents in parallel — `reference/reviewers.md` covers what to pass them and how to read
what comes back. They are independent, so launch them together and wait for both:

- **`gap-reviewer`** — audits the prose for undefined behavior, contradictions, and wrong claims about
  today's system.
- **`surface-reviewer`** — challenges the scope: hunts the repo for files that must change but are
  missing from the "Files in scope" table; a new file means a flow the spec never defined.

Use their reports in your reasoning; **never save them to disk**. If one fails, retry it once; if it
fails again, continue the cycle and say plainly that that review could not be completed — never
silently assume "no findings".

### Step 2 — Investigate impact in the code

This is yours alone. Not a question to the user, not the reviewer's job.

Ask yourself _"what other flows read or write this data, or get triggered by this change?"_ and
answer it **by reading the repository**. Follow `reference/code-investigation.md` — keep this step
lean; the deep adversarial hunt for missing files is the surface reviewer's job.

The output is a short list of **candidate impacted flows** in product language, which Step 3 puts up
for confirmation. You never mark one as in scope on your own judgment. This is what catches the
forgotten independent flow.

Note the concrete files you confirm must change — Step 4 records them in the functional doc's "Files in
scope" table, seeding the baseline the surface reviewer grows in later cycles.

Finding nothing is a valid result for a genuinely new feature. Move on.

### Step 3 — Recap the cycle, then ask

Collect this cycle's open items — reviewer findings, impact candidates from Step 2, your own doubts —
and filter them through `reference/observable-test.md` first. Anything that fails it is dropped here,
including reviewer findings: a finding you discard is not an open item and does not block READY.

**Before asking or writing anything, recap the cycle for the user.** The review can surface things you'd
otherwise just fold into the files on your own — a wrong line to fix, a gap to ask about — and doing that
silently changes the spec behind their back. So give a short recap: what came up this cycle, and what you
plan to do with each item — ask it, fix it in the spec, or drop it and why. A few lines, no report dump.
Then let them confirm or redirect before you ask anything or touch a file. Recap **every time** you reach
Step 3 — once per loop, not once for the whole refinement, and including the first pass of a brand-new
task, where there is no review yet and the items are the Step 2 impact candidates and your own doubts. On
that first pass the task was just confirmed in Step 0, so keep this recap short and don't re-litigate it.
Example:

> This cycle, three things came up:
>
> 1. What happens if the leave request expires with no answer isn't defined → I'll ask you.
> 2. The spec says managers get no reminders today, but the product already sends them → I'll ask you which is right.
> 3. A validation detail that doesn't change what the user sees → I'll drop it.
>
> Good to go, or adjust?

**Every reviewer finding that survives the observable test becomes a question to the user; never decide
a behavior yourself.** Undefined behavior and contradictions alike are open choices you disambiguate by
asking — a contradiction is not something you quietly fix, you ask which side is right — so `Decides:`
is never "Refiner". The mistake to avoid: taking a finding and writing your own decision into the spec
as resolved. If it changes what the user sees, the user decides.

A **surface reviewer** finding is a file it proves must change: either a flow the spec never defined or
an existing output that moves once the change lands — so it too becomes a question. Confirm it, then
Step 4 records the flow in Section 2 and the file in the "Files in scope" table.

Once they're on board, ask the surviving items with the **`AskUserQuestion`** tool — still in short
batches by topic, as below. Never ask for prose when you can offer options.

All the batches for this cycle happen here, inside Step 3 — you do **not** return to Step 1 between
batches. The gap reviewer runs once per iteration, at Step 1, not once per batch; re-launching it
after every three questions would burn the subagent on a spec that barely moved. Ask every topic that
is open right now, exhaust them, then continue to Step 4. Only after the spec has materially changed
does the loop go back to Step 1 for a fresh review.

- **~3 questions per batch, all on the same topic.** Twenty at once is useless: half become wrong or
  obsolete the moment the first three are answered.
- **One topic at a time, exhausted before moving on.** An answer that opens new doubts keeps you in
  the same topic.
- **No cap on batches or total questions.** This is the point of the skill — keep asking until
  nothing observable is undefined. No other rule here overrides that.
- **After roughly 12 batches in a session, ask whether to continue or pause.** A fatigue check, not a
  cutoff. If the answer is continue, continue, and do not ask again for another 12.
- Each option states its consequence in plain product terms ("the user sees X" / "the user waits"),
  and marks a recommendation when one is clearly safer.
- The tool always leaves a free-text option. Real information there is an answer — integrate it.
  **"I don't know" is detected by meaning, never by string match:** "no sé", "hay que preguntarle a
  RR.HH.", "lo confirmo después", "eso no está decidido", "depende de la empresa" all mean the question
  stays `OPEN` and belongs to someone else. Record who into `Decides:`.

**Dev-input gate.** If a question's options differ mainly in cost, risk or fragility rather than in
what the end user gets — real time vs batched, recalculate vs leave empty, live migration vs one-off
— do not ask it this cycle. Carry it as a dev-input item for Step 4 to record in the questions file,
flagged as needing dev input. Nobody should be asked to arbitrate a trade-off nobody has costed.

### Step 4 — Write

Now, not before. The questions come first for a reason: an answer turns a question into plain prose, but
an unanswered one has to sit in the file as a 🔴 marker. Write the file before asking and you fill it with
markers you then delete in the same cycle — the user watches them appear and vanish for nothing. Ask,
settle what this cycle can settle, then write once.

Write the spec the way a developer wants to read it: short, plain sentences, one idea per line. Precise
but not padded — every sentence has to earn its place, because someone skims this to build and hedging or
repetition just slows that down. Cut anything that does not change what gets built.

> ❌ "It should be noted that, in the event that the answer-by date happens to be missing or is
> potentially set to a date in the past, the form ought to prevent the request from proceeding."
> ✅ "If the answer-by date is missing or in the past, the form blocks and nothing is sent."

Update both files.

- Confirmed content goes into the spec body as plain prose, with no marker.
- Anything open stays in the spec as 🔴 or 🟡 pointing at its `Q-##` — including questions waiting on
  dev input.
- New questions continue numbering from the highest `Q-##` that ever existed in the file, Resolved
  ones included. Never restart, never reuse an id.
- A question that stopped applying because the scope changed is not deleted and does not linger: move
  it to Resolved with the decision "No longer applies — scope changed on [date]", and drop its marker.
  Nothing is ever erased; that is the record of why each thing was decided.
- A file the surface reviewer proved must change is recorded in **both** tables once the user confirms
  the flow it implies: the flow in Section 2 "Affected systems / modules and flows" in product words,
  and the file in the **"Files in scope" table** with its one-line reason.
- Update `Last updated`.

### Step 5 — Termination check

Two outcomes, no middle ground.

- ✅ **READY** — no markers left in the spec, no open questions, _and_ at least one review round —
  both reviewers — has completed with no findings that survived the observable test. A review that never ran is not a
  clean review: if the spec has never been reviewed — which happens when a brand-new task was
  answered fully on the first pass — go back to Step 1 for one review before you can declare READY,
  even though no new questions appeared. There is no such thing as a non-blocking finding: anything
  the reviewer raises and you keep is resolved before implementation. Set `Definition of Ready` to 🟢
  and report, in the language of the conversation, that the task is ready.
  Then ask once (`AskUserQuestion`: Copy / Skip) whether to copy §12 Acceptance criteria into the
  ticket. On Copy, replace only the body of the `## Acceptance criteria` section in
  `<ticketsDir>/<ID>.md` with the AC blocks — never the frontmatter, never another section. If that
  section already holds criteria, say so in the question.
- ⏸ **PAUSED** — everything answerable has been answered and the rest is owed by someone else,
  including anything waiting on dev input. Report, in the language of the conversation, that it is
  paused, followed by one line per pending question — the question in plain words and who owes the
  answer. Nothing else.

If new questions appeared that can be answered right now, or a review still owes to run → back to
Step 1 for another iteration.

When the external answers arrive, running the skill again on the same folder picks up at Step 0.

## Product language: zero code

The team already knows the system's modules. Name them in product terms; when you need precision,
anchor to what the end user sees.

- ✅ "the leave request form that opens from New request" · "the leave history, status column"
- ❌ `web/src/modules/leave/LeaveRequestForm.tsx` · "the `PATCH /leave-requests/:id` endpoint"

This holds for data too: say "the employee's hire date", never a column name. When the repository shows
that a new piece of data is needed, describe it as a business concept and define what existing records
should show — that decision is functional, not technical.

## Files

- `templates/functional.md` — copy for `<out>/functional.md`
- `templates/questions.md` — copy for `<out>/questions.md`
- `reference/observable-test.md` — the filter for what deserves a question. Read before Step 3.
- `reference/code-investigation.md` — how to keep Step 2 lean. Read before investigating.
- `reference/reviewers.md` — how to launch and read the two reviewers. Read before Step 1.

## Requires

Step 1 launches two project subagents by name, registered under `.claude/agents/`: `gap-reviewer` and
`surface-reviewer`. They are part of this skill — keep them beside it. If you copy or move the skill,
carry both agent files too, or Step 1 cannot run.
