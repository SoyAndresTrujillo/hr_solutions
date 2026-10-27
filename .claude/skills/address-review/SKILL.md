---
name: address-review
description: Work through the open review comments and failing checks on a pull request — fix each in the ticket worktree, run the fast gate and covering tests, reply on each thread, push after confirmation — until only the Tech Lead's approval is missing. Never merges. Use on '/address-review <PR>', 'address the review comments', 'fix the PR comments', 'babysit this PR'.
model: opus
---

# /address-review — the PR review fix loop

The review fix loop, run locally with `gh` instead of a GitHub integration. It ends where `/ship`
begins: green checks, no unresolved threads, approval pending (`techLead` in `.claude/kit.config.json`;
`null` → the user approves).

**Never merges, never force-pushes, never resolves a thread it did not fix.** Every push and every
reply is outward-facing (`_shared/team-rules.md` §D2); the `outward-gate` hook asks before each.

## 1. Collect

```bash
gh repo view --json owner,name -q '"\(.owner.login) \(.name)"'   # → <owner> <name>
gh pr view <PR> --json number,title,headRefName,reviewDecision,reviews,statusCheckRollup
gh api graphql -f query='query($o:String!,$r:String!,$n:Int!){repository(owner:$o,name:$r){pullRequest(number:$n){reviewThreads(first:100){nodes{id isResolved path line comments(first:20){nodes{databaseId author{login} body url}}}}}}}' -F o=<owner> -F r=<name> -F n=<PR>
```

Work list = unresolved threads + failing checks (keyed on `workflowName`, never the check name, and
filtered by `ci.ignoreWorkflows` — the shadow-check trap in `/ship` Phase 2). A failing check goes
through `/ship` Phase 2's CI triage first.

Show the list and confirm scope once. A comment asking for something outside the ticket is **not**
fixed here (§S1, §S3): reply that it is out of scope and name who decides (PO / Tech Lead).

## 2. Fix, one item at a time

Work in the ticket worktree (`<git.worktreesDir>/<ID>`; branch = bare ticket ID, §D1).

1. Read the whole function around the comment, its callers and a sibling path.
2. Make the smallest change that answers the comment (same rules as `/fix`: root cause, reuse first,
   `CLAUDE.md` §Reuse and §Customization, `.claude/rules/code-rules.md`).
3. Run the fast gate and the covering test files, one at a time under the test lock
   (`.claude/skills/_shared/verify-commands.md`).
4. Commit with the ticket ID: `fix(<ID>): address review — <one line>` (no attribution, §D3).

A comment you disagree with: do not change the code. Draft a reply with the reason and the
`file:line` evidence, and ask the user before posting it.

## 3. Reply and push

- One push for the batch (`git push`; the hook asks).
- Reply on each thread with what changed and the commit SHA:
  `gh api repos/<owner>/<name>/pulls/<PR>/comments/<comment databaseId>/replies -f body="…"`.
- Rerun the AI review on the new head only if the fixes touched more than the commented lines
  (`/create-pr` Step 2.5 rules, `.claude/REVIEW.md`), rewrite `<out>/review-findings.md`, and post the
  new table as a comment.

## 4. Learn

A finding raised on two different PRs is a missing rule: add it to `.claude/rules/code-rules.md` or
`CLAUDE.md` and add an eval case (`.claude/evals/README.md` → "Adding a case"). Say which one you
added in the report.

## 5. Stop

Report: threads fixed / replied-without-change / out of scope, checks now green, and what is still
missing — normally only the Tech Lead's approval. Then hand over to `/ship`.
