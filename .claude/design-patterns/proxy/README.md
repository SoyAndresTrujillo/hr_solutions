# Proxy Design Pattern

## Intent

The Proxy pattern enables you to "provide a substitute or placeholder for another object" by controlling access to the original object, allowing actions before or after requests reach it.

## Problem

When working with resource-intensive objects, you may need them only occasionally. The pattern addresses the challenge of lazy initialization without duplicating code throughout client classes, particularly when dealing with third-party libraries that cannot be modified.

## Solution

Create a proxy class implementing the same interface as the original service object. The proxy can then handle requests by creating the real service object and delegating work to it, enabling functionality like lazy initialization and caching without modifying the original class.

## Real-World Analogy

A credit card serves as a proxy for a bank account, which itself is a proxy for physical cash. All three implement the same payment interface, allowing consumers to avoid carrying large amounts of cash while enabling secure electronic transactions.

## Structure

The pattern comprises four components:

- **Service Interface**: Declares the interface both service and proxy must follow
- **Service**: The actual class providing business logic
- **Proxy**: Maintains a reference to the service object, manages its lifecycle, and delegates requests after performing additional processing
- **Client**: Works with both services and proxies through the same interface

## Pseudocode Summary

A caching proxy wraps a third-party YouTube library. Rather than repeatedly downloading videos, the proxy maintains a cache and returns previously downloaded files when the same video is requested multiple times.

## Applicability

Use Proxy patterns when you need to:

- **Lazy initialization**: Delay creating heavyweight objects until actually needed
- **Access control**: Restrict client access based on credentials or criteria
- **Remote execution**: Handle network communication transparently for remote services
- **Request logging**: Maintain request history before delegating
- **Result caching**: Store and reuse results from repeated requests
- **Smart references**: Track active clients and release unused resources

## How to Implement

1. Create a service interface if one doesn't exist (or make the proxy inherit from the service class)
2. Implement a proxy class with a field referencing the service object
3. Implement proxy methods to perform intended work before delegating to the service
4. Consider a factory method determining whether to return a proxy or real service
5. Implement lazy initialization for the service object

## Pros and Cons

**Advantages:**
- Control service objects without client awareness
- Manage object lifecycle independently
- Service works even if unavailable
- Supports Open/Closed Principle through new proxy additions

**Disadvantages:**
- Increased code complexity requiring additional classes
- Potential response delays from service requests

## Relations with Other Patterns

- **Adapter**: Changes interface access; Proxy maintains the same interface
- **Facade**: Both buffer complex entities, but Proxy shares the service's interface
- **Decorator**: Similar structures but different intent; Decorator enhances interfaces while Proxy controls access

Source: https://refactoring.guru/design-patterns/proxy
