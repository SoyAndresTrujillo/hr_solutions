# Anchor map — table shape

One table, produced by the Step 0 Explore pass, consumed by every later step. `Explore` returns it;
the main context writes `<out>/anchor-map.md`.

| File | Line | Symbol | Why relevant / suspect | Reuse candidate (file:L) | Test file |
|------|------|--------|------------------------|--------------------------|-----------|

Rules:
- Real line numbers only. A row without one is not an anchor.
- `Reuse candidate` is mandatory when the change adds a prop, branch, helper or extension point.
- Customization rows (per-customer, per-role, feature flag) cite a route from `CLAUDE.md` §Customization,
  never an inline conditional site.
- Empty project (bootstrap): the map lists the stack profile §Layout paths the change will create,
  with `Line` = `new`.
- Explore returns malformed or empty → re-dispatch once, then fall back to `general-purpose`.
