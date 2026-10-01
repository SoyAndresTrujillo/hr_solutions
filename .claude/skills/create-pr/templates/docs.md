# docs template

When: `docs(...)` commit OR the diff contains only `*.md` / `docs/**` / doc-comment-only changes (no
behavioral code).

Labels: `documentation`. No `bug` / `enhancement` labels.

> **Description shape is fixed** — `.claude/skills/_shared/team-rules.md` §C2: one context sentence
> (5 lines max), then a flat bullet list, then `Modified flows:`, then `Env vars:` (omit when empty).
> No group headings and no bold subsections inside the bullet list; each fact stated once.

```markdown
## Description 📝

<One context sentence: what doc changed (README, doc comments, runbook, guide) and why. 5 lines max.>

- <What a reader can now find or do that they could not before.>
- <Second such bullet. Typically 2-5 for a docs PR.>

Modified flows:
- <Flow, or `N/A — documentation only`>

## Ticket 🎟️

- `<ID>` <!-- replace section with `> N/A` if no ticket -->

## FYI 🙋

- <Audience: who reads this doc; where it's surfaced (README, dev guide, component catalog, etc.).>
- <If renaming/moving files, list old → new paths.>
- <Reviewers who own the topic, if you want to tag them.>

## Screenshots 📸

<!-- Attach rendered preview for README / markdown changes when GitHub render differs from source. -->

> <Optional — paste rendered preview if it helps reviewers.>

## Test ✍️

- [ ] Markdown renders correctly on GitHub (Files changed tab → rendered view).
- [ ] All links resolve.
- [ ] No accidental code changes — `git diff --stat` shows only doc/markdown files.
```
