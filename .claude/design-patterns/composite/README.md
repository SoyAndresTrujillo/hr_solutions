# Composite Pattern

## Intent

The Composite pattern is a structural design approach that enables developers to "compose objects into tree structures and then work with these structures as if they were individual objects."

## Problem

When applications contain hierarchical data—such as products in boxes nested within larger boxes—determining aggregated values (like total price) becomes complex. Direct approaches require knowing concrete class types, nesting depths, and other implementation details beforehand, making code awkward or impossible to maintain.

## Solution

Composite suggests implementing a common interface shared by both simple and complex elements. For leaf elements, methods return their own values directly. For containers, methods recursively request values from child components and aggregate results. This approach allows "you don't need to care about the concrete classes of objects that compose the tree."

## Real-World Analogy

Military hierarchies exemplify composite structures. Armies contain divisions; divisions contain brigades; brigades contain platoons; platoons contain squads of soldiers. Commands cascade downward through levels until every participant understands their responsibilities.

## Structure

The pattern comprises four key components:

1. **Component Interface**: Declares operations applicable to both simple and complex elements
2. **Leaf**: Basic tree elements without sub-elements; typically perform most actual work
3. **Container (Composite)**: Elements containing sub-elements (leaves or other containers); delegate work via the component interface
4. **Client**: Interacts with all elements through the component interface, treating simple and complex elements uniformly

## Pseudocode Summary

A graphical editor implements shape stacking using Composite. The `CompoundGraphic` class holds multiple sub-shapes (including other compound shapes). When operations execute, compound shapes delegate recursively to children and aggregate results. Client code treats all shapes identically through their shared interface.

Key classes include:
- **Graphic interface**: Defines `move()` and `draw()` methods
- **Leaf classes** (Dot, Circle): Implement actual drawing operations
- **CompoundGraphic**: Maintains child arrays, delegates operations recursively
- **ImageEditor**: Works exclusively through the Graphic interface

## Applicability

Use Composite when:

- Your application model represents hierarchical tree structures
- You want client code treating simple and complex elements identically
- Both leaf and container elements need to share common operations

The pattern excels when "you can work with complex tree structures more conveniently: use polymorphism and recursion to your advantage."

## How to Implement

1. Verify your application's core model maps to tree structures; decompose into simple elements and containers
2. Declare a component interface containing methods meaningful for both simple and complex components
3. Implement leaf classes representing simple elements
4. Implement container classes with array fields storing sub-elements via the component interface type
5. Define add/remove operations for child management in containers

## Pros and Cons

**Advantages:**
- Complex tree structures become more convenient to work with
- Open/Closed Principle compliance: introduce new element types without breaking existing code

**Disadvantages:**
- Establishing common interfaces for functionally divergent classes proves difficult
- Overgeneralized interfaces may reduce comprehensibility

## Relations with Other Patterns

- **Builder**: Useful for constructing complex Composite trees through recursive steps
- **Chain of Responsibility**: Often pairs with Composite for hierarchical request delegation
- **Iterator**: Traverses Composite trees effectively
- **Visitor**: Executes operations across entire Composite trees
- **Flyweight**: Implements shared leaf nodes to conserve memory
- **Decorator**: Similar recursive composition structure but with single children and added responsibilities (versus aggregation)
- **Prototype**: Benefits designs heavily using Composite and Decorator through efficient cloning

Source: https://refactoring.guru/design-patterns/composite
