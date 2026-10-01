# Chain of Responsibility Design Pattern

## Intent

The Chain of Responsibility is a behavioral design pattern that enables passing requests through a chain of handlers. Each handler evaluates whether to process the request or forward it to the next handler in the sequence.

## Problem

In an online ordering system, multiple sequential validation checks become necessary—authentication, data sanitization, brute force protection, and caching. As more checks accumulate, the code becomes increasingly messy, difficult to maintain, and impossible to reuse across different system components without code duplication.

## Solution

Transform each check into a standalone handler object. Link these handlers into a chain where each maintains a reference to the next handler. Upon receiving a request, a handler decides whether to process it or pass it along the chain. Importantly, any handler can stop further propagation.

## Real-World Analogy

When calling technical support, your call passes through an automated system, then a general operator, and potentially an engineer. Each level either resolves your issue or escalates it to the next tier. This mirrors how requests travel through a chain of increasingly specialized handlers until one successfully addresses the problem.

## Structure

**Key Components:**

- **Handler Interface**: Declares the common method for all concrete handlers to process requests
- **Base Handler**: Optional class containing shared boilerplate code and a field referencing the next handler
- **Concrete Handlers**: Implement actual request-processing logic, deciding whether to handle and forward
- **Client**: Assembles chains (once or dynamically) and triggers handlers

## Pseudocode Summary

A GUI help system demonstrates the pattern. When users press F1, the request bubbles upward through container elements until finding one with appropriate help content. Components check for local help text; if unavailable, they delegate to their container.

```
interface ComponentWithContextualHelp shows showHelp()

abstract class Component implements interface shows:
  - Check for local tooltip text
  - Forward to container if unavailable

abstract class Container extends Component shows:
  - Manage child components
  - Inherit help behavior

class Dialog/Panel/Button extend accordingly with specialized help
```

## Applicability

Use this pattern when:

- Processing different request types through various handlers with unknown sequences beforehand
- Multiple handlers must execute in a specific order
- Handler sets and ordering require runtime modification

## How to Implement

1. Define the handler interface with a request-handling method signature
2. Create an abstract base handler class with a next-handler reference field and optional setters
3. Implement concrete handler subclasses; each decides whether to process and whether to forward
4. Build chains either statically or dynamically through client configuration
5. Recognize that requests may originate from any chain position, not necessarily the first handler
6. Account for scenarios where chains contain single links or requests remain unhandled

## Pros and Cons

**Advantages:**
- "You can control the order of request handling"
- Separates invoking operations from performing them (Single Responsibility)
- Introduces new handlers without modifying existing client code (Open/Closed)

**Disadvantages:**
- Some requests may never reach a handler and go unprocessed

## Relations with Other Patterns

- **Command, Mediator, Observer**: All address sender-receiver connections differently; Chain passes requests sequentially until handled
- **Composite**: Often used together, allowing leaf components to escalate requests through parent chains
- **Decorator**: Similar structure but differs fundamentally—decorators extend behavior consistently while handlers can stop propagation
- **Commands as Handlers**: Handlers can execute different operations over the same context, or requests themselves become Command objects

Source: https://refactoring.guru/design-patterns/chain-of-responsibility
