# Design Patterns Index

Source: https://refactoring.guru/design-patterns

22 GoF patterns total. 3 categories.

## Creational (5)
- [Factory Method](./factory-method/README.md) — superclass interface for object creation, subclasses pick concrete type
- [Abstract Factory](./abstract-factory/README.md) — families of related objects without naming concrete classes
- [Builder](./builder/README.md) — step-by-step construction of complex objects, multiple representations
- [Prototype](./prototype/README.md) — clone existing objects without coupling to concrete classes
- [Singleton](./singleton/README.md) — one instance + global access point

## Structural (7)
- [Adapter](./adapter/README.md) — bridge incompatible interfaces
- [Bridge](./bridge/README.md) — split abstraction/implementation into independent hierarchies
- [Composite](./composite/README.md) — uniform handling of tree structures (leaf + container)
- [Decorator](./decorator/README.md) — runtime behavior wrapping via composition
- [Facade](./facade/README.md) — simplified interface to a complex subsystem
- [Flyweight](./flyweight/README.md) — share intrinsic state, save RAM
- [Proxy](./proxy/README.md) — placeholder controlling access to real service

## Behavioral (10)
- [Chain of Responsibility](./chain-of-responsibility/README.md) — request passes through linked handlers
- [Command](./command/README.md) — request as object (queue, undo, log)
- [Iterator](./iterator/README.md) — traverse collection without exposing internals
- [Mediator](./mediator/README.md) — central hub reduces inter-component coupling
- [Memento](./memento/README.md) — capture/restore state with encapsulation intact
- [Observer](./observer/README.md) — publisher/subscriber notification mechanism
- [State](./state/README.md) — behavior changes via internal state class swap
- [Strategy](./strategy/README.md) — interchangeable algorithm objects
- [Template Method](./template-method/README.md) — algorithm skeleton in superclass, steps overridden by subclasses
- [Visitor](./visitor/README.md) — operations decoupled from object structure (double dispatch)

Note: source page omits Interpreter (GoF canonical 23 patterns; 22 covered here).
