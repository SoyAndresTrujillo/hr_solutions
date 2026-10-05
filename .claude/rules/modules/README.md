# Module context docs

One file per business module, each a path-scoped rule (`paths:` frontmatter) that loads while Claude
works in that module. They hold what a code scan cannot show: the why, customer/role/flag variations,
cross-module dependencies, gotchas. `_shared/module-cascade.md` uses this list as the set of modules.

Add a module doc when `/implement` finishes a module's first cascade. Shape:

```markdown
---
paths:
  - "api/src/modules/<module>/**"
  - "web/src/modules/<module>/**"
---
# <module>
Purpose: <one line>
Depends on: <modules> · Consumed by: <modules>
Rules: <business rules not visible in code>
Gotchas: <traps>
```

## Modules

- [employees](employees.md) — employee directory API + table (HR-1, HR-2)
