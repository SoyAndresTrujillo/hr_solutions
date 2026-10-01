# Observer Design Pattern

## Intent

The Observer pattern enables objects to establish a subscription mechanism where multiple entities can be notified about state changes in another object. It's also known as Event-Subscriber or Listener.

## Problem

Consider a scenario with a `Customer` and a `Store`. The customer wants updates about a specific product, but has two inefficient options:

1. Visit the store repeatedly to check availability (wasteful customer time)
2. Receive constant notifications about all products (unwanted spam)

This creates a conflict between customer effort and store resource waste.

## Solution

The pattern introduces a **publisher** (the object with interesting state) and **subscribers** (objects tracking changes). The publisher maintains:

- An array storing subscriber references
- Public methods for adding/removing subscribers

When important events occur, the publisher iterates through subscribers and invokes notification methods. Crucially, all subscribers implement a common interface, preventing tight coupling between the publisher and specific subscriber classes.

## Real-World Analogy

Magazine and newspaper subscriptions exemplify this pattern: subscribers no longer visit stores checking for new issues. Instead, publishers automatically mail new issues directly to subscribers' homes, while maintaining a list of interested parties who can unsubscribe anytime.

## Structure

The pattern comprises six key components:

1. **Publisher**: Issues events and manages subscription infrastructure allowing subscribers to join/leave
2. **Notification Mechanism**: Publisher invokes notification methods on each subscriber from its list
3. **Subscriber Interface**: Declares the notification method (typically `update`) with parameters for event details
4. **Concrete Subscribers**: Implement the subscriber interface, responding to publisher notifications
5. **Context Data**: Publishers pass event information as method arguments or pass themselves as references
6. **Client**: Creates publisher and subscriber objects, registering subscribers with publishers

## Pseudocode Summary

An `EventManager` base class manages subscription lists and notifications:

```
class EventManager:
    - subscribe(eventType, listener)
    - unsubscribe(eventType, listener)
    - notify(eventType, data)
```

Concrete publishers like `Editor` delegate subscription logic to EventManager and trigger notifications on file operations. Concrete subscribers like `LoggingListener` and `EmailAlertsListener` implement `EventListener` interface methods, performing actions upon receiving updates.

## Applicability

Use Observer when:

- State changes in one object require updating others, but the affected objects are unknown beforehand or change dynamically
- Working with GUI frameworks where custom buttons need custom code execution on user interaction
- Some objects must observe others temporarily or conditionally, requiring dynamic subscription/unsubscription

## How to Implement

1. Separate business logic into core functionality (publisher) and dependent code (subscribers)
2. Declare the subscriber interface with an `update` method
3. Declare publisher interface with subscription management methods
4. Implement subscription lists in an abstract publisher class or via composition
5. Create concrete publishers that notify subscribers when important events occur
6. Implement update notification methods in concrete subscribers, receiving context via parameters
7. Client instantiates publishers and subscribers, registering subscribers appropriately

## Pros and Cons

**Advantages:**
- Satisfies Open/Closed Principle—new subscribers integrate without modifying publisher code
- Establishes object relationships at runtime

**Disadvantages:**
- Subscribers receive notifications in unpredictable order

## Relations with Other Patterns

Observer contrasts with related patterns addressing sender-receiver connections:

- **Chain of Responsibility**: Passes requests sequentially along potential handlers
- **Command**: Creates unidirectional sender-receiver connections
- **Mediator**: Eliminates direct connections via an intermediary object
- **Observer**: Enables dynamic subscription/unsubscription

Observer and Mediator frequently overlap. Mediator's primary goal is eliminating component dependencies through a central object, while Observer establishes dynamic one-way connections. Mediator can be implemented using Observer, though other approaches exist.

Source: https://refactoring.guru/design-patterns/observer
