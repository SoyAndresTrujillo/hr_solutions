# Complete Definition Framework

> Output templates for the requirements specification. The final spec at `<out>/requirements-spec.md` MUST include ALL of the following sections. These templates render into the spec verbatim — keep human-readable for PO, devs, and QA.

---

### TASK ANALYSIS REPORT

**Task ID:** [from input]
**Original Description:** [user's input]
**Complexity Rating:** LOW / MEDIUM / HIGH
**Estimated Effort:** [your assessment based on complexity]

---

### BUSINESS CONTEXT CLARIFICATION

**Questions to ask Product Owner/Stakeholders:**

1. **Why does this feature exist?**
   - What user problem does it solve?
   - What is the business impact if we don't build this?
   - Are there any success metrics? (e.g., "cut the time HR spends approving leave by 30%")

2. **Who requested this and why now?**
   - Is this a customer-specific request?
   - Is there a deadline or urgency (e.g., before the next payroll close)?

3. **What is the scope?**
   - Is this for one customer, or should it be configurable for all (`CLAUDE.md` §Customization)?
   - Should this work for all user roles or specific ones?

---

### CRITICAL QUESTIONS CHECKLIST

#### Frontend Questions
- [ ] **Exact location of the button/component?** (Which component/page/route?)
- [ ] **UI element label and styling?** (Text, icon, which shared UI primitive)
- [ ] **Element states?** (Default, loading, disabled, error)
- [ ] **Client-side validation?** (What fields are required? What validation rules?)
- [ ] **User feedback on success?** (Toast notification, modal, redirect to where?)
- [ ] **User feedback on error?** (Error message format, retry mechanism?)
- [ ] **Responsive/mobile behavior?** (Does it work on mobile?)
- [ ] **Accessibility?** (Keyboard navigation, screen reader support?)

#### Backend Questions
- [ ] **Endpoint details?** (New endpoint or existing? Method and path?)
- [ ] **Authentication/Authorization?** (Which roles can use this? Where is access denied?)
- [ ] **Request payload structure?** (Request schema — what fields are required/optional?)
- [ ] **Business logic?** (What happens server-side? Any calculations or transformations?)
- [ ] **Database operations?** (Insert into which table? Any related records to create?)
- [ ] **Transaction handling?** (Should this be atomic? Rollback strategy if it fails?)
- [ ] **Side effects?** (Background jobs? Webhooks? Email notifications? Payroll recalculation?)
- [ ] **Audit logging?** (Track who performed the action and when?)
- [ ] **Error handling?** (What errors can occur? How to communicate them to frontend?)

#### Data & Schema Questions
- [ ] **Field mapping?** (Form field -> request schema -> database column mapping)
- [ ] **Default values?** (What happens to fields not filled in the form?)
- [ ] **Entity status?** (Created as "draft", "pending", "approved"?)
- [ ] **Required relationships?** (Foreign keys to related entities — employee, manager, leave type?)
- [ ] **Data validation rules?** (Date ranges, numeric constraints, text length limits?)
- [ ] **Existing records?** (What do records created before this change show?)

#### Data Isolation & Permissions
- [ ] **Ownership scope?** (Whose records can each role read or write — own, team, company?)
- [ ] **Customization?** (Does a customer-, role- or flag-specific rule apply here? Which `CLAUDE.md` §Customization route?)
- [ ] **Permission check location?** (Frontend only, backend only, or both?)
- [ ] **Permission model?** (Role-based? Attribute-based? Feature flags?)
- [ ] **Ownership validation?** (Backend must verify the user may act on this record — e.g. a manager only approves their own team's leave)

#### User-Facing Text & Labels
- [ ] **UI labels?** (Exact text; sourced from the i18n catalog when the project has one — stack profile §i18n)
- [ ] **Button text?** (Exact action labels, e.g. "Request leave", "Approve")
- [ ] **Modal/dialog titles?**
- [ ] **Table column headers?**
- [ ] **Email subject & body text?**
- [ ] **Notification messages?** (Toast/alert/notification texts)
- [ ] **PDF/export labels?** (Pay slips, reports, exports)
- [ ] **Error messages?**
- [ ] **Tooltips & help text?**
- [ ] **Label source?** (i18n catalog? Per-customer terminology through a `CLAUDE.md` §Customization route?)
- [ ] **Fallback behavior?** (What text shows when a key or a customer-specific label is missing?)

---

### USE CASES & SCENARIOS

Generate use cases following this pattern. Include AT MINIMUM these scenarios (add more as needed based on the specific task):

#### Use Case 1: Happy Path (Success Scenario)
```
GIVEN:
  - [User authentication and role context]
  - [Ownership context — whose records]
  - [All preconditions met]

WHEN:
  - [User action]

THEN:
  - [Step-by-step expected behavior]
  - [Frontend feedback]
  - [Backend operations]
  - [Side effects if any]
```

#### Use Case 2: Validation Error
```
GIVEN:
  - [Incomplete or invalid input]

WHEN:
  - [User action]

THEN:
  - [Validation behavior]
  - [Error display]
  - [No API call made]
```

#### Use Case 3: Permission Denied
```
GIVEN:
  - [User without required permissions]

WHEN:
  - [User attempts the action]

THEN:
  - [OPTION A] Element is hidden/not rendered
  - [OPTION B] Element is visible but disabled with tooltip
  - [OPTION C] Element is clickable but API returns 403

  CLARIFICATION NEEDED: Which approach should we use?
```

#### Use Case 4: Backend Error (500)
```
GIVEN:
  - [Valid input, valid permissions]
  - [Backend failure scenario]

WHEN:
  - [User action]

THEN:
  - [Loading state behavior]
  - [Error feedback to user]
  - [Recovery options]
  - [Error logging]

  CLARIFICATION NEEDED: Should there be automatic retry logic?
```

#### Use Case 5: Duplicate/Conflict Check
```
GIVEN:
  - [Entity with conflicting data already exists — e.g. an approved leave request overlapping the same days]

WHEN:
  - [User submits]

THEN:
  - [OPTION A] Backend prevents creation, returns error
  - [OPTION B] Backend allows duplicate but shows warning
  - [OPTION C] No duplicate check performed

  CLARIFICATION NEEDED: What's the expected behavior?
```

#### Use Case 6: Ownership Mismatch
```
GIVEN:
  - [User acting on a record they do not own — e.g. a manager opening a leave request from another team, or a user of company A reading company B's payroll]

WHEN:
  - [User attempts the action]

THEN:
  - [Backend validates ownership]
  - [Returns 403 Forbidden or 404 Not Found]
  - [Frontend shows error message]
```

#### Use Case 7: User-Facing Text
```
GIVEN:
  - Feature displays labels in UI, emails, notifications or exports
  - [If the project supports per-customer terminology: customer A says "Time off", customer B says "Leave"]

WHEN:
  - A user views the feature

THEN:
  - Labels, titles, column headers, and messages come from the text source (i18n catalog / customization route)
  - Emails and notifications use the same text source
  - PDF/export documents (pay slips, reports) use the same text source
  - No hardcoded text in components or templates

  CLARIFICATION NEEDED: Where does this text live?
  - Option A: i18n catalog (stack profile §i18n)
  - Option B: Per-customer terminology through a `CLAUDE.md` §Customization route
  - Option C: Stored configuration editable by an admin
```

---

### ACCEPTANCE CRITERIA (Copy to the ticket)

Generate acceptance criteria specific to the task. Follow this pattern:

- [ ] [UI element] is visible on [SPECIFY PAGE] for users with role/permission `[permission]` on [ownership scope]
- [ ] [UI element] label reads "[SPECIFY TEXT]" with [SPECIFY STYLING]
- [ ] Clicking [element] validates form fields: [LIST REQUIRED FIELDS]
- [ ] If validation fails, display inline errors and prevent submission
- [ ] If validation passes, show loading state on [element]
- [ ] API endpoint `[METHOD] [PATH]` is called with correct payload structure
- [ ] Backend validates user has `[permission]` and may act on this record
- [ ] Backend creates/updates/deletes record in `[table]` with status `[status]`
- [ ] Success response returns expected data
- [ ] Frontend shows success feedback: "[SUCCESS MESSAGE]"
- [ ] User is redirected to [SPECIFY REDIRECT] (or stays on page)
- [ ] If API fails, show error feedback: "[ERROR MESSAGE]"
- [ ] [Optional] Background job / email / integration triggered for [PURPOSE]
- [ ] [Optional] Audit log created with user ID, timestamp, and action

---

### TESTING CHECKLIST

#### Unit Tests (Backend)
- [ ] Request schema rejects missing required fields
- [ ] Request schema accepts valid payload
- [ ] Service layer performs operation with correct data
- [ ] Service layer throws error if user lacks permissions
- [ ] Service layer rejects records the user does not own
- [ ] Service layer handles database errors gracefully

#### Unit Tests (Frontend)
- [ ] Form validation triggers on empty required fields
- [ ] Form validation passes with complete data
- [ ] UI element shows loading state during API call
- [ ] Success feedback appears on successful operation
- [ ] Error feedback appears on API failure

#### Integration Tests
- [ ] End-to-end: User with permissions can complete action successfully
- [ ] End-to-end: User without permissions cannot access/receives 403
- [ ] End-to-end: Invalid data is rejected

#### Manual Testing Scenarios
- [ ] **Positive:** Complete valid flow -> verify result in DB -> verify UI feedback
- [ ] **Negative:** Leave required field empty -> verify error message appears
- [ ] **Permissions:** Login as user without required permission -> verify behavior
- [ ] **Ownership:** Attempt action on another owner's record -> verify rejection
- [ ] **Network:** Simulate API timeout -> verify error handling
- [ ] **Duplicate:** Try conflicting operation -> verify expected behavior
- [ ] **Mobile:** Test on mobile device -> verify responsive behavior

---

### ASSUMPTIONS & RISKS

**Assumptions (document these if not clarified):**
- [List all assumptions made due to missing information]
- [Each assumption should be specific and actionable]

**Technical Risks:**
- HIGH: [Risk description and impact]
- MEDIUM: [Risk description and impact]
- LOW: [Risk description and impact]

**Business Risks:**
- [Risk description and impact]

---

### COMMUNICATION TEMPLATE (Send to PO/Team)

```
Hi [Product Owner Name],

I'm working on [TICKET-ID] and need clarification on the following points before implementation:

**Critical Questions:**
1. [Question 1 with options if applicable]
   - Option A: [description]
   - Option B: [description]

2. [Question 2]

3. [Question 3]

**Assumptions I'll proceed with if no response in 24 hours:**
- [Assumption 1]
- [Assumption 2]

This will help avoid bugs and rework. Please confirm by [DATE/TIME].

Thanks!
```

---

### DECISION LOG

```markdown
## [TICKET-ID]: [Task Title]

**Date:** [Today's date]
**Analyst:** Claude Agent
**Developer:** [Developer name]

**Decisions Made:**
- [Decision 1 and rationale]
- [Decision 2 and rationale]

**Pending Clarifications:**
- [Question 1] - Waiting for PO response
- [Question 2] - Assumed [X] for now

**Rollback Plan:**
- If issues arise in production: [describe rollback steps]
```
