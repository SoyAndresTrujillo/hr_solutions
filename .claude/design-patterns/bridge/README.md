# Bridge Design Pattern

## Intent

The Bridge pattern is a structural design pattern enabling separation of a large class or interconnected classes into two independent hierarchies: abstraction and implementation. This permits each hierarchy to evolve separately without tight coupling.

## Problem

The core issue emerges when extending a class hierarchy across multiple independent dimensions simultaneously. For instance, creating a `Shape` class with subclasses like `Circle` and `Square`, then adding color variations (`Red`, `Blue`), results in exponential class proliferation—you need `RedCircle`, `BlueCircle`, `RedSquare`, etc.

As the document explains: "Adding new shape types and colors to the hierarchy will grow it exponentially." Each new dimension multiplies the required combinations, creating maintenance nightmares.

## Solution

Rather than using inheritance across multiple dimensions, the Bridge pattern advocates **object composition**. Extract one dimension into a separate class hierarchy, allowing the original classes to reference objects from the new hierarchy instead of embedding all functionality internally.

The document describes this as: "You can prevent the explosion of a class hierarchy by transforming it into several related hierarchies." For example, extract color logic into `Red` and `Blue` classes, then have `Shape` hold a reference to a color object, delegating color-related operations accordingly.

## Real-World Analogy

A practical example involves cross-platform applications: "Have several different GUIs (for instance, tailored for regular customers or admins)" working across "several different APIs (for example, to be able to launch the app under Windows, Linux, and macOS)."

Without Bridge pattern separation, the codebase becomes "a giant spaghetti bowl, where hundreds of conditionals connect different types of GUI with various APIs all over the code."

## Structure

The pattern comprises five key components:

1. **Abstraction**: Provides high-level control logic, delegating actual work to the implementation object
2. **Implementation**: Declares the common interface for all concrete implementations; abstractions communicate only through declared methods
3. **Concrete Implementations**: Contain platform-specific code
4. **Refined Abstractions**: Offer control logic variants; work with different implementations via the general interface
5. **Client**: Links abstraction objects with appropriate implementation objects

## Pseudocode Summary

A remote control system demonstrates the pattern:

- **RemoteControl** (abstraction) maintains a reference to a `Device` object
- **AdvancedRemoteControl** extends RemoteControl with additional features
- **Device** interface defines primitive operations (enable, disable, setVolume, etc.)
- **Tv** and **Radio** implement the Device interface
- Client code instantiates a remote with a specific device, then operates through the remote abstraction

## Applicability

Use Bridge when:

- **Monolithic class with multiple functionality variants**: When a single class handles various database servers or platforms, Bridge splits it into manageable hierarchies
- **Extending across independent dimensions**: The pattern suits scenarios requiring extension along orthogonal (unrelated) axes
- **Runtime implementation switching**: You need to replace implementation objects dynamically—as simple as "assigning a new value to a field"

## How to Implement

1. Identify orthogonal dimensions (abstraction/platform, front-end/back-end, etc.)
2. Define client-needed operations in the base abstraction class
3. Determine available platform operations and declare necessary ones in the implementation interface
4. Create concrete implementation classes for each platform, adhering to the interface
5. Add a reference field in the abstraction class pointing to an implementation object
6. For multiple high-level logic variants, create refined abstractions extending the base class
7. Have client code pass an implementation object to the abstraction's constructor

## Pros and Cons

### Advantages
- Creates platform-independent classes and applications
- Client code works with high-level abstractions, avoiding platform details
- Supports Open/Closed Principle—introduce new abstractions and implementations independently
- Supports Single Responsibility Principle—separate high-level logic from platform specifics

### Disadvantages
- May overcomplicate highly cohesive classes by applying the pattern unnecessarily

## Relations with Other Patterns

- **Bridge vs. Adapter**: Bridge is designed up-front for independent development; Adapter retrofits incompatible classes into existing systems
- **Bridge, State, Strategy similarities**: All employ composition and delegation but solve different problems. Pattern selection communicates intent to other developers
- **Bridge with Abstract Factory**: Useful when specific Bridge abstractions only work with particular implementations; Abstract Factory encapsulates these relationships
- **Bridge with Builder**: Director class acts as abstraction; builders function as implementations

Source: https://refactoring.guru/design-patterns/bridge
