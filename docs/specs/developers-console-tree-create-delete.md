# Developers Console Tree Create and Delete

## Objective

Give the `tree` variant of `line-developers-console` create and delete actions alongside its existing edit actions. The interaction model, forms, confirmation copy, validation, and mutation events must match `line-account-management`.

## Tech Stack

- TypeScript and Lit web components
- `LineProviderManagementAdapter` for integrated mutations
- Composed custom events for hosts using the read-only `LineConsoleAdapter`
- Vite+ and happy-dom for component tests
- Chrome DevTools AXI for browser verification

## Commands

- Install: `vp install`
- Develop: `vp dev demo`
- Test: `vp test`
- Check: `vp check`
- Build: `vp run build`

## Project Structure

- `src/web/developers-console/`: tree component, messages, and public event types
- `src/web/`: existing account-management dialogs and forms
- `tests/web/`: component and adapter tests
- `demo/`: end-to-end tree demo and in-memory adapter
- `docs/specs/`: feature contracts

## Code Style

Use focused private methods, typed custom-event details, existing design tokens, and semantic buttons.

```ts
this.#emit("line-developers-console-create", {
  type: "loginChannel",
  providerId,
});
```

## Testing Strategy

- Write failing component tests for every visible create/delete action and its composed event detail.
- Test the integrated management-adapter dialogs and mutation calls.
- Test that successful mutations refresh the expanded tree.
- Verify create and delete flows in the demo with Chrome DevTools AXI.
- Check the console, accessibility tree, responsive layout, and screenshots.

## Boundaries

- Always: Reuse `line-account-form` and `line-account-dialog`; preserve keyboard access; confirm destructive actions.
- Ask first: Add dependencies, change persistent storage, or change adapter contracts incompatibly.
- Never: Add writes to `LineConsoleAdapter`, duplicate form validation, edit generated changelogs, or persist demo data across reloads.

## Success Criteria

- The tree toolbar can create a provider.
- Each provider can create a Messaging API channel or LINE Login channel.
- Each LINE Login channel can create a LIFF application.
- Providers, channels, and LIFF applications can be deleted after confirmation.
- Integrated management adapters execute the matching typed create/delete method and refresh the expanded hierarchy.
- Read-only console adapters emit composed create/delete request events with enough context for a host to provide the same workflow.
- Buttons have unambiguous accessible names and fit the compact tree UI at supported viewport widths.
- `vp check`, `vp test`, and `vp run build` pass.

## Open Questions

None. The existing account-management behavior defines the create and delete experience.
