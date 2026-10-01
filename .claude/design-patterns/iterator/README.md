# Iterator Design Pattern

## Intent

The Iterator pattern enables traversal through collection elements while concealing the underlying data structure. As stated in the source: *"lets you traverse elements of a collection without exposing its underlying representation"*.

## Problem

Collections exist in many forms—lists, stacks, trees, graphs—but each requires different traversal methods. The core challenge involves balancing two concerns:

1. **Collection complexity**: Adding multiple traversal algorithms directly to collection classes blurs their primary purpose of efficient data storage
2. **Client coupling**: Client code becomes tightly bound to specific collection implementations, making it difficult to work with various data structures uniformly

The source notes: *"adding more and more traversal algorithms to the collection gradually blurs its primary responsibility"*.

## Solution

Extract traversal behavior into separate iterator objects. This approach:

- Encapsulates traversal details (current position, remaining elements)
- Allows multiple iterators to traverse the same collection independently
- Provides a uniform interface so clients remain decoupled from concrete implementations

As the source explains: *"the main idea of the Iterator pattern is to extract the traversal behavior of a collection into a separate object called an iterator"*.

## Real-World Analogy

The pattern mirrors touring Rome through different approaches: wandering randomly, using a smartphone GPS app, or hiring a local guide. Each represents a different traversal "iterator" through the same collection of sights.

## Structure

The pattern comprises five components:

1. **Iterator Interface**: Declares operations for traversal (next element, current position, restart, etc.)
2. **Concrete Iterators**: Implement specific traversal algorithms and maintain iteration state independently
3. **Collection Interface**: Declares methods for obtaining compatible iterators; return types use the iterator interface
4. **Concrete Collections**: Return new iterator instances tailored to their data structure
5. **Client**: Works exclusively through collection and iterator interfaces, remaining decoupled from concrete classes

## Pseudocode Summary

The example demonstrates a Facebook social network collection with multiple iterator types (friends, coworkers). The `FacebookIterator` class maintains traversal state through `currentPosition` and `cache`, while the client (`SocialSpammer`) remains agnostic to implementation details.

Key aspects:
- Lazy initialization of cached data
- Independent iteration state per iterator
- Standardized interface enabling runtime iterator substitution

## Applicability

Use Iterator when:

1. **Hidden complexity**: Collections have complex internal structures requiring abstraction from clients
2. **Code duplication**: Multiple parts of your application contain similar traversal logic that should be consolidated
3. **Unknown structures beforehand**: Your code must handle various collection types uniformly without knowing their specifics in advance

The source notes: *"when you want your code to be able to traverse different data structures or when types of these structures are unknown beforehand"*.

## How to Implement

1. Define the iterator interface with methods for accessing next elements and checking iteration completion
2. Declare the collection interface with methods returning iterator instances (using the iterator interface as return type)
3. Implement concrete iterators for each traversable collection, establishing links to their source collection via constructor
4. Update collection classes to implement the collection interface, providing factory methods for creating iterators
5. Replace all direct traversal code in client logic with iterator-based approaches

## Pros and Cons

### Advantages

- **Single Responsibility Principle**: Separates traversal logic from collections and client code
- **Open/Closed Principle**: Add new collection and iterator types without modifying existing code
- **Parallel iteration**: Multiple independent iterators can traverse the same collection simultaneously
- **Deferred execution**: Iteration can be paused and resumed as needed

### Disadvantages

- **Unnecessary complexity**: Applying the pattern to simple collections creates architectural overhead
- **Performance trade-offs**: Iterator-based traversal may underperform direct element access in specialized collections

## Relations with Other Patterns

- **Composite + Iterator**: Navigate hierarchical tree structures
- **Factory Method + Iterator**: Enable collection subclasses to return compatible iterator types
- **Memento + Iterator**: Capture and restore iteration state
- **Visitor + Iterator**: Execute operations across complex structures with heterogeneous element types

Source: https://refactoring.guru/design-patterns/iterator
