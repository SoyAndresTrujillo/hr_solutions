# Token budget + dispatch rules

Apply to every subagent and every document the pipelines produce.

## Pointer, never paste

`CLAUDE.md` is auto-loaded into every subagent. Pasting it into a prompt costs tokens and buys nothing.
Agent definitions carry their own method, so a launch prompt gives the **assignment**, not the method.

- Prompts pass **file paths, never pasted file text**.
- Never restate a block that lives in `_shared/`, the stack profile or another skill. Point at it by `file §section`.

## Reports are disposable

A reviewer's, critic's or verifier's report is consumed in reasoning and **not written to disk** —
unless a named downstream skill reads that exact file.

## Just-in-time loading

Step detail lives in `steps/`. Read a step file only when entering that step. Never preload `steps/`.

## Document compression

Agent-to-agent documents (specs, plans, phase docs, results): no articles, filler or hedging;
fragments OK; code, paths and technical terms exact; one line per constraint; tables over prose.

## Subagent context rules

- Files >400 lines: `offset`/`limit` on the section. ≤400 lines: full read OK.
- Filter tool output to the files in scope. No raw dumps.
- Budget guard: past 50 file reads, stop and return progress plus remaining items.

## Main context protection

Main context does not read implementation files. It coordinates, dispatches, verifies results, and
writes the artifacts read-only agents return.

## Subagent prompt boilerplate

Include these lines verbatim in every dispatch, and nothing more of the project's rules:

```
- CLAUDE.md rules apply (auto-loaded — never paste).
- Team rules: `.claude/skills/_shared/team-rules.md`. Verification rules: `.claude/skills/_shared/verify-commands.md` + stack profile `.claude/stacks/<stack>.md`. Read; never paste back.
- offset/limit reads for files >400 lines. Filter typecheck/lint output to scope files. No raw dumps.
- Past 50 file reads, stop + return progress. Below that, finish the assignment.
- No `any`/`unknown` casts. Extend types.
- Lint each modified file right after editing it (stack profile §Fast gate).
- Test commands run one at a time under `flock <testLock>`. Wait for the lock; never bypass it.
- Honor the Reuse + Pattern audit (`_shared/reuse-audit.md`): consume `Existing target` when Decision = Reused/Extended. No parallel implementation of an existing target.
```
