# Workflow — Detailed Steps

> **Anti-Hallucination Strategy:** Steps 2 and 3 use a multi-phase verification loop to eliminate hallucinations, misreadings, and missed context. Step 1 and Step 4 are single-pass (trivial operations that don't benefit from repetition).

`<api>` / `<web>` = `workspaces.api` / `workspaces.web` in `.claude/kit.config.json`. Folder layout:
stack profile `.claude/stacks/<stack>.md` §Layout.

## Step 1: Parse the Input (Single Pass)

The user will provide a ticket ID, a task description, or both, such as:

```
HR-12: Add a button on the employee profile that pre-fills a new leave request from the employee's last one
```

1. Extract the **ticket ID** (prefix `ticketPrefix` from the config). With an ID, read the ticket:
   `node .claude/skills/_lib/ticket.mjs show <ID>`. Ticket file missing → offer
   `ticket.mjs new --type <t> --title "<t>" [--parent <P>]` (flow in `_shared/ticket-ingest.md`). No ID
   and the user declines a ticket → proceed untracked with a kebab slug.
2. Extract the **raw description** (the ticket's `## Description` + `## Acceptance criteria`, or the message)
3. Identify the **domain area** (API, web, both, infrastructure, etc.)
4. Resolve **`<out>`** with `_shared/output-location.md` — parent detection from the ticket's `parent:`
   frontmatter first. Create the folder.

---

## Step 2: Explore the Codebase (3-Phase Verified Exploration)

> **Goal:** Build a verified, high-confidence understanding of the affected codebase before writing any spec.

### Phase A — Parallel Independent Exploration (3 Subagents)

Launch **3 subagents in parallel** (one message, three `Explore` calls), each with a focused exploration scope. Each subagent works independently and reports its findings separately. Each prompt carries the boilerplate from `_shared/token-rules.md` §Subagent prompt boilerplate.

**Subagent 1: API Explorer**
- Identify affected modules under `<api>` (stack profile §Layout)
- Read relevant routes, controllers/handlers, services, request/response schemas and data access
- Check existing endpoint patterns (routing, authentication and authorization middleware, validation, error responses)
- Document: module names, file paths, function signatures, relationships found

**Subagent 2: Web Explorer**
- Identify affected pages and components under `<web>` (stack profile §Layout)
- Identify the data hooks and API-client calls they use
- Check existing UI patterns (form handling and validation, data fetching, error and loading states, i18n)
- Document: component names, file paths, patterns found, state management approach

**Subagent 3: Data & Schema Explorer**
- Review the relevant models/schema definitions and their relations (ORM named in `CLAUDE.md` §Stack)
- Check recent migrations related to the domain (stack profile §Migrations)
- Identify foreign keys, constraints, and default values
- Check the ownership / isolation columns every query must filter on (team-rules §S8)
- Document: table names, column definitions, relationships, migration history

Each subagent MUST output a structured report:
```
## [Explorer Name] Findings

### Files Read (with paths)
- path/to/file.ts — what was found

### Key Patterns Identified
- Pattern 1: description
- Pattern 2: description

### Relationships / Dependencies
- Entity A → Entity B (via FK)

### Confidence Level
- HIGH: [findings I'm certain about]
- LOW: [findings I'm uncertain about — needs verification]
```

### Phase B — Consolidation & Contradiction Detection (Main Agent)

The main agent receives all 3 subagent reports and:

1. **Merge findings** — combine into a single exploration summary
2. **Detect contradictions** — flag where subagents disagree:
   - Subagent 1 says file X exists, Subagent 2 references a different path
   - Subagent 1 says the service writes table A, Subagent 3 says table B
   - Any LOW confidence items from any subagent
3. **Detect gaps** — identify areas no subagent covered, using `project-checks.md`:
   - Were async side effects (jobs, queues, emails, integrations) checked?
   - Was the audit logging pattern checked?
   - Was user-facing text (i18n) checked?
   - Was the customization route (`CLAUDE.md` §Customization) checked?
4. **Build a contradiction/gap list** for Phase C

### Phase C — Targeted Re-Verification (Main Agent)

For EACH item in the contradiction/gap list:

1. **Re-read the actual files** — don't trust any previous finding, go read the source
2. **Resolve contradictions** — determine the correct answer from the source code
3. **Fill gaps** — explore areas that were missed
4. **Produce the Final Exploration Report** with ONLY verified findings

The Final Exploration Report uses this structure:
```
## Verified Exploration Report

### API (VERIFIED)
- [Only findings confirmed by direct file reading]

### Web (VERIFIED)
- [Only findings confirmed by direct file reading]

### Data & Schema (VERIFIED)
- [Only findings confirmed by direct file reading]

### Resolved Contradictions
- Contradiction: [what conflicted] → Resolution: [what's actually true]

### Filled Gaps
- Gap: [what was missed] → Finding: [what was discovered]

### Remaining Unknowns
- [Items that couldn't be verified — will become CLARIFICATION NEEDED in spec]
```

---

## Step 3: Generate the Specification (3-Phase Critique Loop)

> **Goal:** Produce a spec where every claim is backed by verified codebase evidence.

> **Templates:** Read `spec-framework.md` for the full Complete Definition Framework (all output templates: TASK ANALYSIS REPORT, BUSINESS CONTEXT, CRITICAL QUESTIONS CHECKLIST, USE CASES UC1-UC7, ACCEPTANCE CRITERIA, TESTING CHECKLIST, ASSUMPTIONS & RISKS, COMMUNICATION TEMPLATE, DECISION LOG). Read `project-checks.md` for the project considerations and the Three Questions Rule.

### Phase A — Draft Specification

Using ONLY the Verified Exploration Report from Step 2, produce the first draft of the specification following the Complete Definition Framework in `spec-framework.md`.

Rules for the draft:
- Every technical claim MUST reference a specific file path from the exploration
- If the exploration didn't cover something, mark it as `CLARIFICATION NEEDED` — do NOT guess
- Use actual table names, column names, endpoint paths, component names from the exploration
- Do NOT invent file paths, function names, or patterns that weren't in the exploration report

Write the draft to `<out>/requirements-spec.md`.

### Phase B — Critic Subagent Review

Launch a **single critic subagent** with:
- The path to the draft specification from Phase A
- Full access to the codebase

The critic subagent's ONLY job is to **challenge every claim** in the draft. It MUST:

1. **Verify file references** — for every file path mentioned in the spec, confirm it exists and contains what the spec claims
2. **Verify entity/model claims** — for every table, column, or relationship mentioned, confirm it in the actual model/schema and migration files
3. **Verify pattern claims** — for every "existing pattern" referenced, confirm the pattern is actually used
4. **Check for missing concerns** — scan the spec for gaps (`project-checks.md`):
   - Data isolation addressed?
   - Permissions model specified?
   - Audit logging considered?
   - Async side effects (jobs, queues, emails, integrations) identified?
   - User-facing text / i18n flagged?
   - Error handling scenarios covered?
5. **Check for hallucinated content** — any claim that cannot be verified by reading actual code

The critic subagent MUST output a structured review:
```
## Critic Review Report

### VERIFIED Claims
- [Claim] — Confirmed in [file:line]

### UNVERIFIED Claims (could not confirm)
- [Claim] — File exists but couldn't find this specific pattern
- [Claim] — Referenced file/function not found

### WRONG Claims (contradicted by code)
- [Claim] — Actually, the code shows [correct info] in [file:line]

### MISSING Concerns
- [Missing item] — Should be addressed in spec

### Overall Confidence Score: X/10
```

The report is consumed in reasoning, never written to disk (`_shared/token-rules.md` §Reports are disposable).

### Phase C — Final Refinement (Main Agent)

Using the Critic Review Report:

1. **Keep** all VERIFIED claims as-is
2. **Remove or fix** all WRONG claims — replace with correct information from critic's findings
3. **Downgrade** all UNVERIFIED claims to `CLARIFICATION NEEDED` — do not present unverified info as fact
4. **Add** all MISSING concerns to the appropriate spec sections
5. **Update** the spec file at `<out>/requirements-spec.md` with the final version

The final spec MUST include a **Verification Summary** section at the top:
```
### VERIFICATION SUMMARY
- **Claims verified against code:** X
- **Claims corrected after review:** Y
- **Claims marked as needing clarification:** Z
- **Concerns added after review:** W
- **Overall confidence score:** X/10
```

---

## Step 4: Present Summary to User (Single Pass)

After writing the final verified spec file, present a brief summary in chat:
- Verification summary (claims verified / corrected / unverified)
- Overall confidence score
- Complexity rating
- Key questions that need answers (from CLARIFICATION NEEDED items)
- Top risks identified
- File location

---

## Agent Behavior Rules

1. **Always ask for missing context** — Never assume critical details
2. **Provide multiple options** when behavior is ambiguous (Option A vs Option B)
3. **Flag risks explicitly** using HIGH/MEDIUM/LOW severity indicators
4. **Be project-aware** — Consider data isolation, permission models, and customization routes (`project-checks.md`)
5. **Estimate complexity** — Help developer understand scope before committing
6. **Generate actionable artifacts** — All outputs should be copy-paste ready for the ticket and documentation
7. **Think like a QA engineer** — Identify edge cases and failure scenarios proactively
8. **Document assumptions** — Make all implicit decisions explicit
