# Memento Design Pattern

## Intent

The Memento pattern is a behavioral design pattern that enables you to capture and preserve an object's internal state so it can be restored later, all while maintaining proper encapsulation principles. As the documentation notes, it's "a behavioral design pattern that lets you save and restore the previous state of an object without revealing the details of its implementation."

## Problem

The core challenge addressed by this pattern emerges when implementing undo functionality. Three interconnected issues arise:

1. **Encapsulation Violation**: Accessing an object's private state from external sources breaks fundamental OOP principles. Most real-world objects protect their internal data in private fields.
2. **Fragility from Refactoring**: If snapshot-capturing code lives outside the originating class, any structural changes require modifying external code that depends on knowing implementation details.
3. **Snapshot Container Complexity**: A history mechanism requires storing multiple state containers, necessitating either exposing all fields publicly or accepting architectural brittleness.

## Solution

The pattern delegates snapshot creation responsibility to the object that owns the state—the **originator**. Rather than external code peeking into private fields, the originator creates its own snapshots. The documentation explains this approach: "The originator has full access to the memento, whereas the caretaker can only access the metadata."

Key architectural decisions:

- **Originator**: Creates snapshots with full access to its own state
- **Memento**: An immutable object holding the captured state, inaccessible to most actors
- **Caretaker**: Manages memento storage and retrieval through a limited interface

## Structure: Implementation Approaches

### Nested Classes Implementation
Most suitable for languages supporting nested classes (Java, C++, C#):
- Memento resides inside the Originator class
- Originator accesses all memento fields directly
- Caretaker cannot access memento internals, only metadata

### Intermediate Interface Implementation
For languages without nested class support:
- Caretakers interact through an explicitly declared interface
- Only metadata-related methods are exposed to external parties
- Originators access the full memento class directly
- Trade-off: Memento members must be declared public

### Strict Encapsulation Implementation
Maximum protection approach:
- Multiple originator-memento pairs can coexist
- Restoration logic moves into the memento itself
- Memento connects back to its creating originator
- Neither originators nor mementos expose state to caretakers

## Pseudocode Summary

The pattern demonstrates integration with the Command pattern:

```
class Editor (Originator):
  - stores text, cursor coordinates, selection state
  - createSnapshot() → returns Snapshot memento
  - restore(snapshot) → uses memento data to reset state

class Snapshot (Memento):
  - immutable container of editor state
  - restore() → applies stored values back to editor

class Command (Caretaker):
  - makeBackup() → requests memento before operation
  - undo() → retrieves stored memento and requests restoration
```

## Applicability

Implement this pattern when:

1. **Undo/Redo Systems**: "The Memento pattern lets you make full copies of an object's state, including private fields, and store them separately from the object."
2. **Transaction Rollback**: Error recovery requiring state restoration to previous checkpoints
3. **Encapsulation Protection**: Direct field access violates object boundaries, but snapshot capability is essential
4. **State Capture**: You need complete state preservation across multiple objects simultaneously

## How to Implement

1. Identify which class serves as the originator—whether the system uses one central instance or multiple smaller ones
2. Design the memento class by mirroring the originator's significant fields one-to-one
3. Enforce immutability: accept state only through constructor; provide no setter methods
4. For languages with nested class support, place memento inside originator; otherwise, extract a minimal interface for caretaker usage
5. Add state-capture method to originator; return type should match the interface (if extracted)
6. Implement state-restoration method accepting a memento; typecast as necessary to access full memento internals
7. Define caretaker responsibility: determining when snapshots are needed, managing storage, triggering restoration
8. Consider linking caretaker and originator through the memento itself, particularly if restoring requires intimate access

## Pros and Cons

### Advantages
- Preserves encapsulation by making the originator responsible for serializing its own state
- Simplifies originator code by offloading history management to caretakers
- Enables comprehensive state capture including private fields

### Disadvantages
- Memory overhead increases substantially with frequent snapshot creation
- Caretakers must track originator lifecycle to prevent memento memory leaks
- Dynamic languages (Python, PHP, JavaScript) cannot guarantee memento state immutability
- No native protection against accidental state modifications in loosely-typed environments

## Relations with Other Patterns

**Command + Memento**: Commands act as caretakers, storing pre-execution snapshots for undo operations; commands execute their operations while mementos preserve prior states.

**Memento + Iterator**: Capture iteration state and rewind to earlier positions as needed during traversal.

**Prototype vs. Memento**: For simple objects without external resource links, cloning via Prototype may be more efficient than full snapshot creation.

Source: https://refactoring.guru/design-patterns/memento
