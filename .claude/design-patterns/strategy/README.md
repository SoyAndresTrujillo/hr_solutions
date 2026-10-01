# Strategy Pattern

## Intent

The Strategy pattern is a behavioral design pattern that enables you to "define a family of algorithms, put each of them into a separate class, and make their objects interchangeable."

## Problem

The pattern addresses situations where a class implements multiple variants of an algorithm using massive conditional statements. In the navigation app example, adding routing algorithms (driving, walking, public transit, cycling, attractions) caused the main navigator class to become bloated and difficult to maintain. Each addition increased complexity, making bug fixes risky and team collaboration inefficient due to merge conflicts.

## Solution

Rather than embedding multiple algorithms within a single class, extract each algorithm into separate strategy classes. The original class (context) maintains a reference to one strategy and delegates work through a common interface. The client selects which strategy to use, allowing runtime algorithm switching without modifying the context or other strategies. This approach honors the Open/Closed Principle by enabling new algorithms without changing existing code.

## Real-World Analogy

Consider transportation to an airport. You might catch a bus, order a cab, or cycle based on budget and time constraints. Each represents a different strategy for achieving the same goal using distinct approaches.

## Structure

The pattern consists of five components:

1. **Context**: Maintains a reference to a concrete strategy and communicates exclusively through the strategy interface
2. **Strategy Interface**: Declares the method that all concrete strategies must implement
3. **Concrete Strategies**: Provide different algorithm implementations
4. **Execution**: The context calls the strategy's execution method when needed
5. **Client**: Creates specific strategy objects and passes them to the context via a setter, enabling runtime replacement

## Pseudocode Summary

A basic implementation involves:
- A Strategy interface with an `execute()` method
- Concrete strategy classes (ConcreteStrategyAdd, ConcreteStrategySubtract, ConcreteStrategyMultiply) implementing the interface
- A Context class holding a strategy reference with a `setStrategy()` method
- Client code selecting strategies based on user input and delegating execution to the context

## Applicability

Use Strategy when you need to:

- Employ different algorithm variants within an object with runtime switching capability
- Reduce code duplication across similar classes that differ only in execution behavior
- Isolate business logic from algorithm implementation details
- Replace massive conditional statements that select between algorithm variants with a cleaner, more maintainable approach

## How to Implement

1. Identify algorithms prone to frequent changes or massive conditionals selecting algorithm variants
2. Declare a strategy interface common to all algorithm variants
3. Extract each algorithm into its own class implementing the interface
4. Add a strategy field to the context class with a setter for replacement
5. Ensure the context interacts with strategies only through the interface
6. Have clients associate appropriate strategies matching their execution expectations

## Pros and Cons

**Advantages:**
- Runtime algorithm swapping within objects
- Implementation isolation from client code
- Composition replaces inheritance
- Open/Closed Principle compliance for introducing new strategies

**Disadvantages:**
- Unnecessary complexity for programs with few, stable algorithms
- Client code must understand strategy differences for proper selection
- Modern functional languages may achieve similar results with anonymous functions, reducing the pattern's value

## Relations with Other Patterns

- **Bridge, State, Adapter**: Similar composition-based structures solving different problems
- **Command**: Both parameterize objects; Command converts operations to objects with deferred execution, while Strategy describes interchangeable algorithm approaches
- **Decorator vs. Strategy**: Decorator modifies object appearance; Strategy modifies internal behavior
- **Template Method vs. Strategy**: Template Method uses inheritance (static); Strategy uses composition (dynamic runtime switching)
- **State**: Extends Strategy by allowing concrete states to alter context state, creating interdependencies unlike Strategy's independent strategies

Source: https://refactoring.guru/design-patterns/strategy
