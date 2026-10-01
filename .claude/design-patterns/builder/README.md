# Builder Design Pattern

## Intent

The Builder pattern is a creational design pattern that enables you to construct intricate objects incrementally. It facilitates generating different object types and representations using identical construction logic.

## Problem

Complex objects often require tedious, sequential initialization of numerous fields and nested components. This initialization code typically becomes embedded within unwieldy constructors with excessive parameters, or scattered throughout client code. Creating subclasses for each configuration variation leads to an explosion of class hierarchies, making maintenance difficult.

## Solution

Extract object construction logic into separate builder objects. The pattern organizes assembly into discrete steps (such as `buildWalls`, `buildDoor`). Rather than invoking all steps, clients call only those necessary for their specific configuration.

Different builder implementations can execute identical steps in varying ways—for example, constructing walls from wood versus stone. You can optionally employ a director class to manage step sequencing and encapsulate construction routines.

## Real-World Analogy

Like hiring a construction director to oversee the building process: the director knows the sequence, while specialized contractors (builders) handle implementation details.

## Structure: Components and Roles

1. **Builder Interface** — Declares construction steps common across all builder types
2. **Concrete Builders** — Implement distinct construction step variations; products needn't share interfaces
3. **Products** — Resulting objects from builder assembly
4. **Director** — Defines step execution order for reproducible product configurations
5. **Client** — Associates builder instances with director, initiating construction

## Pseudocode Summary

```pseudocode
interface Builder
    reset()
    setSeats(), setEngine(), setTripComputer(), setGPS()

class CarBuilder implements Builder
    - Implements construction steps for vehicles
    - getProduct() returns finished Car, then resets

class CarManualBuilder implements Builder
    - Implements documentation steps
    - getProduct() returns finished Manual

class Director
    constructSportsCar(builder: Builder)
    constructSUV(builder: Builder)

Application
    Creates builder → passes to director → retrieves result
```

## Applicability: When to Use

**Use Builder when eliminating "telescoping constructors"** — situations where overloaded constructors with varying parameter counts create cumbersome APIs.

**Use Builder for multiple product representations** — when constructing different variants (wooden versus stone houses) involves comparable steps differing only in implementation details.

**Use Builder for complex composite structures** — construct object trees incrementally, deferring execution and enabling recursive step calls.

## How to Implement

1. Identify and clearly define common construction steps applicable to all product representations
2. Establish these steps within the base builder interface
3. Develop concrete builders for each product variant, implementing their respective steps
4. Implement result-retrieval methods in builders (not in the interface, due to potentially disparate product types)
5. Consider creating a director class to encapsulate various construction routines
6. Establish client code that instantiates both builder and director objects
7. Retrieve construction results from builder directly, or from director if all products share a common interface

## Pros and Cons

### Advantages

- Construct objects incrementally, defer steps, or execute recursively
- Reuse construction code across different product representations
- Adheres to Single Responsibility Principle by isolating complex construction from business logic

### Disadvantages

- Increased overall code complexity requiring multiple new classes

## Relations with Other Patterns

- **Factory Method vs. Builder** — Factory Method is simpler but less flexible; designs often evolve from Factory Method toward Abstract Factory, Prototype, or Builder
- **Builder vs. Abstract Factory** — Abstract Factory immediately returns products; Builder permits additional construction steps before product retrieval
- **Builder with Composite** — Enables recursive construction step programming for building object trees
- **Builder with Bridge** — Director acts as abstraction; builders serve as implementations
- **Singleton Pattern** — Abstract Factories, Builders, and Prototypes can all be implemented as Singletons

Source: https://refactoring.guru/design-patterns/builder
