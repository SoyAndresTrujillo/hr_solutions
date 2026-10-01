# Command Design Pattern

## Intent

The Command pattern transforms requests into independent objects containing all necessary request information. This allows requests to be passed as arguments, queued, delayed, or made reversible.

## Problem

A text editor's toolbar presents a classic challenge: multiple buttons must perform different operations. Initial solutions—creating numerous button subclasses—create several issues:

- Excessive subclass proliferation
- GUI code becomes tightly coupled to volatile business logic
- Duplicate code when operations need triggering from multiple UI locations (buttons, menus, keyboard shortcuts)

## Solution

The pattern decouples GUI from business logic through intermediary command objects. Rather than GUI elements directly calling business logic methods, they invoke command objects implementing a standard interface. This separation of concerns allows commands to be:

- Passed as method parameters
- Stored and executed later
- Associated with multiple UI elements without duplication

## Real-World Analogy

A restaurant scenario illustrates the concept: a waiter writes orders on paper (command objects), passes them to the kitchen, where chefs execute them. The written order remains in a queue, enabling delayed execution and clear communication without direct customer-chef interaction.

## Structure

The pattern comprises five key components:

**Sender (Invoker)**: Initiates requests through stored command references, without creating commands directly. Usually receives pre-configured commands from client code.

**Command Interface**: Declares a single method for command execution, establishing uniform behavior across all command types.

**Concrete Commands**: Implement specific request types. They store execution parameters as fields and delegate work to receiver objects rather than executing directly.

**Receiver**: Contains actual business logic. Commands handle request delegation; receivers perform substantive work.

**Client**: Creates and configures concrete command objects, initializing all parameters and connecting commands to senders.

## Pseudocode Summary

The example demonstrates undoable operations in a text editor. Commands creating state changes (cut, paste) backup editor state before execution, storing themselves in a command history stack. Undo operations retrieve the most recent command and restore its associated state backup, enabling operation reversal without coupling client code to concrete command classes.

Key classes include:
- `Command` (abstract base with backup/undo mechanisms)
- Concrete commands (`CopyCommand`, `CutCommand`, `PasteCommand`, `UndoCommand`)
- `CommandHistory` (stack-based storage)
- `Editor` (receiver with text operations)
- `Application` (sender managing UI-command associations)

## Applicability

**Use when parameterizing objects with operations**: Convert method calls into configurable objects, enabling runtime switching and passing as arguments.

**Use for queuing or scheduling**: Commands serialize to files/databases for delayed or remote execution, supporting operation logging and network transmission.

**Use for implementing reversible operations**: Command patterns facilitate undo/redo through command history stacks storing state backups, though state preservation can consume significant memory.

## How to Implement

1. Define command interface with single execution method
2. Extract request logic into concrete command classes implementing the interface, storing parameters and receiver references
3. Identify sender classes; add command storage fields
4. Modify senders to execute commands rather than directly calling receivers
5. Initialize object relationships: create receivers, then commands referencing receivers, then senders with associated commands

## Pros and Cons

**Advantages:**
- Implements Single Responsibility Principle by decoupling operation invokers from performers
- Supports Open/Closed Principle for introducing new commands without breaking existing code
- Enables undo/redo functionality
- Supports deferred execution
- Allows composing complex operations from simple commands

**Disadvantages:**
- Introduces additional architectural layers, increasing overall code complexity

## Relations with Other Patterns

The Command pattern connects with several design patterns:

- **Chain of Responsibility vs. Command vs. Mediator vs. Observer**: Different approaches to connecting senders and receivers. Command establishes unidirectional connections; Chain passes requests sequentially; Mediator eliminates direct connections; Observer enables dynamic subscription.
- **Command + Memento**: Combined for implementing undo functionality, with commands performing operations and mementos preserving state.
- **Command vs. Strategy**: Both parameterize objects with actions. Command converts operations into objects enabling queuing and history; Strategy swaps algorithms within single contexts.
- **Command + Prototype**: Helpful for saving command copies to history.
- **Visitor as Command variant**: Provides more powerful operation execution across various object types.

Source: https://refactoring.guru/design-patterns/command
