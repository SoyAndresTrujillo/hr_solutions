# Abstract Factory Design Pattern

## Intent

"**Abstract Factory** is a creational design pattern that lets you produce families of related objects without specifying their concrete classes."

This pattern solves the challenge of creating coordinated sets of objects that work together harmoniously.

## Problem

The pattern addresses scenarios where systems need to handle multiple families of related products with different variants. Using a furniture shop simulator as an example: you have product families (Chair, Sofa, CoffeeTable) available in variants (Modern, Victorian, ArtDeco). The core challenge is ensuring customers receive matching furniture sets without modifying code when new product families or variants appear.

## Solution

The solution involves two key architectural layers:

**Product Interface Layer:** Declare interfaces for each distinct product type (Chair, Sofa, CoffeeTable). All variants must implement these interfaces, allowing interchangeable products.

**Factory Pattern Layer:** Create an abstract factory interface defining creation methods for all product family members. Implement concrete factory classes—one per variant—that return abstract product types while internally instantiating concrete implementations.

The client code operates exclusively through abstract interfaces, enabling factory and product variant changes without affecting client logic.

## Real-World Analogy

Cross-platform UI applications demonstrate this pattern effectively. An application detects the operating system at initialization and instantiates the matching factory (WinFactory or MacFactory). Buttons and checkboxes render consistently with the detected platform, preventing Windows controls from appearing in macOS environments.

## Structure

### Components and Roles

1. **Abstract Products:** Interface declarations for related product sets within a family
2. **Concrete Products:** Multiple implementations grouped by variant; each abstract product appears in all given variants
3. **Abstract Factory:** Interface specifying creation methods for all abstract products
4. **Concrete Factories:** Implementations corresponding to specific product variants; each produces only its variant's products
5. **Client:** Works exclusively with abstract types, remaining decoupled from concrete implementations

## Pseudocode Summary

```
GUIFactory interface defines:
  - createButton(): Button
  - createCheckbox(): Checkbox

WinFactory implements GUIFactory:
  - createButton() returns WinButton
  - createCheckbox() returns WinCheckbox

MacFactory implements GUIFactory:
  - createButton() returns MacButton
  - createCheckbox() returns MacCheckbox

Application receives factory during initialization,
uses it to create UI elements matching the platform
```

## Applicability

**Use Abstract Factory when:**

- Your code requires working with various product families but shouldn't depend on concrete classes
- Product types are unknown beforehand or future extensibility matters
- A class contains multiple Factory Methods blurring its primary responsibility
- You want ensuring products from the same factory variant are mutually compatible

The pattern prevents creating incompatible product combinations, providing a clean contract through abstract interfaces.

## How to Implement

1. Create a matrix mapping product types against variant categories
2. Design abstract product interfaces for all types; implement these in concrete product classes grouped by variant
3. Declare the abstract factory interface with creation methods for each abstract product
4. Implement concrete factory classes corresponding to each product variant
5. Establish factory initialization code selecting the appropriate concrete factory based on configuration or environment
6. Replace direct constructor calls with factory creation method invocations throughout the codebase

## Pros and Cons

### Advantages

- "You can be sure that the products you're getting from a factory are compatible with each other."
- Decouples concrete product classes from client code
- Centralizes product creation, improving maintainability
- "You can introduce new variants of products without breaking existing client code" (Open/Closed Principle)

### Disadvantages

- Introduces numerous interfaces and classes, potentially overcomplicating code architecture
- Significant overhead for simple scenarios with few product families or variants

## Relations with Other Patterns

- **Factory Method:** Often serves as the initial approach before evolving toward Abstract Factory for greater flexibility
- **Builder:** While Builder handles complex multi-step construction, Abstract Factory immediately returns complete product families
- **Prototype:** Can compose Abstract Factory methods
- **Facade:** Abstract Factory provides an alternative for hiding subsystem object creation
- **Bridge:** Pairs effectively when Bridge abstractions require specific implementations; Abstract Factory encapsulates these relationships
- **Singleton:** Abstract Factories, Builders, and Prototypes commonly implement Singleton patterns

Source: https://refactoring.guru/design-patterns/abstract-factory
