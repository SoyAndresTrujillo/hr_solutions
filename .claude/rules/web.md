---
paths:
  - "web/**/*.ts"
  - "web/**/*.tsx"
---

# Web rules (React + Vite + TypeScript)

Loaded while editing the web workspace. Layout and commands: `.claude/stacks/node-react-vite.md`.

- Layers: `page → component → hook → module api.ts → lib/api-client.ts`. Components never call
  `fetch` directly.
- One API client (`lib/api-client.ts`): base URL, auth header, error normalization. Module `api.ts`
  files are typed wrappers over it.
- Every data view handles loading, empty, error and success states.
- UI text from `i18n/en.json` when the project localizes (stack profile §i18n).
- Reuse shared primitives from `src/components/` before building a new input, table or modal.
- Accessibility: labels on inputs, keyboard reachable actions, `alt` on images.
- Tests: Testing Library, query by role/label, never by class name. Mock the module `api.ts`, not fetch.
