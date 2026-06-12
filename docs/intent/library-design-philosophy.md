# Library Design Philosophy

> Derived from the 2026-06-12 interview session clarifying the library's scope, seams, and
> long-term posture.

---

## Confirmed Intent

- **Outcome:** A light, agnostic LINE account management library. The domain model seams —
  `LineAccount`, `LineAccountManagement`, `LineRepository`, `LineClientRegistry` — must be
  correct for consumers to layer ownership/assignment logic on top without fighting the
  abstraction.
- **User:** Internal development teams integrating this into full-stack Express applications.
  Also future unknown consuming projects.
- **Why now:** Integration is imminent. Architectural mismatches need to be caught before
  features are built on wrong seams.
- **Success:** A consumer can override `LineAccountManagement.list()` (or any individual CRUD
  method) via Effect v4 service replacement without rewriting the entire service. The
  user↔channel many-to-many use case is cleanly achievable.
- **Constraint:** The core library stays light and agnostic — no bundled DB schemas, no auth
  middleware, no prescribed API paths. Escape hatches via docs. Breaking changes acceptable
  now (pre-v1), but architecture should be stable.
- **Out of scope:** Exhaustive LINE API endpoint coverage. Web components are starting
  templates, not the final UI.

---

## Design Principles

### 1. Agnostic core, not opinionated platform

The library provides **primitives**, not a framework. Consumers own their database,
authentication, authorization, and API routing. The library provides:

- Type-safe LINE API clients (messaging, login, LIFF)
- Account management CRUD with credential safety
- An optional HTTP API definition (mount behind your own auth middleware)
- Optional reference web components

The library does **not** provide:

- Database schemas or migrations (integration guides are in `docs/`)
- Auth middleware or session management
- Prescribed API path structures
- Opinionated multi-tenancy or user-scoping

### 2. Consumer owns the seams

The primary extension points are consumer-owned:

| Seam                           | Who owns it | What it does                                                                         |
| ------------------------------ | ----------- | ------------------------------------------------------------------------------------ |
| `LineRepository`               | Consumer    | Database persistence, encryption, uniqueness enforcement                             |
| `LineAccountManagementAdapter` | Consumer    | Promise interface for web components; injects user-scoping, auth                     |
| Effect `Layer` composition     | Consumer    | Replaces individual service methods via `Layer.effect` + `makeLineAccountManagement` |

When a consumer needs user-scoped listing (user↔channel many-to-many), they:

1. Own the join table in their database
2. Override `LineAccountManagement.list()` via Layer composition
3. The library's other methods (`create`, `update`, `delete`) passthrough unchanged

### 3. Escape hatches, not locked doors

Where the library could be opinionated, it stays agnostic and provides escape hatches
via documentation:

- **Database:** Integration guides for Drizzle, Prisma, Sequelize. No schemas bundled.
- **Auth:** `HttpApi` definitions are unmounted — consumer mounts behind their own middleware.
  Examples for Hono and Express provided.
- **UI:** Web components are a reference implementation consuming the `LineAccountManagementAdapter`
  interface. Consumers can build their own UI against the same adapter or against the
  Effect services directly.
- **Service methods:** `makeLineAccountManagement` is exported. Consumers spread `...base` and
  override only what they need.

### 4. Effect v4 service composition is the extension mechanism

The library is built on Effect. The extension model is Layer composition, not inheritance
or callbacks:

```ts
const myLayer = Layer.effect(LineAccountManagement)(
  Effect.gen(function* () {
    const base = yield* makeLineAccountManagement;
    return LineAccountManagement.of({
      ...base,
      list: () => /* user-scoped override */,
    });
  }),
);
```

This means consumers can replace any method individually without forking the library.

### 5. Headless by default, UI is optional

The `effect-line-manager` root entry is UI-free. The `effect-line-manager/web` entry provides
Lit-based custom elements, but they are:

- Framework-agnostic (custom elements work anywhere)
- Adapter-driven (consume only the Promise-based `LineAccountManagementAdapter`)
- A starting point, not a destination

The real abstraction boundary is the adapter interface. The web components are one possible
consumer of it.

### 6. Primitives over platforms

LINE API coverage is added as consumers need it, not speculatively. The library ships the
operations most applications need (push, reply, multicast, narrowcast, OAuth login, LIFF CRUD)
and consumers contribute or request more as requirements emerge.

---

## Anti-Principles (what we explicitly avoid)

- **Kitchen-sink LINE API coverage:** Not every endpoint needs client methods. Add when needed.
- **Bundled ORM/database decisions:** The library must not pull in Prisma, Drizzle, or any
  database driver.
- **Auth layer:** The library does not know about users, sessions, or permissions. That is
  the consumer's domain.
- **Web component as the only UI:** The Lit components are shipped as a convenience, not as
  the prescribed way to build LINE management UIs.
- **Premature optimization for backward compatibility:** Breaking changes are acceptable before
  v1. The architecture should stabilize, but the surface can shift.
