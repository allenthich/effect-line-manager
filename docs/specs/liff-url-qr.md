# Spec: LIFF launch URL and QR code

## Objective

Make the web management UI distinguish the configured LIFF endpoint from the public LIFF launch URL. Users can persist one query-string fragment per LIFF app, generate the corresponding launch URL, and open a QR code for that exact URL.

## Tech Stack

- TypeScript and Lit web components
- Vite+ for formatting, linting, type checking, building, and tests
- A local QR encoder that does not depend on an external QR service

## Commands

- Install: `vp install`
- Development: `vp dev demo`
- Check: `vp check`
- Type check: `vpx tsgo --noEmit`
- Test: `vp test`
- Build: `vp pack`

## Project Structure

- `src/web/`: web components and shared LIFF URL composition logic
- `src/web/developers-console/`: read-only developers console web component
- `tests/web/`: web unit and component tests
- `demo/`: browser verification application

## Code Style

```ts
export const buildLiffUrl = (liffId: string, additionalParameters = ""): string => {
  const baseUrl = `https://liff.line.me/${liffId}`;
  const parameters = additionalParameters.trim().replace(/^[?&]+/, "");
  return parameters === "" ? baseUrl : `${baseUrl}?${parameters}`;
};
```

Use focused Lit components, semantic form controls, accessible dialog behavior, project design tokens, and the repository formatter. Do not use em dashes.

## Testing Strategy

- Unit-test URL composition first, including blank parameters and optional leading `?` or `&`.
- Component-test endpoint and generated URL labels plus QR dialog interactions.
- Run the full project checks and tests.
- Verify the desktop and mobile layouts in the demo with a real browser, with a clean console.

## Boundaries

- Always: store one canonical `additionalUrlParameters` string per LIFF app without a leading `?` or `&`; generate the launch URL from `https://liff.line.me/`, the LIFF ID, and the stored parameters; encode the exact displayed launch URL in the QR code; preserve endpoint URL behavior.
- Ask first: introducing multiple named launch links per LIFF app or using remote services.
- Never: store the generated QR image; use an external QR-generation service; edit generated files or `CHANGELOG.md`.

## Success Criteria

- Every LIFF endpoint label in the web UI says `Endpoint URL` instead of `View URL`.
- LIFF details display `https://liff.line.me/{LIFF ID}` even if no permanent URL is supplied by an adapter.
- A labeled additional-parameters input updates the displayed LIFF URL immediately.
- Blank input produces the base LIFF URL; `foo=bar`, `?foo=bar`, and `&foo=bar` all produce `...?foo=bar`.
- Create and update requests persist canonical `additionalUrlParameters`; omitted create values default to an empty string, omitted update values remain unchanged, and an empty update clears the value.
- Existing LIFF records remain valid and expose an empty `additionalUrlParameters` value.
- Reopening or reloading a LIFF app restores the saved parameters and uses them in the displayed launch URL.
- A keyboard-accessible action opens a centered QR code dialog showing the generated URL.
- The QR code value includes the additional parameters when present.
- Existing LIFF create and edit requests continue sending the endpoint URL independently from the launch parameters.

## Open Questions

None. The host application persists one additional-parameter string per LIFF app as application metadata. It is not sent to LINE as part of the LIFF endpoint configuration.
