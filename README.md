# Effect LINE Manager

A headless Effect TypeScript v4 library for managing multiple LINE Messaging
API channels. Applications supply channel persistence and an Effect HTTP client;
the library resolves credentials, caches authenticated clients, sends push and
reply messages, and verifies webhook signatures against exact request bytes.

The package intentionally does not include a database adapter, web framework
controller, process-wide runtime, retry policy, or distributed cache.

## Repository and Registry

Implement `LineRepository` with infrastructure owned by the host application,
then provide it with an `HttpClient.HttpClient` to the registry layer:

```ts
import { Effect, Layer, Option } from "effect";
import { FetchHttpClient, HttpClient } from "effect/unstable/http";
import {
  LineClientRegistry,
  LineRepository,
  makeLineClientRegistryLayer,
  type LineRepositoryShape,
} from "effect-line-manager";

declare const repository: LineRepositoryShape;

const dependencies = Layer.merge(Layer.succeed(LineRepository)(repository), FetchHttpClient.layer);

const registryLayer = makeLineClientRegistryLayer().pipe(Layer.provide(dependencies));

const send = Effect.gen(function* () {
  const registry = yield* LineClientRegistry;
  const client = yield* registry.getClient("line-channel-id");

  yield* client.pushMessage("U-recipient-id", [{ type: "text", text: "Hello from Effect" }]);
});

Effect.runPromise(send.pipe(Effect.provide(registryLayer)));
```

Repository lookups use `Option<LineChannel>` for absence and fail with
`LineRepositoryError` for infrastructure failures.

## Credential Rotation

Clients are cached by LINE channel ID. Invalidate the entry after updating or
deleting credentials so subsequent lookups use current configuration:

```ts
const rotateCredentials = Effect.gen(function* () {
  // Persist the new channel secret or access token first.
  const registry = yield* LineClientRegistry;
  yield* registry.invalidate("line-channel-id");
});
```

The default cache capacity is 500, successful entries live for 30 minutes, and
failed lookups live for 30 seconds. These values are configurable through
`makeLineClientRegistryLayer`.

## Reply Messages

```ts
yield * client.replyMessage("reply-token", [{ type: "text", text: "Thanks for your message" }]);
```

Push and reply operations accept one to five text messages. Push operations may
also receive a caller-owned LINE retry key and notification preference.

## Webhook Signatures

Verify the exact raw request bytes before parsing or modifying the body:

```ts
import { Redacted } from "effect";
import { verifyLineSignature } from "effect-line-manager";

yield *
  verifyLineSignature(
    rawRequestBytes,
    request.headers.get("x-line-signature") ?? undefined,
    Redacted.make(channelSecret),
  );
```

`verifyLineSignatureString` is available when the caller already owns the exact
UTF-8 request string. The byte-oriented function is preferred because parsing,
reserialization, whitespace changes, or line-ending normalization invalidate a
LINE signature.

## Development

- Install dependencies:

```bash
vp install
```

- Run the unit tests:

```bash
vp test
```

- Format, lint, and type-check:

```bash
vp check
```

- Build the library and declarations:

```bash
vp run build
```
