# Functional Specification — [TASK TITLE]

> Describes **what the system must do and where**, as observable behavior — not as implementation.
> Inline markers for what is still undefined (the detail lives in `questions.md`):
> **🔴 [Q-##]** undefined · **🟡 [Q-##]** options on the table · no marker = confirmed, the developer
> builds it without asking.
> If the developer finds an ambiguity **without** a marker, that is a defect in this spec: report it,
> do not assume it.
> _Text in italics is an illustrative example — replace it._
>
> The `>` notes under each section are guidance for you, the author — how to fill that section in. Delete
> every one before delivering, keeping only this marker legend. The delivered spec carries real content
> and the legend, nothing that talks to the author.
>
> **Write each fact once, in its natural section, and go straight to the point.** Every section below has
> one job — a different angle on the behavior, not the whole fact again:
> §2 the inventory of flows touched (one line each, not the mechanism) · §4 the order things happen ·
> §6 the atomic testable rule, self-contained · §8 what happens off-screen (not the §2 "No change" rows) ·
> §10 the boundary and failure paths · §12 the Given/When/Then test, self-contained.
> Where another section needs a fact, say only the one line it needs — or nothing. Never "do this because
> of rule X, case 2 of section Y": that forces a jump and tires the reader. Going to the point beats
> looking complete.
>
> **If an optional section (§9, §10, §11) has nothing to say, delete the whole section** — never
> write "Not applicable" or "None". The one exception is the §2 "No change" rows: those stay on purpose,
> as the record that the flow was considered and not forgotten.

---

## Metadata

- **Ticket / Title:** _HR-12 — Answer-by date on leave requests_
- **Last updated:** _2026-07-26_
- **Definition of Ready:** 🟡 In refinement · ⏸ Paused (waiting on someone else) · 🟢 Ready — turns 🟢
  only when no 🔴/🟡 markers remain in scope **and** one review has completed with nothing left open.

---

## 1. Context

- **Problem / need:** _Leave requests stay pending indefinitely. Employees chase their manager by
  email and requests sit in Pending for weeks with no way to tell a stale request from a live one._

## 2. Scope

- **Includes:**

1. _An answer-by date on the leave request the employee submits, for leave types that need manager
   approval._
2. _A visible expired state once that date passes without a manager decision._

- **Does NOT include:**

> List an item here only if a reasonable reader would otherwise assume it is in scope — an adjacent
> feature, a natural extension, something the ticket hinted at. Everything not in Includes is already
> untouched, so never list the inverse of an Includes item: Includes above adds an answer-by date, so
> do not add "the leave dates do not change" here — nobody assumed they did. If nothing would be
> wrongly assumed, delete this list.

1. _Sick leave, which is approved automatically — out of scope for this task._
2. _Automatic reminders to the manager, reporting._

**Affected systems / modules and flows:**

> One checklist item per flow. Each item names the flow, then whether it is Created / Modified / No
> change, then a one-line summary of the change.

- [ ] _Leave request form_ · **Modifies** · _New answer-by date field_
- [ ] _Employee profile — leave history_ · **Modifies** · _Shows the answer-by date and the expired state_
- [ ] _Manager decision (approve / reject)_ · **Modifies** · _Blocked once the request expired_
- [ ] _Leave emails to the manager_ · **Modifies** · _State the deadline_
- [ ] _Payroll run — unpaid leave deductions_ · **No change** · _—_

> Every flow found during impact investigation is listed here, including the ones confirmed as
> "no change" — that is the record that they were considered and not forgotten.

## 3. Actors and roles

> Always name **who performs the operation** — the actor: the participant in the flow, described by
> what they are doing ("the person requesting leave"). Each actor maps to a single system role
> (HR admin, manager, employee…); a real person holds exactly one role. Keep this section even when no
> role's behavior branches: the developer still needs to know who acts. State that plainly in the note
> above the table ("no role-specific branching; the actors below are simply the roles allowed to
> perform the operation").

| Actor                                | Role         | What they do                                              | Differences              |
| ------------------------------------ | ------------ | --------------------------------------------------------- | ------------------------ |
| _Person configuring the leave policy_ | _HR admin_  | _Sets the default answer window for each leave type_      | _—_                      |
| _Person requesting leave_            | _Employee_   | _Sets the answer-by date when submitting the request_     | _—_                      |
| _Person deciding the request_        | _Manager_    | _Approves or rejects before the deadline_                 | _Cannot decide after it_ |

## 4. Functional flow

> Step by step in natural language. Numbered. Mark branches (If… / If not…). Insert 🔴/🟡 wherever
> something is undefined.

1. **[Entry]** The employee opens New leave request from their profile.
2. The employee fills in leave type and dates as today, plus the new answer-by date.
3. The employee submits → the request is sent and shows as Pending.
   - If the answer-by date is missing or in the past → the form blocks with an error and nothing is
     sent
4. The manager receives the request and sees the deadline.
   - If they decide before it → approve / reject behave exactly as today
   - If the deadline passes with no decision → the request becomes Expired. 🔴 **[Q-01]** _(are the
     days held against the leave balance released, or do they stay reserved?)_
5. **[Result]** An expired request can no longer be approved or rejected; the employee submits a new
   one, which behaves like any new request today.

Define every flow if there is more than one.

## 5. UI / UX

> Which elements exist and what they do (not visual styling). One subsection per screen. Reference
> the design file if available.

### 5.1 Screen: _Leave request form_ · _[design link / screenshot]_

- **New elements:** `[Field "Needs an answer by"]` → date, mandatory, must be in the future
- **Modified elements:** _none_
- **States:** error _("The answer-by date must be a future date")_ · everything else unchanged
- **User-facing text** (exact wording)**:** 🟡 **[Q-02]** _(wording of the field label and helper text)_
- **Responsive / devices:** _desktop and mobile web alike._

### 5.2 Screen: _Employee profile — leave history_

- **New elements:** `[Column "Answer by"]` · `[Status "Expired"]` on requests that passed the deadline
- **States:** _an expired row shows no approve/reject actions._

## 6. Business rules

> Numbered (BR-##) so acceptance criteria can reference them.

| ID    | Rule                                                                                        |
| ----- | ------------------------------------------------------------------------------------------- |
| BR-01 | _The answer-by date is mandatory and must be later than the day the request is submitted._  |
| BR-02 | _An expired request cannot be approved or rejected._                                        |
| BR-03 | _There is no upper limit on how far out the answer-by date can be set._                     |

## 7. Data

> Business concepts, not table or column names.
>
> A data item that stands for several concrete pieces must be broken into them, not left as one umbrella
> word — especially anything supplied from outside the system that someone must hand over before the
> feature works (config, credentials, connection details, a file, a code list). "The settings", "the
> config", "the connection details" is not a definition: whoever gathers it and whoever tests cannot tell
> what to provide or when it is complete. List each piece by its own business name so the requirement is
> exact, not merely true. If you cannot yet enumerate them, that gap is a marked question, not a vague
> line. The same holds for a dependency: it states exactly what is owed, item by item, not that
> "settings are needed".

| Data                        | Shown / entered / modified | Origin          | Validation (business)              |
| --------------------------- | -------------------------- | --------------- | ---------------------------------- |
| _Answer-by date_            | _Entered_                  | _This task_     | _Mandatory, must be a future date_ |
| _Leave request status_      | _Shown_                    | _Leave module_  | _Gains a new "Expired" value_      |
| _Leave start / end date_    | _Shown_                    | _Leave request_ | _Unchanged_                        |

**New data introduced by this task — behavior for existing records:**

| Data             | What existing records show | Filled how                                                                                                                          |
| ---------------- | -------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| _Answer-by date_ | _Empty_                    | 🟡 **[Q-04]** _(leave requests already pending without a deadline, or fill them with a date calculated from when they were sent?)_ |

> Any data this task introduces must say what happens to records that already exist: stay empty,
> or be calculated from something. Leaving this out is the most common source of rework.

## 8. Backend / system logic (functional)

> What happens behind the scenes, without saying how: processes triggered, state changes,
> integrations (what information goes in and out). Only the off-screen behavior — do not repeat the §2
> inventory of flows or its "No change" rows here.

- _When the deadline passes with no manager decision, the request moves to Expired on its own, without
  anyone opening the screen._
- _Approve and reject are refused once the request is expired, even from a link in an older email._

## 9. Notifications

> Only if applicable.

| Event               | Channel | Recipient            | Content / purpose                            |
| ------------------- | ------- | -------------------- | -------------------------------------------- |
| _Request submitted_ | _Email_ | _Employee's manager_ | _Existing email, now stating the deadline_   |
| _Request expired_   | _Email_ | _Employee_           | 🔴 **[Q-05]** _(is anyone notified at all?)_ |

## 10. Edge cases and errors

- _The manager opens the request exactly on the deadline day → still able to decide that whole day._
- _The manager and the employee are in different time zones → the deadline ends with the employee's day._
- _The employee cancels the request while it is still pending → the request follows the cancellation,
  no expiration handling needed._

## 11. Non-functional requirements

> Only what applies — delete the rest outright. Never strike through or write "does not apply": a
> requirement that is not relevant is simply removed, so the list reads as the requirements that hold.

- _Auditing: it is recorded when a request expired._
- _Compatibility: existing requests keep working with no manual step._

## 12. Acceptance criteria (Given / When / Then)

> Verifiable. Each criterion is self-contained: it states the scenario and the expected result on its
> own, so a tester reads it without jumping to §6. Keep it simple and direct — no verbose echo of the
> rule, and not a 1:1 mirror of every business rule. The `(BR-##)` is a quiet trace tag, not something
> the prose leans on.
>
> Write a criterion only where it adds real verification — the happy path, the negative path, the edge
> case, the "existing records" rule — not one per sentence. The ones in the original ticket are a
> starting point: reword for clarity, split one that hides two checks, drop one a refinement decision
> made obsolete, add the ones the ticket missed. Every criterion is verifiable and traces to a flow or
> rule in this spec.

**AC-01 — Request sent with a deadline**

- **Given** an employee with an approval-required leave type, **When** they submit a request with a
  future answer-by date, **Then** the request is sent, the leave history shows the date, and the
  manager's email states the deadline.

**AC-02 — Answer-by date in the past (negative)**

- **Given** the leave request form, **When** the employee picks today or an earlier date, **Then** the
  form shows an error and nothing is sent (BR-01).

**AC-03 — Decision after the deadline (negative)**

- **Given** a request whose deadline has passed, **When** the manager opens it, **Then** it shows as
  Expired and approve/reject are unavailable (BR-02).

---

## Files in scope — developer reference

> **The one section written in code terms, not product language.** A developer aid and the baseline the
> surface reviewer checks against — not part of the functional definition. The PO reads everything above
> this line.
>
> The living list of files a developer touches to build this task: seeded from the impact investigation,
> grown whenever the surface reviewer proves another file must change. A file lands here only with
> evidence; each row says why. Empty means the investigation has not run yet — not that nothing changes.

| File                                                        | Why it changes                                                 |
| ----------------------------------------------------------- | -------------------------------------------------------------- |
| _api/src/modules/leave/leave.service.ts_                    | _Owns submit/approve/reject; the expiration rule lives here_   |
| _web/src/modules/leave/components/LeaveRequestForm.tsx_     | _New answer-by date field and its validation_                  |
