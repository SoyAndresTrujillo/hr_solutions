# Singleton Design Pattern

## Intent

"**Singleton** is a creational design pattern that lets you ensure that a class has only one instance, while providing a global access point to this instance."

## Problem

The pattern addresses two interconnected challenges:

1. **Single Instance Control**: Restrict a class to create only one object, typically for managing access to shared resources like databases or files. Regular constructors cannot enforce this constraint since they must always return new instances.

2. **Global Access Point**: Provide safe, centralized access to that single instance. Unlike global variables—which any code can overwrite and corrupt—the Singleton protects its instance from being replaced while still offering program-wide accessibility.

The documentation notes this approach violates the Single Responsibility Principle by solving two problems simultaneously.

## Solution

All Singleton implementations follow a two-step approach:

- Create a private constructor to prevent external object instantiation via the `new` operator
- Implement a static creation method that calls the private constructor once, caches the result, and returns the cached instance on all subsequent calls

## Real-World Analogy

"The government is an excellent example of the Singleton pattern. A country can have only one official government... the title, 'The Government of X', is a global point of access."

## Structure

**Key Component:**

The **Singleton** class contains:
- A static method `getInstance()` returning the same class instance
- A hidden constructor inaccessible to client code
- Business logic methods executed on the singleton instance

## Pseudocode Summary

A `Database` class demonstrates the pattern:

```
- Private static field stores the singleton instance
- Private constructor prevents direct instantiation
- Static getInstance() method implements lazy initialization
  with thread-locking to ensure single instance creation
- Business methods (like query) execute on the singleton
```

## Applicability

Use Singleton when:

- "A class in your program should have just a single instance available to all clients" (databases, configuration managers)
- You need stricter control over global variables than traditional approaches offer
- You want to guarantee only one instance exists, with the ability to adjust this limitation later

## How to Implement

1. Add a private static field for storing the singleton instance
2. Declare a public static creation method for retrieving it
3. Implement lazy initialization within the static method—create the object on first call, return the cached instance thereafter
4. Make the class constructor private
5. Replace all direct constructor calls in client code with static method calls

## Pros and Cons

**Advantages:**
- Guarantees a class has only one instance
- Offers a global access point to that instance
- Initializes the singleton object only when first requested

**Disadvantages:**
- Violates the Single Responsibility Principle
- Can mask problematic design where components are overly interdependent
- Requires special handling in multithreaded environments
- Complicates unit testing since constructors are private and static method overriding is typically impossible

## Relations with Other Patterns

- **Facade** frequently transforms into Singleton since one facade object suffices
- **Flyweight** resembles Singleton but differs: Flyweight permits multiple instances with varying intrinsic states, while Singletons have exactly one mutable instance
- **Abstract Factory, Builder, and Prototype** can all be implemented as Singletons

Source: https://refactoring.guru/design-patterns/singleton
