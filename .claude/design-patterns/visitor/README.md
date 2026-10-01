# Visitor Design Pattern

## Intent

The Visitor pattern is a behavioral design approach that enables you to decouple algorithms from the objects they operate on, allowing new operations to be added without modifying existing classes.

## Problem

The core challenge arises when you need to perform new operations on a complex object structure—such as a graph of geographic entities—without modifying the existing classes. In the presented scenario, adding XML export functionality directly to node classes risked breaking production code. Additionally, such cross-cutting operations don't logically belong in domain classes focused on their primary responsibilities, and future requirements would necessitate repeated modifications to these fragile classes.

## Solution

Rather than embedding new behaviors into existing classes, the Visitor pattern encapsulates operations in separate visitor classes. The original objects pass themselves to visitor methods as arguments, granting access to necessary data. Each visitor implements multiple methods—one for each element type—enabling type-specific behavior without runtime type checking.

The pattern employs "Double Dispatch" to route execution correctly: instead of client code selecting which visitor method to invoke, element objects delegate this choice. They accept a visitor and call the appropriate visiting method based on their own type.

```
node.accept(exportVisitor)  // Element directs the call
v.doForCity(this)           // Visitor receives correct type
```

## Real-World Analogy

Consider an insurance agent visiting various buildings in a neighborhood. Depending on the organization type occupying each building—residential, bank, or coffee shop—the agent offers specialized policies (medical, theft, or fire/flood insurance respectively). Similarly, a visitor adapts its behavior based on the element type it encounters.

## Structure

The pattern comprises five key components:

**1. Visitor Interface**
- Declares a set of visiting methods corresponding to each concrete element class
- Method signatures differentiate element types through parameter types

**2. Concrete Visitor**
- Implements multiple versions of the same behavior
- Each method handles a different element class type

**3. Element Interface**
- Declares an "acceptance" method accepting a visitor object as a parameter
- Enables the visitation mechanism

**4. Concrete Element**
- Implements the acceptance method by redirecting calls to the appropriate visitor method
- Must pass itself (`this`) to enable type-specific processing

**5. Client**
- Works with collections or complex structures (like Composite trees)
- Iterates through elements, invoking their accept methods with visitor instances

## Pseudocode Summary

```
interface Shape { method accept(v: Visitor) }

class Dot implements Shape {
    method accept(v: Visitor) { v.visitDot(this) }
}

interface Visitor {
    method visitDot(d: Dot)
    method visitCircle(c: Circle)
    // ... other element types
}

class XMLExportVisitor implements Visitor {
    method visitDot(d: Dot) { /* export dot logic */ }
    method visitCircle(c: Circle) { /* export circle logic */ }
}

class Application {
    method export() {
        visitor = new XMLExportVisitor()
        foreach (shape in allShapes) {
            shape.accept(visitor)
        }
    }
}
```

## Applicability

**Use Visitor when:**

- You must perform operations on all elements of a complex structure (trees, graphs) with heterogeneous types
- You need to execute multiple unrelated operations over the same object set while keeping these operations separate
- Auxiliary behaviors clutter your primary classes, and you want to isolate them into dedicated visitor classes
- A behavior is only relevant to certain classes within a hierarchy, not all of them

## How to Implement

1. Define the visitor interface with one visiting method per concrete element class
2. Add an abstract acceptance method to the element hierarchy base class
3. Implement acceptance in all concrete elements to redirect calls to matching visitor methods
4. Element classes interact with visitors only through the visitor interface
5. For each new operation, create a concrete visitor implementing all visiting methods
6. Manage access carefully—you may need to expose private members or use nested classes
7. Client code creates visitors and passes them to elements via acceptance methods

## Pros and Cons

**Advantages:**
- Honors the Open/Closed Principle—introduce new behaviors without modifying element classes
- Applies Single Responsibility Principle—consolidates multiple behavior variants in one visitor class
- Visitor objects can accumulate state while traversing complex structures, useful for analysis operations

**Disadvantages:**
- Requires updating all visitor classes whenever element classes are added or removed from the hierarchy
- Visitors may lack access to private fields and methods they need from element classes

## Relations with Other Patterns

- **Command Pattern**: Visitor functions as an enhanced version, executing operations across diverse object types
- **Composite Pattern**: Visitor effectively traverses and processes entire Composite trees
- **Iterator Pattern**: Combine Visitor with Iterator to traverse complex structures and execute operations on heterogeneous elements simultaneously

Source: https://refactoring.guru/design-patterns/visitor
