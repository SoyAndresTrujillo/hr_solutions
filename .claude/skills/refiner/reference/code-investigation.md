# Step 2 — Impact investigation

Seed two things this cycle: the **"Files in scope" baseline** and the **flows this change obviously
touches**, in product language, for Step 3's first question batch. Stay lean — the deep adversarial
hunt for the files nobody points at is the `surface-reviewer`'s job, in its own disposable context.
Seed the table, catch the obvious flows, then stop.

Go by evidence, not by hunch. Follow where this data and these actions are actually read, written or
triggered — that is a real touch. A file that _might_ coincidentally also change is not; leave it for
the surface reviewer to prove or kill. `CLAUDE.md` (§Customization, §Modules), `.claude/rules/` and the
stack profile §Layout already map where behavior lives per module, customer and role — the module
seams, the branching entry points, the read surfaces. Use them as your map instead of exploring blind.
What follows is only the method.

- **Data the system doesn't hold yet** — if the task assumes it, the records already there need a rule
  for what they show, and no rule is deducible. A finding, not a detail.
- **Nothing found is valid** — a genuinely new feature touches nothing. Say so; never manufacture
  impact to look thorough.

## Output

The flows this change touches, each in plain words with why — a result someone observes, not a file.
Don't assume the user already knows the flow; naming it is the point.

- _the leave history on the employee profile — shows request status, would need to show the new expired one_
- _the leave email to the manager — says nothing about a deadline today_
- _the leave balance on the employee profile — counts pending days as reserved, and the task never says what an expired request does to them_

Take them to Step 3 to confirm one by one. Never mark one in-scope on your own judgment.
