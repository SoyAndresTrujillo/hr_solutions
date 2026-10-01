# Adapter Design Pattern

## Intent

The Adapter is a structural design pattern that enables objects with incompatible interfaces to work together by converting one object's interface into another that clients expect.

## Problem

When integrating incompatible components—such as a stock monitoring app needing to use a third-party analytics library that expects JSON while the app uses XML—you face a dilemma. You cannot modify the library's source code, and changing your app's format risks breaking existing functionality.

## Solution

An adapter serves as a translator between incompatible interfaces. It wraps one object to hide conversion complexity, implementing the interface expected by one component while delegating calls to the incompatible component in its native format. The wrapped object remains unaware of the adapter's presence.

## Real-World Analogy

Consider traveling internationally: a US electrical plug won't fit a European socket. A power adapter solves this by presenting an American-style socket while offering a European-style plug—enabling devices to work across different standards.

## Structure

### Object Adapter (Composition-Based)

**Components:**
- **Client**: Contains existing business logic
- **Client Interface**: Protocol other classes must follow
- **Service**: Useful but incompatible class (often third-party or legacy)
- **Adapter**: Implements the client interface while wrapping the service object; receives calls and translates them into formats the service understands

**Key advantage**: New adapter types can be introduced without modifying client code.

### Class Adapter (Inheritance-Based)

**Components:**
- **Class Adapter**: Inherits interfaces from both client and service simultaneously (requires multiple inheritance support)

**Key advantage**: No wrapping needed; adaptation occurs in overridden methods.

## Pseudocode Summary

The example illustrates adapting square pegs to round holes. A `SquarePegAdapter` extends `RoundPeg`, wrapping a `SquarePeg` internally. Its `getRadius()` method converts the square's width to an equivalent circular radius, allowing incompatible objects to interact seamlessly through a common interface.

## Applicability

**Use when:**

1. You need existing classes with incompatible interfaces to collaborate
2. Reusing subclasses lacking common functionality that cannot be added to the superclass (avoiding code duplication)
3. You want to create a middle layer translating between your code and legacy or third-party components

## How to Implement

1. Identify at least two classes with incompatible interfaces—an unchangeable service and client classes needing its functionality
2. Declare the client interface describing expected communication
3. Create an adapter class implementing the client interface with empty methods initially
4. Add a field storing a reference to the service object (typically initialized via constructor)
5. Implement all client interface methods, delegating work to the service while handling conversion
6. Have clients use the adapter through the client interface, enabling future changes without affecting existing code

## Pros and Cons

### Advantages
- **Single Responsibility Principle**: Separates interface conversion from primary business logic
- **Open/Closed Principle**: New adapters can be introduced without breaking existing client code when using the client interface

### Disadvantages
- Overall code complexity increases due to new interfaces and classes
- Sometimes simpler to modify the service class directly

## Relations with Other Patterns

| Pattern | Relationship |
|---------|--------------|
| **Bridge** | Usually designed upfront; Adapter retrofits existing apps |
| **Decorator** | Adapter provides entirely different interfaces; Decorator extends or maintains existing ones |
| **Proxy** | Adapter changes interfaces; Proxy maintains the same interface |
| **Facade** | Adapter makes existing interfaces usable; Facade defines new interfaces for subsystems |
| **Strategy/State** | Similar composition-based structures but solve different problems |

Source: https://refactoring.guru/design-patterns/adapter
