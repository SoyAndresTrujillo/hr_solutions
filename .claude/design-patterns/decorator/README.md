# Decorator Pattern

## Intent

The Decorator pattern is a structural design approach that enables attaching fresh capabilities to objects by encapsulating them within specialized wrapper objects containing those behaviors.

## Problem

A notification library initially supported email-only notifications through a basic `Notifier` class. As user requirements expanded to include SMS, Facebook, and Slack notifications, creating subclasses for each type—and combinations thereof—created a combinatorial explosion of classes that became unmaintainable.

The core issue: inheritance is static and single-parent, preventing runtime behavior modification and multiple simultaneous notification types.

## Solution

Rather than inheritance, employ composition or aggregation. A wrapper object holds a reference to a target object, implements the same interface, and delegates requests while potentially modifying behavior before or after delegation.

"A wrapper is an object that can be linked with some target object. The wrapper contains the same set of methods as the target and delegates to it all requests it receives."

Multiple wrappers can stack around a base object, enabling combined behaviors without class explosion.

## Real-World Analogy

Layering clothing demonstrates decoration: wearing a sweater, then a jacket, then a raincoat adds warmth and weatherproofing without being part of you. Each garment wraps the previous layer.

## Structure

**Five key components:**

1. **Component** – Common interface for wrappers and wrapped objects
2. **Concrete Component** – Base class defining fundamental behavior
3. **Base Decorator** – References wrapped objects (typed as Component interface); delegates all operations
4. **Concrete Decorators** – Execute additional behaviors before/after calling parent methods
5. **Client** – Creates and composes multiple decorator layers

## Pseudocode Summary

The provided example demonstrates encryption and compression decorators wrapping a `FileDataSource`:

- `DataSource` interface defines `writeData()` and `readData()`
- `FileDataSource` implements basic disk operations
- `DataSourceDecorator` holds a wrapped component reference
- `EncryptionDecorator` and `CompressionDecorator` extend the base, adding transformation logic
- Client stacks decorators: `Encryption > Compression > FileDataSource`

## Applicability

Use Decorator when you must:

- "assign extra behaviors to objects at runtime without breaking the code that uses these objects"
- Structure business logic into runtime-composable layers
- Extend behavior when inheritance is unavailable (final classes, single-parent limitation)

## How to Implement

1. Identify the primary component and optional enhancement layers in your domain
2. Create a component interface capturing common methods
3. Build a concrete component with base behavior
4. Design a base decorator storing wrapped object references (typed as component interface)
5. Ensure all classes implement the component interface
6. Implement concrete decorators extending the base, executing behavior before/after parent calls
7. Let client code manage decorator composition and arrangement

## Pros and Cons

**Advantages:**
- Extend behavior without creating subclasses
- Add/remove responsibilities dynamically at runtime
- Combine multiple behaviors via layered wrapping
- Supports Single Responsibility Principle by dividing monolithic classes

**Disadvantages:**
- Difficult removing specific wrappers from stacks
- Behavior ordering dependencies between decorators
- Initial configuration code can appear unwieldy

## Relations with Other Patterns

- **Adapter** provides different interfaces; Decorator maintains/extends existing interfaces and supports recursive composition
- **Proxy** maintains interface consistency but manages service object lifecycles; Decorator composition is client-controlled
- **Chain of Responsibility** resembles Decorator structurally but CoR handlers stop propagation independently; Decorators maintain flow
- **Composite** structures tree hierarchies; Decorator wraps single objects (though both support recursive composition)
- **Prototype** benefits designs mixing Composite/Decorator by enabling deep cloning
- **Strategy** changes internal algorithm; Decorator changes object skin
- **Decorator** alters behavior; **Facade** simplifies access to complex subsystems

Source: https://refactoring.guru/design-patterns/decorator
