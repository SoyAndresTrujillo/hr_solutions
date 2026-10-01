# Facade Design Pattern

## Intent

"**Facade** is a structural design pattern that provides a simplified interface to a library, a framework, or any other complex set of classes."

## Problem

Complex libraries and frameworks require developers to initialize numerous objects, manage dependencies, and execute methods in precise order. This creates tight coupling between business logic and third-party implementation details, making code difficult to understand and maintain.

## Solution

A facade class offers a streamlined interface to a sophisticated subsystem containing many components. While it may provide fewer capabilities than direct subsystem access, it exposes only the functionality clients genuinely require.

Example use case: "an app that uploads short funny videos with cats to social media could potentially use a professional video conversion library." Rather than exposing all features, a facade provides a single `encode(filename, format)` method.

## Real-World Analogy

When ordering by phone at a shop, the operator functions as a facade—providing "a simple voice interface to the ordering system, payment gateways, and various delivery services" while hiding internal complexity.

## Structure

### Components and Roles

1. **Facade**: Provides convenient access to subsystem functionality; routes client requests appropriately and operates all moving parts.

2. **Additional Facade**: Prevents a single facade from becoming overly complex by separating unrelated features; can serve both clients and other facades.

3. **Complex Subsystem**: Comprises numerous objects requiring deep implementation knowledge. "Subsystem classes aren't aware of the facade's existence. They operate within the system and work with each other directly."

4. **Client**: Interacts with the facade rather than subsystem objects directly.

## Pseudocode Summary

The example demonstrates a `VideoConverter` facade encapsulating video conversion framework complexity. Instead of clients directly managing `VideoFile`, codec extraction, compression selection, bitrate reading, and audio mixing, they invoke a single `convert(filename, format)` method. This approach isolates dependencies and simplifies framework upgrades.

## Applicability

**Use the Facade pattern when:**

- You need "a limited but straightforward interface to a complex subsystem"
- Subsystems grow increasingly complex over time, demanding more configuration and boilerplate code
- You want to "structure a subsystem into layers" by creating facades as entry points for each level, reducing coupling between multiple subsystems

## How to Implement

1. Verify whether a simpler interface than the existing subsystem is achievable; assess if it makes client code independent from many subsystem classes.
2. Declare and implement the interface in a new facade class, redirecting client calls to appropriate subsystem objects and managing initialization and lifecycle.
3. Ensure all client code communicates with the subsystem exclusively through the facade, protecting against subsystem changes.
4. If the facade grows too large, extract behavior into additional refined facade classes.

## Pros and Cons

**Advantages:**
- "You can isolate your code from the complexity of a subsystem."

**Disadvantages:**
- "A facade can become a god object coupled to all classes of an app."

## Relations with Other Patterns

- **Facade vs. Adapter**: Facade defines new interfaces for existing objects; Adapter makes existing interfaces usable. Adapter typically wraps one object; Facade manages entire subsystems.
- **Facade vs. Abstract Factory**: Abstract Factory can substitute for Facade when hiding object creation is the primary goal.
- **Facade vs. Flyweight**: Flyweight creates numerous small objects; Facade creates a single object representing an entire subsystem.
- **Facade vs. Mediator**: Both organize collaboration among tightly coupled classes. Facade simplifies subsystem interfaces without introducing new functionality; Mediator centralizes component communication.
- **Facade vs. Singleton**: A facade can often become a Singleton since one instance typically suffices.
- **Facade vs. Proxy**: Both buffer complex entities and initialize independently. Unlike Proxy, which shares its service object's interface, Facade maintains a different interface.

Source: https://refactoring.guru/design-patterns/facade
