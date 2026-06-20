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

- `LineChannelUid` and `LineLiffUid` are library-owned identifiers.
- `LineChannelId`, `LineMessagingChannelId`, and `LineLoginChannelId` are
  external LINE identifiers.

Public channel APIs are domain-specific:

- `LineMessagingChannels.Repository`
- `LineMessagingChannels.Service`
- `LineLoginChannels.Repository`
- `LineLoginChannels.Service`

Generic channel persistence is internal and should not be consumed directly.

## Registry

`LineClientRegistry` resolves and caches authenticated clients by channel or
LIFF uid.

```ts
import { Effect, Layer, Schema } from "effect";
import { FetchHttpClient } from "effect/unstable/http";
import { LineChannelUid, LineClientRegistry } from "effect-line-manager";

const channelUid = Schema.decodeUnknownSync(LineChannelUid)("channel-uid-1");

const program = Effect.gen(function* () {
  const registry = yield* LineClientRegistry;
  const client = yield* registry.getMessagingClient(channelUid);
  yield* client.pushMessage("U-recipient-id", [{ type: "text", text: "Hello from Effect" }]);
});

await Effect.runPromise(
  program.pipe(Effect.provide(LineClientRegistry.layer()), Effect.provide(FetchHttpClient.layer)),
);
```

When credentials rotate, invalidate the relevant cache entry:

```ts
const rotateCredentials = Effect.gen(function* () {
  const registry = yield* LineClientRegistry;
  yield* registry.invalidateChannel(channelUid);
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

GET    /line-channels?providerId=...
GET    /line-channels/:id
POST   /line-channels
PATCH  /line-channels/:id
DELETE /line-channels/:id

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

## Development

```bash
vp install
vp test
vp check
vp run build
```
