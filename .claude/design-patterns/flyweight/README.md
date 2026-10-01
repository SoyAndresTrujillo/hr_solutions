# Flyweight Design Pattern

## Intent

The Flyweight pattern is a structural design approach that enables applications to accommodate more objects within available RAM by distributing common elements of state across multiple instances rather than maintaining complete data copies in each object.

## Problem

Consider a video game featuring a particle system with vast quantities of bullets, missiles, and shrapnel. While functioning perfectly on a developer's machine, the game crashes on lower-specification hardware after minutes of play. The root cause: insufficient memory to store individual particle objects, each containing redundant information like color and sprite data that remains identical across thousands of instances.

## Solution

The pattern distinguishes between two types of object state:

- **Intrinsic state**: unchanging data shared across many objects (color, sprite)
- **Extrinsic state**: unique, context-dependent information that varies per instance (coordinates, velocity, speed)

The solution moves extrinsic state out of objects and passes it as method parameters. Only intrinsic state remains within the object, enabling significant reuse. In the particle example, instead of thousands of complete particle objects, only three flyweight objects would suffice (bullet, missile, shrapnel types), with a container class managing the extrinsic data across parallel arrays or separate context objects.

### Key Implementation Details

**Flyweight Factory**: A factory method manages an existing flyweight pool, checking for matches before creating new instances, ensuring clients don't directly instantiate flyweights.

**Immutability**: Flyweight objects must be immutable—initializing state solely through constructors without exposing setters or public fields.

## Structure

### Components and Roles

1. **Flyweight**: Contains the reusable intrinsic state portion of the original object, usable across multiple contexts
2. **Context**: Holds extrinsic state unique to individual original objects; paired with flyweights to represent complete state
3. **Flyweight Factory**: Manages the pool of existing flyweights, searching for matches or creating new instances as needed
4. **Client**: Calculates or stores extrinsic state; views flyweights as configurable template objects

The pattern typically preserves original behavior in the flyweight class, requiring clients to pass contextual data as method parameters.

## Pseudocode Summary

```
TreeType (Flyweight):
  - Stores: name, color, texture
  - Methods: draw(canvas, x, y)

TreeFactory:
  - Maintains collection of tree types
  - getTreeType(): searches for existing or creates new

Tree (Context):
  - Stores: x, y coordinates, type reference
  - Methods: draw(canvas)

Forest (Client):
  - Contains tree collection
  - plantTree(): uses factory to manage types
  - draw(): renders all trees
```

## Applicability

**When to use:**

- Applications requiring vast quantities of similar objects simultaneously
- Available RAM becomes the limiting factor
- Objects contain duplicate states extractable and shareable across instances

The pattern provides maximum benefit when memory constraints directly impact functionality and alternative solutions prove insufficient.

## How to Implement

1. Analyze class fields, separating unchanging duplicated data from context-specific variations
2. Designate intrinsic fields as immutable, initialized exclusively in constructors
3. Refactor methods using extrinsic state, converting field references to method parameters
4. Create a factory class managing the flyweight pool, handling search and instantiation logic
5. Store extrinsic state within a separate context class paired with flyweight references

## Pros and Cons

### Advantages
- Substantial RAM savings when handling massive quantities of similar objects

### Disadvantages
- Recalculating context data per method call may increase CPU usage
- Code complexity increases significantly, potentially confusing new team members

## Relations with Other Patterns

- **Composite**: Flyweights can implement shared leaf nodes to conserve memory
- **Facade**: Flyweight manages multiple small objects; Facade presents a unified subsystem interface
- **Singleton**: Both patterns manage single instances, but Flyweight permits multiple instances with different intrinsic states and requires immutability; Singleton allows mutation with one instance maximum

Source: https://refactoring.guru/design-patterns/flyweight
