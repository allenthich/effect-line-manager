# Effect LINE Manager

An Effect TypeScript v4 library for managing LINE providers, channels, LIFF
apps, and authenticated LINE clients. The package stays headless by default and
offers optional HTTP API and web-component entrypoints.

## Model

The library models LINE configuration as:

- `LineProvider`
- `MessagingChannel` or `LoginChannel`
- `LineLiffApp`

Public identifiers follow these rules:

- `LineLiffId` is a library-owned identifier.
- `LineMessagingChannelId` and `LineLoginChannelId` are
  domain-specific LINE channel identifiers.

Public channel APIs are domain-specific:

- `LineMessagingChannels.Repository` (full-CRUD persistence port for messaging channels)
- `LineMessagingChannels.Service`
- `LineLoginChannels.Repository` (full-CRUD persistence port for login channels)
- `LineLoginChannels.Service`

Hosts implement both repository ports directly — there is no shared generic
channel persistence layer in the library.

## Registry

`LineClientRegistry` resolves and caches authenticated clients by channel or
LIFF ID. For most consumers, use the domain-specific channel services instead.

```ts
import { Effect, Schema } from "effect";
import { LineMessagingChannelId, LineMessagingChannels } from "effect-line-manager";

const channelId = Schema.decodeUnknownSync(LineMessagingChannelId)("1234567890");

const program = Effect.gen(function* () {
  const service = yield* LineMessagingChannels.Service;
  const client = yield* service.getClientByLineChannelId(channelId);
  yield* client.pushMessage("U-recipient-id", [{ type: "text", text: "Hello from Effect" }]);
});
```

When credentials rotate, invalidate the relevant cache entry:

```ts
const rotateCredentials = Effect.gen(function* () {
  const service = yield* LineMessagingChannels.Service;
  yield* service.invalidateClientByLineChannelId(channelId);
});
```

## HTTP API

Use the `effect-line-manager/httpapi` entrypoint for the current CRUD surface:

```text
GET    /line-providers
GET    /line-providers/:id
POST   /line-providers
PATCH  /line-providers/:id
DELETE /line-providers/:id

GET    /line-messaging-channels?providerId=...
GET    /line-messaging-channels/:id
POST   /line-messaging-channels
PATCH  /line-messaging-channels/:id
DELETE /line-messaging-channels/:id

GET    /line-login-channels?providerId=...
GET    /line-login-channels/:id
POST   /line-login-channels
PATCH  /line-login-channels/:id
DELETE /line-login-channels/:id

GET    /line-liff-apps?channelId=...
GET    /line-liff-apps/:id
POST   /line-liff-apps
PATCH  /line-liff-apps/:id
DELETE /line-liff-apps/:id
```

Server-side assembly uses `LineApiLayer`:

```ts
import { Layer } from "effect";
import { HttpServer } from "effect/unstable/http";
import { LineApiLayer } from "effect-line-manager/httpapi";

const apiLayer = LineApiLayer.pipe(Layer.provide(HttpServer.layerServices));
```

Client-side integration uses `makeLineClient` and
`makeLineProviderManagementAdapter`:

```ts
import { Effect } from "effect";
import { FetchHttpClient } from "effect/unstable/http";
import { makeLineClient, makeLineProviderManagementAdapter } from "effect-line-manager/httpapi";

const client = await Effect.runPromise(
  makeLineClient({ baseUrl: "/api/admin" }).pipe(Effect.provide(FetchHttpClient.layer)),
);

const adapter = makeLineProviderManagementAdapter(client);
```

## Web Components

`effect-line-manager/web` exports optional Lit-based reference components. They
consume `LineProviderManagementAdapter` and are intentionally separate from the
headless package surface.

### Developers Console wrapper

`effect-line-manager/web/developers-console` adds a read-only custom element
that wraps the [LINE Developers Console](https://developers.line.biz/console/)
itself, rendering providers → channels → LIFF apps as one expandable hierarchy
via a cookie / proxy adapter. It is meant to be hosted where the developer
session cookie is in scope (a Manifest V3 browser extension with
`host_permissions` for `developers.line.biz` is the recommended shape; a
same-origin backend proxy also works).

```ts
import {
  defineLineDevelopersConsoleElements,
  createLineConsoleAdapter,
} from "effect-line-manager/web/developers-console";

defineLineDevelopersConsoleElements();

const consoleEl = document.querySelector("line-developers-console")!;
consoleEl.adapter = createLineConsoleAdapter({
  // baseUrl points at a same-origin proxy by default; the real console base
  // is used when the component runs inside the console origin (e.g. extension).
  cookie: process.env.LINE_DEV_COOKIE, // optional in extension contexts
});
```

## Development

```bash
vp install
vp test
vp check
vp run build
```
