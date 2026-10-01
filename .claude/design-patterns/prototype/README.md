# Prototype Design Pattern

## Intent

The Prototype pattern is a creational design pattern that enables copying existing objects without coupling code to their specific classes. Also known as "Clone."

## Problem

Creating exact object copies presents several challenges:

1. **Access Limitations**: Some object fields may be private and inaccessible from outside the object.
2. **Class Dependency**: Direct copying requires knowledge of the object's concrete class, creating unwanted dependencies.
3. **Interface Uncertainty**: When only an interface is known (not the concrete implementation), direct duplication becomes impossible.

## Solution

Rather than external copying, the Prototype pattern delegates cloning responsibility to the objects themselves. Key aspects:

- **Common Interface**: All cloneable objects implement a shared interface with a `clone()` method
- **Self-Aware Copying**: Each class implements its own cloning logic, handling private fields and complex scenarios
- **Pre-built Templates**: Create configured prototype instances and clone them instead of reconstructing from scratch
- **Polymorphic Cloning**: Code depends on the interface, not concrete classes

## Real-World Analogy

Mitotic cell division provides an apt comparison. When a cell divides, the original cell (prototype) actively participates in creating an identical copy. Industrial prototypes, by contrast, passively demonstrate manufacturing feasibility.

## Structure

### Basic Implementation

**Three core components:**

1. **Prototype Interface**: Declares the `clone()` method for all cloneable objects
2. **Concrete Prototype**: Implements cloning by copying field values and handling edge cases like circular references
3. **Client**: Produces copies via the prototype interface without knowing concrete types

### Prototype Registry Implementation

A **Prototype Registry** provides convenient access to frequently-used prototypes. Typically a name-to-prototype hash map (or more sophisticated search mechanism), it stores pre-configured objects ready for cloning.

## Pseudocode Summary

The provided example demonstrates cloning geometric shapes:

```
abstract class Shape implements clone()
  - Fields: X, Y, color
  - Prototype constructor accepts source Shape

class Rectangle extends Shape
  - Fields: width, height
  - clone() returns new Rectangle(this)

class Circle extends Shape
  - Field: radius
  - clone() returns new Circle(this)

Application:
  - Creates configured shapes
  - Clones them without knowing concrete types
  - Uses polymorphism to call appropriate clone methods
```

## Applicability

**Use Prototype when:**

- Code shouldn't depend on concrete object classes (especially with third-party objects via interfaces)
- Reducing subclass proliferation by using pre-configured prototypes instead of subclass variants
- Complex objects requiring laborious configuration benefit from cloning pre-built templates
- Objects passed through interfaces require duplication without type knowledge

## How to Implement

1. Create prototype interface with `clone()` method (or add to existing hierarchy)
2. Define alternative constructor accepting the same class, copying all field values
3. In subclasses, call parent constructor first to handle private field copying
4. Implement `clone()` using the new operator with the prototype constructor
5. Optionally create a centralized registry storing frequently-used prototypes
6. Replace direct constructor calls with registry factory methods

## Pros and Cons

**Advantages:**
- Clone objects without coupling to concrete classes
- Eliminate repeated initialization code via pre-built prototype cloning
- Produce complex objects more conveniently
- Alternative to inheritance for managing configuration presets

**Disadvantages:**
- Cloning objects with circular references can be complex and tricky

## Relations with Other Patterns

- **Factory Method**: Often starting point; Prototype is more flexible but complex
- **Abstract Factory**: Can use Prototype to compose factory methods
- **Command**: Prototype helps save command copies to history
- **Composite & Decorator**: Benefit from cloning complex structures instead of reconstruction
- **Memento**: Sometimes Prototype offers simpler state storage for straightforward objects
- **Singleton**: All creational patterns can be implemented as Singleton variants
- **Factory Method vs. Prototype**: Method uses inheritance; Prototype requires initialization

Source: https://refactoring.guru/design-patterns/prototype
