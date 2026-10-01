# Factory Method Pattern

## Intent

The Factory Method is described as "a creational design pattern that provides an interface for creating objects in a superclass, but allows subclasses to alter the type of objects that will be created."

## Problem

The pattern addresses a common challenge: when an application initially handles one type of object (like `Truck` transportation), adding new types (such as `Ship`) requires scattered code changes throughout the codebase. This tight coupling to concrete classes makes extensions difficult and introduces conditional logic scattered across the program.

## Solution

Rather than using the `new` operator directly, the pattern delegates object creation to a dedicated factory method. Subclasses override this method to return different product types, while maintaining a common interface. As explained: "Objects returned by a factory method are often referred to as products."

The key constraint is that "subclasses may return different types of products only if these products have a common base class or interface."

## Real-World Analogy

The documentation uses a cross-platform UI framework example where a base `Dialog` class declares an abstract method to create buttons. Concrete dialog subclasses (`WindowsDialog`, `WebDialog`) override this method to return platform-specific button implementations, while the base dialog logic remains unchanged.

## Structure

The pattern comprises four main components:

**Product**: Declares the common interface all concrete products must implement.

**Concrete Products**: Various implementations satisfying the product interface.

**Creator**: Declares the factory method returning product objects. The method can be abstract or provide default behavior.

**Concrete Creators**: Override the factory method to instantiate different product types. Notably, factory methods "doesn't have to create new instances all the time. It can also return existing objects from a cache, an object pool, or another source."

## Pseudocode Summary

The example demonstrates a `Dialog` base class with an abstract `createButton()` method. Subclasses like `WindowsDialog` and `WebDialog` implement this method differently. The `Button` interface defines common operations (`render()`, `onClick()`), with concrete implementations for each platform. Client code instantiates the appropriate dialog subclass based on configuration, then calls `dialog.render()` without knowing specific button types.

## Applicability

Use Factory Method when:

- You need to work with object types determined at runtime rather than compile time
- You want to decouple product construction from usage code
- Adding new product types should require minimal changes to existing code
- You're designing extensible libraries where users can override creation behavior
- You need to reuse expensive objects through pooling or caching instead of rebuilding them

## How to Implement

1. Ensure all products implement a common interface with relevant operations
2. Add an empty factory method to the creator class with return type matching the product interface
3. Replace direct constructor calls with factory method invocations throughout the codebase
4. Create creator subclasses for each product type, overriding the factory method
5. If many product types exist, consider reusing a parameter to control which product gets created
6. After extracting creation logic, make the base method abstract if empty or keep default behavior

## Pros and Cons

**Advantages:**
- Eliminates tight coupling between creators and concrete products
- Consolidates creation logic in one location, improving maintainability
- Enables adding new product types without breaking existing client code (Open/Closed Principle)

**Disadvantages:**
- Introduces additional subclasses, increasing code complexity
- Works best when extending existing class hierarchies rather than starting fresh

## Relations with Other Patterns

Factory Method frequently evolves into Abstract Factory, Prototype, or Builder patterns as requirements grow more complex. It differs from Abstract Factory in scope but can complement it. The pattern shares similarities with Template Method—Factory Method can serve as a step within a larger Template Method implementation. Prototype differs by not relying on inheritance, while Factory Method does. Iterator patterns can work alongside Factory Method for collection subclasses returning different iterator types.

Source: https://refactoring.guru/design-patterns/factory-method
