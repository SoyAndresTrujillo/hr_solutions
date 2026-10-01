# Mediator Design Pattern

## Intent

The Mediator is a behavioral design pattern enabling objects to reduce chaotic dependencies by restricting direct communication. Instead, components collaborate exclusively through a mediator object that coordinates their interactions.

## Problem

UI dialog systems exemplify the problem: form elements like checkboxes, text fields, and buttons become tightly coupled, creating complex interdependencies. As applications evolve, modifying one element risks breaking others. This tight coupling makes component reuse across different forms virtually impossible.

## Solution

Rather than allowing direct communication between components, the Mediator pattern channels all interactions through a dedicated mediator object. Components notify the mediator of events, which then determines appropriate responses and coordinates other components. This approach reduces dependencies to a single mediator class rather than numerous peer connections.

The mediator encapsulates the complex web of relationships, making components reusable by simply linking them with different mediator implementations.

## Real-World Analogy

"Aircraft pilots don't talk to each other directly when deciding who gets to land their plane next. All communication goes through the control tower." Pilots communicate with an air traffic controller rather than coordinating independently, preventing overwhelming complexity and safety hazards.

## Structure

**Four core components:**

1. **Components** - Classes containing business logic with mediator references; unaware of actual mediator implementations
2. **Mediator Interface** - Declares communication methods, typically a single notification method accepting context parameters
3. **Concrete Mediators** - Encapsulate component relationships, maintaining references and sometimes managing lifecycles
4. **Component Behavior** - Components only notify the mediator of events; they remain unaware of other components

Components send notifications without knowing which components will handle responses, and receivers don't identify senders.

## Pseudocode Summary

```
interface Mediator {
    notify(sender, event)
}

class AuthenticationDialog implements Mediator {
    // Stores component references
    notify(sender, event) {
        // Route events and coordinate components
    }
}

class Component {
    dialog: Mediator
    
    click() {
        dialog.notify(this, "click")
    }
}
```

Components communicate exclusively through mediator methods, not directly with peers.

## Applicability

**Use when:**

- Classes are tightly coupled, making modifications difficult without affecting others
- Component reuse requires independence from specific peer classes
- Creating numerous component subclasses to reuse behavior in different contexts becomes necessary

The pattern extracts all inter-class relationships into a separate mediator, isolating changes and enabling flexible component reuse across different applications.

## How to Implement

1. Identify tightly coupled class groups benefiting from greater independence
2. Declare the mediator interface with communication protocols (usually one notification method)
3. Implement concrete mediator classes, storing component references
4. Consider making mediators responsible for component creation/destruction
5. Components store mediator references, typically established in constructors
6. Modify components to call mediator notification methods instead of peer methods directly

## Pros and Cons

**Advantages:**
- Consolidates inter-component communications into a single location (Single Responsibility Principle)
- Enables new mediator introductions without component modifications (Open/Closed Principle)
- Reduces overall program coupling between components
- Facilitates individual component reuse

**Disadvantages:**
- Mediators risk evolving into "God Objects" managing excessive complexity over time

## Relations with Other Patterns

| Pattern | Distinction |
|---------|-------------|
| **Chain of Responsibility** | Passes requests sequentially through receiver chains |
| **Command** | Establishes unidirectional sender-receiver connections |
| **Mediator** | Eliminates direct sender-receiver connections via mediator |
| **Observer** | Enables dynamic receiver subscription and unsubscription |
| **Facade** | Simplifies subsystem interfaces without introducing new functionality; components may communicate directly |
| **Mediator** | Centralizes communication; components only interact via mediator |

Mediator and Observer can coexist—mediators can implement observer patterns—but Mediator emphasizes eliminating mutual dependencies while Observer establishes dynamic one-way connections.

Source: https://refactoring.guru/design-patterns/mediator
