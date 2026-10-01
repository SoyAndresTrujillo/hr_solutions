# Verification rules — single source of truth

The **concrete commands** live in the stack profile: `.claude/stacks/<stack>.md` (`stack` in
`.claude/kit.config.json`) §Fast gate and §Targeted tests. This file owns the **rules** around them.
Never restate either in a skill, step file, agent file or subagent prompt — point here.

**No full-repo gate.** Whole-repo lint, production builds and full test suites are never run by a
skill: they exhaust the developer's RAM. Verification is scoped to the files the change touches.

## Changed files

```bash
git diff --name-only <mainBranch>...HEAD; git diff --name-only; git ls-files --others --exclude-standard
```

## Fast gate

Typecheck (filtered to changed files) + lint on changed files, per workspace. Never builds. Commands:
stack profile §Fast gate.

## Targeted tests

Only the test files that cover the changed code — one file per command, in band. Find them next to each
changed source file plus tests that import it. A failure in a covering file is compared against the
main branch for that same file before it is called pre-existing. Commands: stack profile §Targeted tests.

## One test process at a time — machine-safety rule

Two test runners at once exhaust RAM. Every test command runs under the lock in `testLock`:

```bash
flock <testLock> <one test-file command>
```

- One lock for every workspace. Never run workspaces in parallel.
- `flock` blocks until the holder exits — the wait is the command. Never kill the holder, never run unlocked.
- `flock -w <s>` only when a caller must not block; exit 1 from a timeout means "still busy", not a failure.

## Failure handling — bounded

At most **2 fix rounds**: one backend/frontend subagent scoped to that round's errors, then re-run the
fast gate and the targeted tests. Still failing after round 2, or the error count not dropping →
**STOP and report**.

Errors outside the changed files are pre-existing: report them, never auto-fix.
