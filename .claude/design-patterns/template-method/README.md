# Template Method Design Pattern

## Intent

"Template Method is a behavioral design pattern that defines the skeleton of an algorithm in the superclass but lets subclasses override specific steps of the algorithm without changing its structure."

## Problem

A data mining application needed to process corporate documents in multiple formats (PDF, DOC, CSV). While the format-handling code differed significantly across classes, the data processing and analysis logic remained nearly identical. This created substantial code duplication. Additionally, client code required numerous conditionals to select the appropriate processing class.

## Solution

The pattern breaks algorithms into distinct steps implemented as separate methods, collected within a template method. This framework allows subclasses to override specific steps while preserving the overall algorithmic structure. Steps can be abstract (requiring implementation) or have default implementations.

Two categories of steps exist:
- **Abstract steps**: Must be implemented by every subclass
- **Optional steps**: Include default implementations but can be overridden if needed

A third type, **hooks**, are optional empty methods providing extension points before or after critical algorithm stages.

## Real-World Analogy

Architectural blueprints for mass housing construction illustrate this pattern. A standard building plan contains extension points allowing owners to customize foundation laying, framing, wall construction, and plumbing/electrical work while maintaining the fundamental structure.

## Structure

**Components:**

1. **Abstract Class**: Declares step methods and the template method itself, which orchestrates step execution in specific order. Steps may be abstract or have default implementations.
2. **Concrete Classes**: Override all steps as needed but never override the template method itself.

## Pseudocode Summary

A video game AI example demonstrates the pattern. The base `GameAI` class defines a `turn()` template method coordinating `collectResources()`, `buildStructures()`, `buildUnits()`, and `attack()`. Some steps have implementations; others remain abstract. Concrete subclasses like `OrcsAI` and `MonstersAI` implement or override these steps differently while respecting the template method's structure.

## Applicability

Use Template Method when you want clients to extend particular algorithm steps without modifying the overall algorithm or structure. It transforms monolithic algorithms into individual steps easily extended by subclasses. Apply it when multiple classes contain nearly identical algorithms with minor variations—this avoids modification of all classes when algorithms change.

## How to Implement

1. Analyze the target algorithm, identifying common versus unique steps across subclasses
2. Create an abstract base class with the template method and abstract method declarations; structure the template method to call corresponding steps; consider making it `final`
3. Implement all steps as abstract, though some may benefit from default implementations
4. Insert hooks between crucial algorithm steps
5. For each algorithm variation, create a concrete subclass implementing all abstract steps and potentially overriding optional ones

## Pros and Cons

**Advantages:**
- Clients can override only specific algorithm parts, isolating them from changes to other parts
- Duplicate code is pulled into the superclass

**Disadvantages:**
- Some clients may find the algorithm skeleton restrictive
- Subclasses might violate the Liskov Substitution Principle by suppressing default step implementations
- Complex template methods with numerous steps become harder to maintain

## Relations with Other Patterns

- **Factory Method** specializes Template Method; Factory Method may serve as a step within Template Method
- **Strategy** and **Template Method** both alter algorithm behavior but differ fundamentally: Template Method relies on inheritance (static, class-level), while Strategy uses composition (dynamic, object-level, allowing runtime switching)

Source: https://refactoring.guru/design-patterns/template-method
