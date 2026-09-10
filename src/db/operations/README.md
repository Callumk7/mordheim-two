# Database operations

Server functions in `src/server/` validate untrusted input and acquire production
bindings. Operations here accept a Drizzle `Database` (or the methods they use)
and validated schema output. They own SQL, database-dependent validation, and
business rules, without importing TanStack transport or Cloudflare runtime globals.
Update operations accept an optional ISO-string `Clock`; production uses the system
clock. Creation timestamps still come from the existing input schemas/database
defaults, preserving the public API.

Run the integration tests with:

```sh
pnpm test src/db/operations/__tests__
```

They also run in `pnpm test`. Each test starts an ephemeral local workerd D1
binding through Wrangler's `getPlatformProxy`, applies every SQL migration in
filename order, and disposes the runtime afterward. The dedicated test config has
no real resource IDs; persistence and remote bindings are explicitly disabled.
No Cloudflare authentication, production database, queue delivery, or network API
is needed. Queue/R2 effects remain injected dependencies.

Rollback assertions execute real D1 batches: a failed later participant insert,
a history-protected removal after additions and match updates, and an injected
late failure during compound warband deletion. The older image-worker SQLite test
helper remains for its existing tests; it is not used as evidence of D1 atomicity.

The `.server.ts` re-exports under `src/server/` preserve existing image/portrait
imports. New operation callers should import their definitions from this directory.
