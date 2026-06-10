# Effect LINE Manager

An Effect TypeScript v4 library for managing multiple LINE Messaging API
channels, with a headless root entry and optional framework-agnostic Lit web
components. Applications supply channel persistence and an Effect HTTP client;
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

## Web Components

The `effect-line-manager/web` entry is separate from the headless root package.
Importing it does not register custom elements. Register the complete account
management component set explicitly:

```ts
import {
  defineLineAccountManagementElements,
  type LineAccountManagementAdapter,
} from "effect-line-manager/web";

defineLineAccountManagementElements();

const accounts = document.createElement("line-account-management");
accounts.adapter = {
  list: () => fetch("/line-accounts").then((response) => response.json()),
  create: (input) =>
    fetch("/line-accounts", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(input),
    }).then((response) => response.json()),
  update: (id, input) =>
    fetch(`/line-accounts/${id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(input),
    }).then((response) => response.json()),
  delete: (id) => fetch(`/line-accounts/${id}`, { method: "DELETE" }).then(() => undefined),
} satisfies LineAccountManagementAdapter;

document.querySelector("main")?.append(accounts);
```

Adapters and message overrides are object properties, not string attributes.
When the element already exists in markup, assign them after selecting it:

```html
<line-account-management id="line-accounts"></line-account-management>
```

```ts
import type { LineAccountManagement } from "effect-line-manager/web";

const element = document.querySelector<LineAccountManagement>("#line-accounts");
if (element) {
  element.adapter = adapter;
  element.messages = { title: "Connected LINE accounts" };
}
```

Lifecycle and error events bubble and cross Shadow DOM boundaries:

```ts
element?.addEventListener("line-account-created", (event) => {
  const { account } = (event as CustomEvent).detail;
  console.log("Created", account.id);
});

element?.addEventListener("line-account-error", (event) => {
  const { operation, error } = (event as CustomEvent).detail;
  reportError(operation, error);
});
```

English copy is included by default. Supply a partial `messages` object to
override selected strings. Theme the stable surface with CSS custom properties
and `::part()` selectors:

```css
line-account-management {
  --line-account-primary-color: #00a846;
  --line-account-page-background: #f4f7f5;
  --line-account-content-width: 80rem;
  --line-account-radius: 1rem;
}

line-account-management::part(add-button) {
  font-weight: 800;
}
```

React users should assign object properties and native event listeners through
a ref:

```tsx
import { useEffect, useRef } from "react";
import type { LineAccountManagement } from "effect-line-manager/web";

export function LineAccounts({ adapter }: { adapter: LineAccountManagementAdapter }) {
  const ref = useRef<LineAccountManagement>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    element.adapter = adapter;

    const handleUpdated = (event: Event) => {
      console.log((event as CustomEvent).detail.account);
    };
    element.addEventListener("line-account-updated", handleUpdated);
    return () => element.removeEventListener("line-account-updated", handleUpdated);
  }, [adapter]);

  return <line-account-management ref={ref} />;
}
```

Consumers building a custom page can register and compose only the primitives
they need:

```ts
import {
  LineAccountCard,
  defineLineAccountCard,
  defineLineAccountDialog,
  defineLineAccountForm,
} from "effect-line-manager/web";

defineLineAccountCard();
defineLineAccountForm();
defineLineAccountDialog();

const card = document.createElement("line-account-card") as LineAccountCard;
card.account = account;
```

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
