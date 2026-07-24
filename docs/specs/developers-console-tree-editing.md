# Developers Console Tree Editing

## Objective

Make every Edit button in the Variation 2 developers-console tree open a working editor that matches the existing LINE account management demo. Saving an edit must update the in-memory demo data and immediately refresh the expanded tree.

## Approved user experience

The existing `demo/line-account-management.html` flow is the source of truth.

- Provider editing shows the provider name.
- Messaging channel editing shows provider, channel name and ID, credentials, and Bot Profile fields.
- Login channel editing shows provider, channel name and ID, and channel secret.
- LIFF editing shows login channel, LIFF ID, view size, endpoint URL, and description.
- Editors use the existing dialog, form labels, validation, Cancel button, and Save changes button.
- The tree retains its Variation 2 compact IDE appearance.

## Data contract

- Both demos use one shared factory for the canonical sample account data.
- The public developers-console adapter stays read-only.
- The tree demo supplies the shared in-memory management adapter, which the developers-console component normalizes for display and uses for mutations.
- The existing composed `line-developers-console-edit` event remains the integration point.
- Optional Bot Profile properties may be added to the console channel view as backward-compatible fields.

## Interaction flow

1. The user selects Edit for a provider, channel, or LIFF app.
2. The tree emits the existing edit event with the entity kind and selected item.
3. The component resolves the full account entity and opens the matching account-management form in edit mode.
4. Cancel or a dialog close request closes without changing data.
5. Save runs the existing form validation and emits its typed submission detail.
6. The management adapter applies the update; the component closes the dialog, refreshes the tree, restores the expanded hierarchy, and announces success.

## Implementation boundaries

- Do not add write methods to `LineConsoleAdapter`.
- Do not duplicate form markup or validation in the tree demo.
- Do not persist demo edits outside the current page session.
- Do not change account-management production behavior.

## Testing strategy

- Unit test that both demo surfaces begin with the same canonical entities.
- Unit test provider, messaging channel, login channel, and LIFF updates in the demo controller.
- Component test that tree Edit buttons emit the correct composed event detail.
- Component test the public expand-all operation used after a save.
- Browser test the complete open, edit, save, refresh flow for representative entities.
- Run `vp check`, `vp test`, and `vp run build`.

## Success criteria

- The tree displays LINE Marketing, Customer Support, Customer Auth Portal, and Loyalty card dashboard with the same IDs and values as the account management demo.
- Every visible Edit button opens the correct existing account-management editor.
- Invalid values are rejected by the existing validation.
- Saving updates the corresponding tree label or detail without reloading the page.
- Cancel leaves data unchanged.
- Focus, keyboard access, and dialog semantics remain intact.

## Open questions

None. The existing account management demo defines the expected content and behavior.
