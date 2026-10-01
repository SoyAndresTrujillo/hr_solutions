# Step 1 — Running the reviewers

Two cold subagents read the spec as someone who was not in the conversation: you know what you meant, a
fresh reader knows only what you wrote. That difference is what a developer hits later.

- **`gap-reviewer`** — correctness of the prose: undefined behavior, contradictions, wrong claims about
  today's system.
- **`surface-reviewer`** — completeness of the scope: did the set of files to modify grow beyond the
  spec's "Files in scope" table? A new file usually means a flow nobody defined.

## Launching them

Use the `Agent` tool, both in parallel — one message, two calls. You need both reports before Step 3.

Each agent carries its full method in its own definition, so the launch prompt does **not** repeat it.
It gives the agent its **assignment for this run**: one line naming the mission, then the ticket id and
the file **paths** (paths, never pasted text). Keep it cold — no conversation history, no explanations,
no defense of your choices, no hint at what the answers might be. What you feel the urge to explain is
what the documents fail to say.

**`gap-reviewer`:**

> Audit this spec as a cold reader. Read both documents in full, then check them against the repository.
> Report undefined behavior, contradictions, and any claim about today's system the code does not back up.
>
> Ticket id: <ID>
> Functional spec: <out>/functional.md
> Questions: <out>/questions.md

**`surface-reviewer`:**

> Challenge this task's scope. Read the functional doc, take its "Files in scope" table as your
> baseline, and hunt the repository for files that must change but are not listed — try to break the
> baseline, do not confirm it. Report only files you can prove, each with the flow it implies in plain
> words.
>
> Ticket id: <ID>
> Functional spec (holds the "Files in scope" baseline): <out>/functional.md

## Reading the reports

Every finding still passes `reference/observable-test.md` yourself — either agent can surface something
that fails it, and dropping it is cheaper than a question.

**Gap reviewer findings** — undefined behavior and contradictions alike — all become questions to the
user in Step 3. Never fold one in as resolved and never decide it yourself; `Decides:` is never
"Refiner". A contradiction is not something you quietly fix: you ask which side is right and let the
user disambiguate. A `→ FIX` tag marks a pure factual correction; it still goes into the Step 3 recap
before you touch the file.

**Surface reviewer findings** are new files, each with proof it must change and the flow it implies.
Two filters apply, and they are different: the **evidence bar** (the file must change) is the
reviewer's job, already passed; the **observable test** (does the implied flow change what anyone
observes) is yours. It clears through one of two triggers: a **parallelism** finding — "the spec never
says whether the new one appears here" — clears the ambiguity trigger, one developer shows the new
thing, another does not; a **consumer-impact** finding — a changed calculation or a new state value
reaching an export, pay slip, or report — clears the side-effect trigger, an existing output moves and
the user must ratify it. Either way, do not drop it for lacking a hard "must"; treat the implied flow
as a question to the user. On confirmation, Step 4 records the flow in Section 2 (product words) and the file in the
"Files in scope" table. `no findings` means the surface held: no new flow.

The reports are disposable — never write them to disk. They reach the user only as the short Step 3
recap, where you say what came up and what you'll do with each item, and wait for the go-ahead. The only
file a review touches is the "Files in scope" table, and only after the recap.

## When a reviewer fails

Retry it once. If it fails again, continue the cycle without it and say plainly that that review could
not be completed this round. Never treat a failure as "no findings" — a task cannot reach READY on a
review that never happened.
