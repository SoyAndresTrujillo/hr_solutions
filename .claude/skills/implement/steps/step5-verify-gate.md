# Step 5: Targeted Verification Gate (changed files only)

Runs after the **last module gate** of Step 4, inside the worktree. Each module already passed its own
scoped gate (`_shared/module-cascade.md` §3c); this pass runs the same gate over the **whole branch**
(`<git.mainBranch>...HEAD` + uncommitted, WIP checkpoints included) to catch what one module broke in
another.

**No full-repo lint, build or test suites** — they exhaust the developer's RAM. Commands, the
covering-test rule, the one-at-a-time lock and the bounded failure rule all live in
`_shared/verify-commands.md` → "Changed files", "Fast gate", "Targeted tests" and "Failure handling",
with the concrete commands in stack profile §Fast gate and §Targeted tests. Do not restate them.

**Completion gate — per changed workspace:**
- [ ] Fast gate ran on the changed files (typecheck + lint on changed files)
- [ ] Every test file covering the changed code ran, one file at a time under the lock, and passed (or
      its failure also occurs on `<git.mainBranch>` for that same file — report it)

Any box unchecked → run it. Do not proceed to Step 6.
