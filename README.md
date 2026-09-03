# Mordheim Campaign Ledger

Mordheim Campaign Ledger is a web application for recording and managing Mordheim campaign warbands, warriors, matches, and events. It is built with TanStack Start and file-based TanStack Router routes, with campaign data stored in Cloudflare D1 through Drizzle ORM and exposed to the client through TanStack DB collections.

## Prerequisites and setup

- Node.js and pnpm (the repository declares `pnpm@10.34.4`)
- A Cloudflare account and Wrangler authentication for remote D1 operations or deployment

```bash
pnpm install
pnpm db:migrate:local
pnpm db:seed:local
pnpm dev
```

The development server runs on port 3000. Local database commands use Wrangler's local D1 database; remote commands target the D1 database configured in `wrangler.jsonc`.

## Commands

```bash
pnpm dev
pnpm build
pnpm check
pnpm lint
pnpm format
pnpm test
pnpm db:generate
pnpm db:migrate:local
pnpm db:migrate:remote
pnpm db:seed:local
pnpm db:seed:remote
pnpm cf-typegen
pnpm deploy
```

- `pnpm dev` starts the Vite development server.
- `pnpm build` creates a production build.
- `pnpm check`, `pnpm lint`, and `pnpm format` run Biome's combined checks, linter, and formatter.
- `pnpm test` runs the database relations test.
- `pnpm cf-typegen` regenerates Cloudflare binding types after changes to `wrangler.jsonc`.
- `pnpm deploy` builds the application and deploys it with Wrangler.

## Database workflow

The Drizzle schema is `src/db/schema.ts`; Drizzle Kit writes migrations to `drizzle/`, which is also the D1 migrations directory configured in `wrangler.jsonc`. Seed data lives in `scripts/seed.sql`.

After changing the schema, generate a migration and apply it to the environment you need:

```bash
pnpm db:generate
pnpm db:migrate:local
# When ready to update the configured Cloudflare D1 database:
pnpm db:migrate:remote
```

To populate a fresh database with the project's seed data, run `pnpm db:seed:local` for local D1 or `pnpm db:seed:remote` for the configured remote D1 database. Keep database access in server-only code; client-side collections in `src/db-collections/` use the application's server functions.

## Deployment

Ensure remote migrations have been applied, authenticate Wrangler with your Cloudflare account, then run:

```bash
pnpm deploy
```

The deployment command builds the TanStack Start application and invokes Wrangler using `wrangler.jsonc`, including its configured Worker entry point and D1 binding.

## Directory overview

- `src/components/ui/` — design-system primitives
- `src/components/table/` — application table components
- `src/db/` — Drizzle schema, database access, domain modules, and server functions
- `src/db-collections/` — TanStack DB collections
- `src/routes/` — file-based TanStack Router routes
- `src/lib/` — shared utilities
- `drizzle/` — generated Drizzle/D1 migrations
- `scripts/` — SQL and other operational scripts

## Contributing

Read [`AGENTS.md`](./AGENTS.md) before contributing or working as an agent. It documents the project's UI, styling, import, and quality conventions.
