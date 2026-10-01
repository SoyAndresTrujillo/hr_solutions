# Stack profile — Node API + React (Vite)

Every stack-specific fact the kit needs lives here. Skills, agents and `_shared/` point at a section
(`stack profile §Fast gate`); they never restate a command. A new stack = a new file in `stacks/` with
the same section names, selected by `stack` in `.claude/kit.config.json`.

Paths below use the config names: `<api>` = `workspaces.api`, `<web>` = `workspaces.web`,
`<pm>` = `packageManager`, `<lock>` = `testLock`.

## Detect (existing project)

Before using a command below, confirm it against the project. The project wins over this file.

| Fact | Where to look | Adjust |
|---|---|---|
| Package manager | lockfile: `package-lock.json` npm · `pnpm-lock.yaml` pnpm · `yarn.lock` yarn | set `packageManager` |
| Test runner | `<ws>/package.json` devDependencies: `vitest` or `jest` | swap the §Targeted tests line |
| Linter | `eslint.config.*` / `.eslintrc*` or `biome.json` | biome: `npx biome check --write <files>` |
| API framework | `<api>/package.json`: `express`, `fastify`, `@nestjs/core`, `hono` | §Layout names follow the framework |
| ORM / migrations | `prisma`, `drizzle-kit`, `knex`, `typeorm`, `sequelize` | §Migrations |

## Layout

npm workspaces monorepo. Root `package.json` has `"workspaces": ["<api>", "<web>"]`.

```
<api>/                              Node 22+, TypeScript, ESM
  src/
    app.ts                          app factory (no listen) — tests import this
    server.ts                       listen on PORT (default 3001)
    config/env.ts                   env parsing + validation (zod); the only reader of process.env
    common/                         errors, auth middleware, validation middleware, logger
    modules/<module>/
      <module>.routes.ts            route table only
      <module>.controller.ts        HTTP in/out, no business logic
      <module>.service.ts           business logic
      <module>.repository.ts        data access
      <module>.schema.ts            request/response schemas (zod) + inferred types
      <module>.service.test.ts      unit tests next to the source
      <module>.routes.test.ts       HTTP tests (supertest against app.ts)
  migrations/                       see §Migrations
  .env / .env.example
<web>/                              Vite + React 18+ + TypeScript
  src/
    main.tsx, App.tsx, router.tsx
    lib/api-client.ts               the only fetch wrapper; base URL from import.meta.env.VITE_API_URL
    components/                     shared UI primitives
    modules/<module>/
      pages/                        route components
      components/
      hooks/                        data hooks (use<Thing>) — components never call fetch
      api.ts                        typed calls through lib/api-client.ts
      *.test.tsx                    next to the source
    i18n/en.json                    UI text catalog (§i18n)
```

Layering (team-rules §B2): API `routes → controller → service → repository`; web
`page → component → hook → api.ts → lib/api-client.ts`.

## Bootstrap (empty project)

Run once, as `M0-shared` of the first `/implement`. Each step is a phase; the pre-approved dependency
set below needs no G0. Anything else is team-rules §B5.

```bash
<pm> init -y && npm pkg set workspaces[0]=<api> workspaces[1]=<web>
<pm> create vite@latest <web> -- --template react-ts
mkdir -p <api>/src && (cd <api> && <pm> init -y && npm pkg set type=module)
```

Pre-approved set — api: `express zod dotenv cors` · dev `typescript tsx vitest supertest @types/express @types/supertest @types/cors @types/node`.
web: `react-router-dom` · dev `vitest @testing-library/react @testing-library/jest-dom jsdom`.
Both: `eslint typescript-eslint`. Database driver/ORM: **G0 decision** — record it in `CLAUDE.md` §Stack.

Scripts to add — api: `dev: tsx watch src/server.ts`, `start: node dist/server.js`, `build: tsc`.
web: Vite defaults plus `test: vitest`. Vite dev server proxies `/api` to the API port.

## Fast gate

Typecheck + lint, changed files only. Never builds.

```bash
cd <api> && npx tsc --noEmit -p . 2>&1 | grep "error TS" | grep -v "\.test\."
cd <web> && npx tsc --noEmit -p tsconfig.app.json 2>&1 | grep "error TS" | grep -v "\.test\."
cd <ws>  && npx eslint <changed files in ws> --fix
```

Filter the typecheck output further to the changed files when the project has pre-existing errors.

## Targeted tests

One file per command, under the lock (`_shared/verify-commands.md`):

```bash
cd <api> && flock <lock> npx vitest run <path/to/file.test.ts>
cd <web> && flock <lock> npx vitest run <path/to/file.test.tsx>
# jest projects: flock <lock> npx jest <file> --runInBand
```

Covering files: the `*.test.ts(x)` next to each changed file, plus
`grep -rl "<changed module or symbol>" <ws>/src --include="*.test.ts*"`.

## Run locally

```bash
cd <api> && <pm> run dev          # http://localhost:3001  (environments.local.api)
cd <web> && <pm> run dev          # http://localhost:5173  (environments.local.web)
curl -sf http://localhost:3001/health
```

Ports come from `environments.local` in the config. `/run-app` owns start/stop/status.
Every environment's API exposes `GET /health` → 200 (used by `/run-app`, `/cherry-pick-deploy` Phase 6).

## Auth (for /api-verify and /e2e)

Convention when bootstrapping: `POST /api/auth/login {email,password}` → `{ token }`, sent as
`Authorization: Bearer <token>`. Credentials for automation: env vars named in
`e2e.credentialsEnv`, read from `e2e.envFile`. An existing project documents its real flow in
`CLAUDE.md` §Auth; `/api-verify` and the e2e login flow follow that.

## Migrations

The ORM chosen at bootstrap owns them. Every migration has a working `down` (team-rules §S5).
Record the create/apply/revert commands here once chosen:

```bash
# create:  <fill at bootstrap>
# apply:   <fill at bootstrap>
# revert:  <fill at bootstrap>
```

## i18n

`<web>/src/i18n/en.json`, one key per UI string, read through a single `t()` helper. If the project
decides not to localize, delete this section and team-rules §B9 no longer applies.

## Hygiene

- Delete `<web>/node_modules/.vite` if lint or tests hang after a long dev-server session.
- No `console.log` in committed API code; use `common/logger`.
