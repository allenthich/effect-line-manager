---
"effect-line-manager": minor
---

Real offset-based pagination for list endpoints.

- New shared schemas: `PageQuery`, `NormalizedPageQuery`, `PageResult<A>`, `Pagination` (now Int-based), plus `normalizePageQuery` and `paginate` helpers.
- Repositories now accept `NormalizedPageQuery` and return `PageResult<T>` instead of `ReadonlyArray<T>`. Consumers implementing repositories own the counts and slicing (SQL `LIMIT`/`OFFSET`, etc.).
- Management services and HTTP API accept an optional `PageQuery` (`{ page?, pageSize? }`) on list operations and pass pagination metadata through unchanged.
- List query schemas extended additively: `ListProvidersQuery` = `PageQuery`, `ListChannelsQuery` = `PageQuery + providerId?`, `ListLiffAppsQuery` = `PageQuery + channelId?`.
- `LineProviderManagementAdapter.listProviders/listChannels/listLiffApps` now accept an optional query argument.
- Demo in-memory adapter uses the shared `paginate` helper with the standard defaults (page=1, pageSize=20, max=100).
- Removed fabricated pagination metadata (always `page: 1, pageSize: totalItems`). The `Pagination` contract now reflects actual server-side pagination.
