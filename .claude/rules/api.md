---
paths:
  - "api/**/*.ts"
---

# API rules (Node + TypeScript)

Loaded while editing the API workspace. Layout and commands: `.claude/stacks/node-react-vite.md`.

- Layers: `routes → controller → service → repository`. Controllers parse and respond; services hold
  logic; only repositories touch the database.
- Validate every request body, query and param with the module's `*.schema.ts` before the controller
  uses it. Infer TS types from the schema; never declare them twice.
- Errors: throw the shared error classes from `src/common/`; one error middleware maps them to HTTP.
  Never `res.status(500)` inline.
- Authorization in middleware on the route, never inside a service.
- Every query that returns user data applies the ownership filter (team-rules §S8).
- Config only through `src/config/env.ts`. No `process.env` elsewhere.
- Async handlers: no floating promises. Await or return.
- Tests: service unit tests mock the repository; route tests hit `app.ts` through supertest.
