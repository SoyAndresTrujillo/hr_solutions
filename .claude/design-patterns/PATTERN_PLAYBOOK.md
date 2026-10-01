# Pattern Playbook — Node API + React (Vite)

**For agents and skills.** A decision guide for new code or local cleanup, not a refactor plan. Each
pattern links to its explainer under `.claude/design-patterns/<pattern>/README.md`.

## How to use

1. Identify the layer: architecture / API / web / database.
2. Find the trigger matching what you are about to write.
3. Apply the listed pattern and read its explainer.
4. Guardrails override pattern choice.
5. No listed pattern fits → reuse-first → only then propose a new one (`_shared/reuse-audit.md`).

Reverse lookup ("I see smell X") → **Smell Index**.

## Global guardrails

| Rule | Constrains |
|---|---|
| No `if (customer === 'X')` / `if (role === 'Y')` in business code — route via `CLAUDE.md` §Customization | Strategies are selected by flag or capability, never by a name |
| Stay inside the ticket's scope (team-rules §S1) | No cross-module abstractions extracted on the side; flag and stop |
| Never write the same logic twice (team-rules §B4) | Extract on the second copy — but no pattern wrapper around a single use site |
| No `any` / `unknown` casts | Strategy / Adapter / Facade interfaces typed end to end |
| Every data read respects the ownership filter (team-rules §S8) | Repositories apply it; callers cannot forget it |

## 1. Architecture (cross-cutting)

| Trigger | Pattern | Notes |
|---|---|---|
| Checks run in fixed order, any can short-circuit (auth, validation, rate limit) | **Chain of Responsibility** | Express middleware chain is already one — add a middleware, don't nest ifs |
| Many call sites composing the same subsystem calls | **Facade** | One module service as the entry point |
| Behavior varies by feature flag or plan | **Strategy** (flag-axis) | One strategy per behavior axis, not per customer |
| Cross-cutting concern on an existing function (logging, retry, caching) | **Decorator** | Wrap, don't edit the target |

Avoid: DI containers and service locators before there are two implementations of anything.

## 2. API (Express / Node)

| Trigger | Pattern | Notes |
|---|---|---|
| Same `try/catch` + response shaping in every controller | **Template Method** via one `asyncHandler` + error middleware | Already the stack default |
| Status-driven branching repeated across service methods | **State** | One object per status with the allowed transitions |
| Third-party API (email, payments, storage) | **Adapter** | Service depends on our interface; the SDK stays inside the adapter |
| Long object construction with optional parts (reports, exports) | **Builder** | |
| Work that must run later or be retried | **Command** | Serializable payload + one handler |

Avoid: class hierarchies for controllers; generic base repositories before three repositories repeat.

## 3. Web (React)

| Trigger | Pattern | Notes |
|---|---|---|
| Components calling fetch / repeating loading-error state | **Facade** as a data hook `use<Thing>()` | Components get data + states, nothing else |
| Same wrapper UI around many pages (layout, guard, error boundary) | **Decorator** as a wrapper component | Not HOC chains more than one deep |
| Tree of UI parts with shared behavior (menus, form sections) | **Composite** | |
| Form or widget varies by flag | **Strategy** — a map of flag → component | Never an inline name check |
| Cross-component notifications | **Observer** via context or the state library | Don't add a global event bus |

Avoid: global state for server data (use the data hooks); prop-drilling more than two levels (context).

## 4. Database

| Trigger | Pattern | Notes |
|---|---|---|
| Service coupled to the ORM, hard to test | **Adapter** (repository) | Services never import the ORM client |
| Ownership filter could be forgotten | **Proxy** (scoped repository) | The filter is applied inside the repository |
| Multi-step write that must be atomic | Unit of work = ORM transaction | Pass the transaction, don't open nested ones |

## Smell Index

| You see | Reach for | Layer |
|---|---|---|
| Service file > ~500 lines doing many things | **Facade** (split by concern) | API |
| `if (status === X) … else if (status === Y)` in several methods | **State** | API |
| Flag / plan / role checks chained inline | **Strategy** (flag-axis) | API / Web |
| 3+ identical try/catch or loading wrappers | **Template Method** / **Decorator** | API / Web |
| SDK calls spread across services | **Adapter** | API |
| Hard-to-test service importing the ORM | **Adapter** (repository) | Database |
| Adding logging/retry/cache to an existing function | **Decorator** / **Proxy** | Any |
| Deep component trees with shared behavior | **Composite** | Web |

## Not used (and why)

| Pattern | Reason |
|---|---|
| Abstract Factory, Bridge | Only when two product families / two implementations actually exist |
| Singleton | ES modules are already single-instance; export the instance |
| Iterator | Native iterators and async generators |
| Flyweight, Memento, Visitor, Mediator, Prototype | No trigger in a typical CRUD + workflow app; profile or justify first |

## When in doubt

Reuse the existing way (team-rules §B3). If nothing exists, write the plainest code that works and
name no pattern. A pattern is justified only by a trigger in this file.
