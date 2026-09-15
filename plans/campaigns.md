# Campaigns

## Context

The ledger is one implicit world: warbands, warriors, matches, and events have no campaign key, lists are unscoped, and `/` just links into those indexes. A new season cannot start blank without wiping the database.

Add a first-class campaign, stamp campaign-owned rows with `campaignId`, pick/create campaigns on `/`, and nest in-campaign routes under `/campaigns/$campaignId/...` so each season is isolated.

Existing data does not need to be retained.

## Approach

- New `campaigns` table: `id`, `name`, `createdAt`, `updatedAt`.
- Required `campaignId` on **warbands, warriors, matches, events**. Composite FKs so a warrior/event/match cannot point at a row from another campaign (e.g. warriors `(campaignId, warbandId)` → warbands `(campaignId, id)`). Index `campaignId` on those tables.
- **Not** campaign-owned: equipment (shared catalogue), `app_settings`, image-generation jobs (inherit via warrior/event/match FKs), `warrior_equipment` and `warband_matches` (inherit via parents).
- `/` lists campaigns and creates one (name only), then navigates to `/campaigns/$id/warbands`.
- Move warbands, warriors, matches, events, stats, and projector under `src/routes/campaigns/$campaignId/`. Equipment, settings, queue, generated-images stay global.
- Keep the current singleton collections (`getCollections(dbClient)` still lists all rows). Scope the UI with `eq(..., campaignId)` in live queries. Stamp `campaignId` from route params on insert. Detail loaders 404 when the row is missing or `row.campaignId !== params.campaignId`.
- Destructive D1 migration: FK off, drop campaign-owned tables, delete orphaned `image_generation_jobs`, create `campaigns`, recreate owned tables with `campaign_id`. No backfill. Local workflow: `pnpm db:reset-and-seed:local`.

Campaign delete/archive is out of scope.

## Files to modify

**Schema / persistence**

- `src/db/schema.ts` — `campaigns` table + relations; `campaignId` on warbands, warriors, matches, events; composite FKs; `campaignId` indexes
- `src/db/validation/campaign.ts` — new (name + id/timestamps)
- `src/db/validation/{warband,warrior,match,event}.ts` — required `campaignId`
- `src/db/operations/campaigns.server.ts` + `src/server/campaigns.ts` — list/create
- `src/db/operations/{warbands,warriors,matches,events}.server.ts` — persist `campaignId` already on the row; no extra list filter required for collections
- New `drizzle/00xx_*.sql` (hand-adjust if `db:generate` emits `ALTER … NOT NULL` without a wipe)
- `scripts/reset.sql` — drop owned tables including `campaigns`
- `scripts/seed.sql` — one seed campaign; stamp owned rows

**Collections / queries / mutations**

- `src/db-collections/index.ts` — `campaigns` collection
- `src/db-collections/campaigns.ts` — query collection (same pattern as warbands)
- `src/db-collections/mutations/campaigns.ts` — create (and list-driven insert)
- `src/db-collections/queries/{warbands,warriors,matches,events,stats,combat-stats,warband-dashboard}.ts` and `*-specifications.ts` — take `campaignId` and `where` on it (`allWarbandsQuery` especially)
- `src/db-collections/mutations/{warbands,warriors,matches,events}.ts` — `campaignId` on insert types/payloads
- Tests under `src/db/__tests__/`, `src/db-collections/mutations/__tests__/` — fixtures include `campaignId`

**Routes / nav / links**

- `src/routes/index.tsx` — campaign list + create dialog; create then `navigate` to warbands
- New `src/routes/campaigns/$campaignId/route.tsx` — preload campaigns, 404 if missing, in-campaign nav + `<Outlet />`
- New `src/routes/campaigns/$campaignId/index.tsx` — redirect to `./warbands`
- Move `src/routes/{warbands,warriors,matches,events,stats,projector}* ` under `src/routes/campaigns/$campaignId/`
- `src/routes/__root.tsx` — global nav only: Home, Equipment, Settings (hide this header on projector; campaign layout owns in-campaign nav)
- `src/components/shared/entity-chrome.tsx` — `EntityLink` paths include `/campaigns/$campaignId/...` and `campaignId` in params
- Tables and entity pages that hard-code `to: "/warbands"` etc.:
  - `src/components/table/{warbands,warriors,matches,events,match-events}-table.tsx`
  - corresponding table tests
  - detail/delete routes under warbands/warriors/matches/events
- `src/lib/projector.ts` / `src/routes/campaigns/$campaignId/projector.tsx` — campaign-filtered projector data

`routeTree.gen.ts` is generated (`pnpm generate-routes` / Vite plugin).

## Reuse

- Collection + server-fn pattern: `src/db-collections/warbands.ts`, `src/server/warbands.ts`, `src/db/operations/warbands.server.ts`
- Create transaction + `safeRandomUUID()`: `src/db-collections/mutations/warbands.ts`
- Index chrome + create dialog: `src/routes/warbands/index.tsx`, `src/components/shared/index-page.tsx`, `src/components/shared/empty-state.tsx`, `Dialog` / `Field` primitives
- Layout + `notFound()` membership check: `src/routes/warbands/$warbandId/route.tsx`
- `LinkButton` via `createLink` in `src/components/ui/button.tsx`
- Seed/reset scripts already used by `pnpm db:reset-and-seed:local`

Do **not** introduce parameterized per-campaign collections; live-query `where` is enough for this single-user app.

## Steps

- [x] Add `campaigns` schema, Zod schema, operations, server fns, collection, and create mutation
- [x] Add `campaignId` to warbands/warriors/matches/events schemas, composite FKs, and validation fixtures
- [x] Write a wipe-and-recreate D1 migration; update `reset.sql` / `seed.sql` (one campaign, e.g. `city-of-the-damned`)
- [x] Filter live queries by `campaignId`; stamp it on creates from route params (not form fields)
- [x] Rebuild `/` as campaign picker (empty state + list + name dialog); on create, enter `/campaigns/$id/warbands`
- [x] Add `campaigns/$campaignId` layout (name in header, nav: Campaigns → `/`, Warbands, Warriors, Matches, Events, Stats, Equipment, Settings)
- [x] Move campaign-scoped routes under that layout; update every `Link`/`navigate`/`EntityLink`/`createFileRoute` path
- [x] Loaders: unknown campaign or entity in the wrong campaign → `notFound()`
- [x] Update mutation/table/schema tests; run `pnpm generate-routes`, `pnpm check`, `pnpm test`

## Verification

- `pnpm db:reset-and-seed:local` applies cleanly; seed data only visible in the seed campaign
- Create campaign A, add a warband; create campaign B — A’s warband does not appear in B
- Create-then-enter lands on `/campaigns/$id/warbands` with the new name in the layout
- In-campaign nav keeps `campaignId`; Equipment/Settings stay unscoped
- `/warbands` and other old URLs 404; `/campaigns/not-a-real-id/warbands` 404s
- Opening a warband URL with the wrong `campaignId` 404s
- Projector and stats only show the active campaign
- `pnpm check` and `pnpm test` pass
