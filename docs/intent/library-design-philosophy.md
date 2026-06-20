# Library Design Philosophy

## Outcome

Keep the library headless, storage-agnostic, and explicit about what is public.

## Public boundaries

Public APIs should describe the current provider/channel/LIFF model and use
domain-specific names.

- `LineClientRegistry` resolves authenticated clients.
- `LineMessagingChannels` and `LineLoginChannels` expose public channel lookup
  and client-access APIs.
- `LineProviderManagementAdapter` is the Promise-based boundary used by the
  optional web components.
- `LineApiLayer` and `makeLineClient` form the current HTTP API surface.

## Internal boundaries

Generic channel persistence is internal. Public consumers should not depend on
generic repository contracts when a domain-specific API exists.

## Naming rules

- Use `Uid` for library-owned identifiers.
- Use domain-qualified `...Id` names for external identifiers.
- Avoid bare `Id` names in new public APIs.

## Consumer responsibilities

Consumers own:

- database schema and persistence
- encryption at rest for credentials
- request authentication and authorization
- tenant or user scoping
- deployment and runtime wiring
