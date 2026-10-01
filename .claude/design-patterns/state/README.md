# State Design Pattern

## Intent

The State pattern enables an object to alter its behavior when its internal state changes, creating the appearance that the object has transformed into a different class.

## Problem

The core issue arises from implementing finite-state machines using extensive conditional logic. As described in the documentation: `"The biggest weakness of a state machine based on conditionals reveals itself once we start adding more and more states"` to a class.

A Document class exemplifies this—it might exist in Draft, Moderation, or Published states, with the `publish()` method behaving differently in each. Without the pattern, code accumulates numerous `if`/`switch` statements that become increasingly difficult to maintain and modify.

## Solution

Instead of embedding all state logic within a single class, the pattern suggests creating separate classes for each possible state. The original object (context) maintains a reference to one state object and delegates all state-specific work to it. Transitioning between states simply involves replacing the active state object with another.

## Real-World Analogy

Smartphone buttons demonstrate this principle: when unlocked, button presses execute functions; when locked, they show the unlock screen; with low battery, they display the charging screen. The device's behavior changes based on its current state.

## Structure

The pattern comprises four components:

**Context**: Stores a reference to a concrete state object and delegates state-specific work through the state interface. It provides a setter for transitioning to new states.

**State Interface**: Declares methods representing state-specific behaviors applicable across all concrete states.

**Concrete States**: Implement the state interface methods. They may store backreferences to the context, enabling state transitions and information retrieval.

**Transition Mechanism**: Both context and concrete states can initiate state changes by replacing the linked state object.

## Pseudocode Summary

An AudioPlayer context maintains a State reference and delegates user input (clickLock, clickPlay, etc.) to the current state object. Concrete state classes (LockedState, ReadyState, PlayingState) implement these methods differently, potentially triggering state transitions via `player.changeState()`.

## Applicability

Use State when:

- An object exhibits different behavior depending on its state, with numerous states and frequently changing state-specific code
- A class contains massive conditionals selecting behavior based on field values
- Similar states and transitions create significant code duplication

The pattern enables independent state additions or modifications, reducing maintenance overhead.

## How to Implement

1. Identify the context class (existing or new) containing state-dependent behavior
2. Declare a state interface covering methods with state-specific behavior
3. Create concrete state classes implementing the interface; extract state-related code from the context
4. Handle private member dependencies through visibility changes, public context methods, or nested classes
5. Add a state field to the context with a public setter for transitions
6. Replace context conditionals with calls to corresponding state methods
7. Instantiate state objects to trigger transitions within the context or states

## Pros and Cons

**Advantages:**
- Adheres to Single Responsibility Principle by organizing state-specific code separately
- Follows Open/Closed Principle—new states integrate without modifying existing ones
- Eliminates bulky conditional statements from the context

**Disadvantages:**
- May be excessive for simple state machines with few states or infrequent changes

## Relations with Other Patterns

The State pattern extends Strategy: both employ composition and delegation. However, `"Strategy makes these objects completely independent and unaware of each other. However, State doesn't restrict dependencies between concrete states."` This distinction allows states to manipulate the context's state directly, unlike strategies.

Bridge, Strategy, and Adapter share similar compositional structures but solve different design problems.

Source: https://refactoring.guru/design-patterns/state
