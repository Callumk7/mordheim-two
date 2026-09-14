# UI route audit

This document records layout and styling inconsistencies across every application route. It is the deliverable for Linear issue **MOR-52** and the source for follow-on unification work in the “UI audit and unification” project.

The goal is not to restyle the app in this change. The goal is a route-by-route inventory that is specific enough to implement shared layout primitives later and to verify each affected screen after migration.

## Scope

Reviewed:

- Every file-based route under `src/routes/` that renders UI
- The root document shell in `src/routes/__root.tsx`
- The default not-found screen in `src/router.tsx`
- Shared layout-adjacent components that routes currently copy or wrap (`src/components/shared/page.tsx`, `src/components/shared/index-page.tsx`, `src/components/ui/card.tsx`, `src/components/ui/button.tsx`, `src/components/shared/stat-display.tsx`)

Out of visual-unification scope, but inventoried:

- `/api/generated-images/$jobId` — server-only image response, no UI
- `/projector` — dedicated broadcast layout with `src/projector.css`; it should stay a separate visual system

Audit date: 2026-09-14. Source of truth: current `main` at the time of this document.

## Method

Each UI route was inspected for:

| Axis | What was compared |
| --- | --- |
| Layout | Page width, outer padding, whether a `<main>` exists, nested shells, grid/flex structure |
| Surface | Card vs ad-hoc `border`/`bg-card`/`rounded-*`, dashed empties, destructive panels |
| Spacing | Vertical rhythm (`gap-*`, `mt-*`, `py-*`), header/content separation |
| Alignment | Header action placement, back/delete bars, label/value stacks |
| Responsive | Breakpoints, column counts, wrapping vs stacking |
| Typography | `font-mordheim` vs `font-serif` vs default sans, heading sizes, eyebrow treatment |

Repeated Tailwind strings that appear in more than one route are listed as consolidation candidates. File:line references below are the current implementation, not a proposed API.

## Shared primitives already in place

These are the building blocks later issues should extend instead of inventing parallel ones.

| Primitive | Location | What it already standardizes | Gap |
| --- | --- | --- | --- |
| Page shell | `src/components/shared/page.tsx` | Campaign `<main>` width/padding (`max-w-6xl` / `py-10`), plus `narrow` (`max-w-3xl`), `form` (`max-w-2xl`), `wide` (`max-w-7xl`), and `loose` padding; `PagePending` / `PageError` | Nested detail/delete columns still use local `max-w-3xl` / `max-w-2xl` wrappers; projector stays on its own landmark |
| Index page stack | `src/components/shared/index-page.tsx` | `grid gap-8`, list header, dashed empty | Used only on collection indexes; match detail and admin headers still local |
| Card | `src/components/ui/card.tsx` | `rounded-2xl`, `ring-1 ring-foreground/10`, `--card-spacing`; equipment accordion via `CatalogueItem` | Data-table wrapper and entity not-found panels still use `rounded-xl border border-border`; projector stays on its own surface |
| Button / LinkButton | `src/components/ui/button.tsx` | `rounded-4xl` variants and sizes | Home CTAs, delete cancels, nav, not-found links, and several keep/cancel links use custom `Link` classes |
| Stat tile / leaderboard | `src/components/shared/stat-display.tsx` | Metric `StatTile`, compact inner-tile variant, `HeroStat`, leaderboard heading, reserved dashed section | Warband dashboard still has a local `EmptyState` (Issue C) |
| Dialog | `src/components/ui/dialog.tsx` | Form default `max-h-[calc(100vh-2rem)] overflow-y-auto sm:max-w-2xl`; `size="lg"` lightbox (`sm:max-w-3xl`); `size="xl"` match completion (`sm:max-w-4xl`) | Lightbox still overrides max-height with `max-h-[90dvh]` |

Canonical list-page shell is `<Page>` (`mx-auto w-full max-w-6xl px-4 py-10 sm:px-8`). Collection layouts, equipment, stats, home (`padding="loose"`), and the default 404 use it. `/settings` uses `width="narrow"`, `/queue` uses `width="form"`, and `/queue-jobs` plus `/generated-images` use `width="wide"`.

**Product decision (MOR-54).** `/queue-jobs` and `/generated-images` keep `width="wide"` (`max-w-7xl`). The jobs table is `min-w-5xl` with many columns; the gallery is a 4-column grid at `xl`. Shrinking them to the campaign `max-w-6xl` would clip the table and change gallery density.

## Campaign typography scale (MOR-55)

The reusable class map is `campaignTypography` in `src/components/shared/typography.ts`. Preserve semantic heading levels (`h1`, `h2`, or `h3`) independently of these visual roles.

| Role | Classes |
| --- | --- |
| Display / home | `font-mordheim text-5xl sm:text-7xl` |
| Page title | `font-mordheim text-4xl sm:text-5xl` |
| Section title | `font-mordheim text-2xl` |
| Eyebrow | `text-xs font-semibold uppercase tracking-[0.28em] text-primary` |
| Destructive eyebrow | `text-xs font-semibold uppercase tracking-[0.28em] text-destructive` |
| Muted / supporting body | `text-muted-foreground text-sm` |
| Home display body | `text-lg leading-8` |

**Typeface rule:** Cormorant (`font-serif`) is reserved for entity names in lists, cards, and other compact entity content. Campaign page titles and section titles use Schoensperger (`font-mordheim`). The home keeps its display heading and `text-lg leading-8` display-body role. The `/projector` broadcast surface remains a separate typography system.

---

## Recommended follow-on issues

Group implementation work in this order. Each issue should land shared primitives first, then migrate the listed routes, then use the verification matrix at the end of this document.

### Issue A — Page shell and list headers (P0) — shipped (MOR-54)

**Problem.** Outer width, padding, and landmark choice diverge by route family. List pages that already look “correct” still duplicate the shell class. Diagnostic pages sit on a different grid.

**Shipped.**

- `Page`: `main` with `mx-auto w-full max-w-6xl px-4 py-10 sm:px-8`
- Width/padding variants: `narrow` (`max-w-3xl`), `form` (`max-w-2xl`), `wide` (`max-w-7xl`), `loose` (`py-16 sm:py-24`)
- `IndexPage`, `IndexPageHeader`, and `IndexEmptyState` live in `src/components/shared/index-page.tsx`
- `PagePending` / `PageError` wrap equipment, stats, and admin pending/error states

**Migrated.** `/`, `/warbands`, `/warriors`, `/matches`, `/events`, `/equipment`, `/stats`, `/settings`, `/queue`, `/queue-jobs`, `/generated-images`, plus the default 404.

**Do not migrate.** `/projector`.

### Issue B — Typography scale (P0)

**Problem.** Page titles mix three font treatments. Section titles mix two. Eyebrows exist on some details and not others.

**Ship a documented scale**, then replace route-local heading classes:

| Role | Proposed token | Current majority | Current outliers |
| --- | --- | --- | --- |
| Display / home | `font-mordheim text-5xl sm:text-7xl` | Home | None |
| Page title | `font-mordheim text-4xl sm:text-5xl` | Index headers, match detail | Warrior/event/delete: `font-serif text-4xl font-semibold`; warband: `text-5xl sm:text-6xl`; settings/queue/gallery: `text-3xl` sans |
| Section title | `font-mordheim text-2xl` or `text-3xl` | Stats, warband, CombatLeaderboard | Match/warrior/event sections: `font-serif text-2xl` or `text-3xl` |
| Eyebrow | `text-xs font-semibold uppercase tracking-[0.28em] text-primary` | Detail, not-found, delete | Warband uses the same tracking but `uppercase` as a separate class; stats reserved section uses `tracking-widest` |
| Body / muted | `text-muted-foreground` with `text-sm` for supporting copy | Most routes | Home intro is `text-lg leading-8` (keep as display body) |

Decide once whether Cormorant (`font-serif`) is for entity names in lists/cards only, or also for page titles. Today both uses exist.

### Issue C — Entity chrome (P1)

**Problem.** Every entity family copies back/delete bars, not-found cards, empty states, and destructive confirmations with near-identical Tailwind.

**Ship.**

- `EntityToolbar` — back `LinkButton` + optional destructive action
- `EntityHeader` — eyebrow, title, description, optional actions
- `NotFoundPanel` — used by default 404 and `$entityId/route.tsx` not-found components
- `EmptyState` — merge `IndexEmptyState`, warband-local `EmptyState`, match dashed empty, dialog dashed empties
- `DestructiveConfirm` — delete/void panel including cancel `LinkButton`

**Migrate.** Warband, warrior, match, and event detail/delete/not-found routes. Also `src/router.tsx` default not-found.

### Issue D — Diagnostic/admin pages (P1)

**Problem.** `/settings`, `/queue`, `/queue-jobs`, and `/generated-images` share a second, undocumented design: `section` + `p-6` + `text-3xl` sans titles + outline `LinkButton` clusters. They are not in primary nav.

**Ship.** Reuse Issue A shell and Issue B page title. Extract `AdminPageHeader` (title, description, related-link cluster, optional refresh). Shared pending (`p-6` paragraph) and error (`section space-y-4 p-6`) components.

### Issue E — Surfaces, metrics, and dialog defaults (P2) — shipped (MOR-57)

**Problem.** Route-local “cards” fight the `Card` primitive. Metric tiles are duplicated. Dialog max-width is copy-pasted.

**Shipped.**

- Prefer `Card` over `rounded-xl border border-border bg-card`
- Fold warband `MetricCard` into `StatTile` (label casing is the only real difference)
- Compact `StatTile` variant for warrior muted tiles and match `WarbandStat`
- Default form-dialog class on `Dialog` (`max-h-[calc(100vh-2rem)] overflow-y-auto sm:max-w-2xl`)
- Wider dialog variants: match completion `size="xl"` (`sm:max-w-4xl`), generated-image lightbox `size="lg"` (`sm:max-w-3xl`, plus `max-h-[90dvh]`)
- Shared `CatalogueItem` accordion surface for the equipment catalogue
- Shared `SectionHeading` and `HeroStat` (lifted from warband detail)

**Migrated.** Equipment catalogue, warband hero + metrics, queue family leftovers (settings form), warrior/match compact tiles, form dialogs listed in the audit.

**Left local.** Warband `EmptyState` (Issue C). Data-table wrapper and entity not-found panels (Issue C). `/projector`.

### Issue F — Ad-hoc buttons and links (P2)

**Problem.** Home CTAs, delete “Keep …” links, not-found returns, and root nav items reimplement button/link chrome instead of `Button` / `LinkButton`.

Home currently uses `rounded-lg` while the design-system button is `rounded-4xl`. After Issue F, those CTAs should match other primary/outline buttons.

### Out of unification — Projector (P3 / separate)

`/projector` is a broadcast UI with its own CSS, clamp-based type, and full-viewport layout. Do not force `Page` / `IndexPageHeader` onto it. A later projector-only pass can still share `CombatStatValue` (already used) and portrait loading.

---

## Cross-cutting pattern inventory

These strings are duplicated today. Each row is a candidate for a shared component or a default on an existing primitive.

### 1. Campaign page shell — folded into `Page` (MOR-54)

`Page` now owns the campaign `<main>` class. Remaining local width wrappers are inner columns, not competing landmarks:

| Pattern | Where | Difference |
| --- | --- | --- |
| `max-w-3xl` inner column, no extra main | Warrior and event details | Nested inside collection `Page`, then narrowed again |
| `max-w-2xl` inner column | All delete/void pages | Nested inside collection `Page` |

### 2. List header

`IndexPageHeader` (`border-b border-border pb-7`, title `font-mordheim text-4xl sm:text-5xl`, description muted, action aligned `sm:items-end`).

**Not used by:** home, all details, all deletes, settings/queue/gallery, projector.

Match detail reimplements a similar header (`pb-7`, `font-mordheim text-4xl sm:text-5xl`) instead of reusing it.

### 3. Entity toolbar

```tsx
<div className="flex items-center justify-between gap-4">
  <LinkButton size="sm" variant="outline">← {Collection}</LinkButton>
  <LinkButton size="sm" variant="destructive">Delete {entity}</LinkButton>
</div>
```

Copied on warband, warrior, match, and event details (event hides delete when voided). Delete pages use a muted text `Link` “← Cancel” instead.

### 4. Eyebrow + serif/mordheim title

```txt
text-xs font-semibold uppercase tracking-[0.28em] text-primary
```

Used on not-found, delete/void, warrior/event headers, warband hero/section headings (with `uppercase` as a discrete class). Stats reserved section uses `tracking-widest` instead.

### 5. Not-found panel

```txt
rounded-xl border border-border bg-card px-6 py-14 text-center
```

Four copies in `$entityId/route.tsx` plus the default 404 (which also wraps the campaign `main` with home-like `py-16 sm:py-24`).

### 6. Empty states (four visual dialects)

| Dialect | Classes | Where |
| --- | --- | --- |
| Index | `rounded-xl border border-dashed border-input px-6 py-16 text-center` + `font-mordheim text-2xl` | Warbands, warriors, matches, events, equipment |
| Dialog / gated create | same border, `py-10`, `font-serif text-2xl` | Warriors index (no warband), events index (no staffed match) |
| Match detail | same border, `py-12`, `font-serif text-2xl` | No participating warbands |
| Warband local | `rounded-2xl … bg-card/40 px-6 py-10` + Shield icon + `font-serif text-xl` | Warband dashboard empties |
| Stats reserved | `rounded-2xl border-dashed … bg-card/40 p-6` | Match results placeholder |
| Generated images | solid `rounded-xl border bg-card p-6` paragraph | Empty gallery |
| Projector | dashed `rounded-xl` + clamp serif | Broadcast empty |

### 7. Destructive confirmation

```txt
mx-auto max-w-2xl
mt-7 rounded-xl border border-destructive/50 bg-destructive/10 p-7
font-serif text-4xl font-semibold
Keep {entity} → rounded-lg border border-input px-5 py-2.5 font-semibold
```

Four near-copies: warband/warrior/match delete and event void. Event void adds a reason field; “Keep event” omits `hover:text-foreground` present on the other three keep links.

### 8. Ad-hoc card surface — folded into `Card` (MOR-57)

Equipment catalogue uses `CatalogueItem` (`Card` wrapping `<details>`). Queue form, jobs table wrapper, generated-image tiles/empty copy, warband hero, and the settings instructions form use `Card`. Remaining `rounded-xl border border-border bg-card` surfaces are entity not-found panels (Issue C), the data-table wrapper, and projector.

### 9. Metric tiles — folded into `StatTile` (MOR-57)

`StatTile` (`text-sm` label, `font-mordheim text-4xl` value) is the campaign metric card. Warband match/combat records use it (replacing local `MetricCard`). Compact variant (`rounded-xl border bg-muted/40`, `font-mono`) covers warrior combat tiles and match participant stats. `HeroStat` is the warband hero footer cell with breakpoint-specific left borders.

### 10. Form dialog width — folded into `Dialog` (MOR-57)

`Dialog` defaults to `max-h-[calc(100vh-2rem)] overflow-y-auto sm:max-w-2xl`. Match completion uses `size="xl"` (`sm:max-w-4xl`). Generated-image lightbox uses `size="lg"` (`sm:max-w-3xl`) and overrides max-height with `max-h-[90dvh]`.

### 11. Pending and error — folded into `PagePending` / `PageError` (MOR-54)

Equipment, stats, settings, queue-jobs, and generated-images pending/error states use the campaign `Page` shell. Collection indexes, details, home, queue, and projector still have no dedicated pending/error route components.

---

## Route-by-route findings

Verification notes describe what should still be true after a later migration. “Inconsistent” means the route disagrees with the campaign list-page baseline (`Page` + `IndexPageHeader` typography/spacing), not that the screen is broken.

### App shell

#### `src/routes/__root.tsx` — document + primary nav

| Axis | Finding |
| --- | --- |
| Layout | Header inner bar matches campaign `max-w-6xl px-4 … sm:px-8`, but the outlet is **not** wrapped in a shared `<main>`. Each child supplies its own landmark or none. |
| Surface | `border-b border-border backdrop-blur` header. No shared `NavLink` component; eight `Link`s repeat the same `className` / `activeProps`. |
| Spacing | `py-4` header; `gap-2` wrap. |
| Alignment | `justify-between` with no trailing content (right side is empty). |
| Responsive | `flex-wrap` nav. Fine at phone widths; many items wrap to two rows. |
| Typography | `text-sm` muted links; active is `bg-accent text-primary`. |

**Missing from nav:** `/projector`, `/queue`, `/queue-jobs`, `/generated-images`. Settings is the only diagnostic page linked.

**Verify after migration.** Home through Settings still highlight when active. Projector still hides the header. Nav wrapping and contrast are unchanged except where a shared `NavLink` is introduced.

#### `src/router.tsx` — default not-found

Uses home padding (`Page padding="loose"`) plus the entity not-found card (`rounded-xl … py-14`, `font-serif text-3xl`, text `Link`). Entity not-found screens omit the extra vertical padding because they already sit in a collection `Page`.

**Verify.** Unknown URLs still render the centered not-found card and “Return home →”.

---

### `/` — Home (`src/routes/index.tsx`)

| Axis | Finding |
| --- | --- |
| Layout | `<Page padding="loose">` with campaign max-width and **marketing padding** (`py-16 sm:py-24`). Content capped at `max-w-3xl`. |
| Surface | No cards. CTAs are raw `Link`s styled as buttons (`rounded-lg`, not `rounded-4xl`). |
| Spacing | `mt-5` / `mt-6` / `mt-9` stack. |
| Alignment | Left-aligned; no page header component. |
| Responsive | Title `text-5xl sm:text-7xl`; CTA row `flex-wrap gap-3`. |
| Typography | Only screen using display-size `font-mordheim`. Body is `text-lg leading-8`. |

**Consolidation.** Shell uses `Page` with `padding="loose"`. CTAs → Issue F `LinkButton`.

**Verify.** Headline, supporting copy, and four browse links remain; primary vs outline pairing stays (warbands/warriors filled, matches/events outline).

---

### Warbands

#### `/warbands` layout (`src/routes/warbands/route.tsx`)

Canonical `<Page>`. Index, detail, and delete all inherit it.

#### `/warbands/` index (`src/routes/warbands/index.tsx`)

Uses `IndexPage` + `IndexPageHeader` + `IndexEmptyState`. Table vs empty. Create dialog inherits the `Dialog` form default.

**Inconsistencies.** None on the list shell; all indexes import `IndexPage*` from `@/components/shared/index-page`.

**Verify.** Header title “Warbands”, “New warband” on the right, empty dashed state, populated table, dialog scroll/width (inherited from `Dialog`).

#### `/warbands/$warbandId` not-found (`src/routes/warbands/$warbandId/route.tsx`)

Standard not-found panel. Title `font-serif text-3xl`. Text link back to `/warbands`.

**Verify.** Unknown id shows eyebrow “Not found”, “Unknown warband”, and return link.

#### `/warbands/$warbandId/` detail (`src/routes/warbands/$warbandId/index.tsx`)

The visually richest campaign screen, and the largest source of route-local primitives.

| Axis | Finding |
| --- | --- |
| Layout | `grid gap-10` (indexes use `gap-8`). Full width of collection main (not `max-w-3xl` like warrior/event). Hero is a two-column grid `lg:grid-cols-[minmax(0,1fr)_auto]`. Hero stats `sm:grid-cols-2 lg:grid-cols-5`. Metric grids `sm:grid-cols-2 lg:grid-cols-5`. Living roster `md:grid-cols-2`. Graveyard `sm:grid-cols-2 lg:grid-cols-3`. Event log `sm:grid-cols-[auto_minmax(0,1fr)_auto]`. |
| Surface | Hero uses `Card`. Hero stat row `bg-muted/20` with breakpoint-specific left borders via shared `HeroStat`. Local `EmptyState` (`rounded-2xl` dashed). Graveyard cards tint with `bg-muted/20` on `Card`. Event outcome chips are ad-hoc pills. |
| Spacing | Section headings then `mt-5` grids. Toolbar has no `mb-*` (gap-10 on the parent provides it). |
| Alignment | Toolbar space-between. Hero rating right-aligned. Event timestamps `sm:text-right`. Roster cards space-between. |
| Responsive | Hero stats borders: `sm:[&:not(:nth-child(odd))]:border-l` vs `lg:[&:not(:first-child)]:border-l` — at `sm` even columns get a divider; at `lg` every column but the first does. Easy to regress. |
| Typography | Hero title `font-mordheim text-5xl sm:text-6xl` (larger than list/match titles). Section titles `font-mordheim text-3xl`. Roster names `font-serif text-xl`. Local `SectionHeading` eyebrows match the global eyebrow pattern. |

**Local components remaining.** `EmptyState` (Issue C). `SectionHeading`, `MetricCard`, and `HeroStat` now live in `src/components/shared/`.

**Verify after migration.**

- Back and delete remain opposite ends of the first row
- Faction eyebrow, warband name, rating, and Edit stay in the hero
- Five hero stats still divide with borders at sm and lg
- Match record and combat record still show five metric tiles
- Living / graveyard / events empty states still appear for an empty warband
- Leaderboard still uses shared `CombatLeaderboard` styling
- Edit warband / add warrior / edit warrior dialogs still scroll inside the viewport

#### `/warbands/$warbandId/delete` (`src/routes/warbands/$warbandId/delete.tsx`)

Canonical destructive confirm. Nested `max-w-2xl` inside the already padded collection main (so the panel is narrower than list content, which is intended).

**Verify.** Cancel link, destructive panel, blocked-vs-allowed copy, Keep warband outline control.

---

### Warriors

#### `/warriors` layout (`src/routes/warriors/route.tsx`)

Same campaign `<Page>` as warbands.

#### `/warriors/` index (`src/routes/warriors/index.tsx`)

Matches warbands index. Extra dashed empty **inside** the create dialog when no warbands exist (`py-10`, `font-serif text-2xl`) — different from `IndexEmptyState` (`py-16`, `font-mordheim`).

**Verify.** Header, table, empty, dialog, and “A warband is required” gated state.

#### `/warriors/$warriorId` not-found (`src/routes/warriors/$warriorId/route.tsx`)

Same not-found panel as warband.

#### `/warriors/$warriorId/` detail (`src/routes/warriors/$warriorId/index.tsx`)

| Axis | Finding |
| --- | --- |
| Layout | Extra `mx-auto max-w-3xl` inside collection main. Stack of toolbar, border header, then cards with `mt-7`. |
| Surface | Header is a bottom border only (no hero card, unlike warband). Portrait, equipment, stats, and form use `Card`. Stat cells use compact `StatTile`. |
| Spacing | `mt-7` between major blocks vs warband `gap-10` vs match `gap-8`. |
| Alignment | Same toolbar as other entities. Stats `grid-cols-2 sm:grid-cols-3`. |
| Responsive | Narrow column reads well on desktop but wastes the collection max-width; warband/match details stay wide. |
| Typography | Title is `font-serif text-4xl font-semibold`, **not** `font-mordheim`. Section h2s in this route and in `warrior-portrait.tsx` / `warrior-equipment.tsx` are `font-serif text-2xl`. |

**Verify.** Back/delete, eyebrow (warband · class), name, portrait card, equipment card, combat stats, profile form. Confirm title font after Issue B.

#### `/warriors/$warriorId/delete`

Same destructive confirm as warband delete.

---

### Equipment

#### `/equipment` (`src/routes/equipment.tsx`)

| Axis | Finding |
| --- | --- |
| Layout | Own `<Page>` (no `equipment/route.tsx`) wrapping `IndexPage`. Pending/error use `PagePending` / `PageError`. |
| Surface | Catalogue rows use shared `CatalogueItem` (`Card` wrapping `<details>`). |
| Spacing | Filters `flex-col gap-4 sm:flex-row sm:items-end`. Accordion list `grid gap-3`. |
| Alignment | Filter buttons sit at end of the search field on `sm+`. |
| Responsive | Inner dl `sm:grid-cols-2 lg:grid-cols-4`. |
| Typography | Header via `IndexPageHeader` (mordheim). Error title `font-mordheim text-3xl` (smaller than page titles). Accordion names `font-semibold` sans. Nested “Full source text” is an `h2` at `font-semibold` — not on the section-title scale. |

**Verify.** Header + refresh, search/type filters, count output, empty (no data vs no matches), expanded item metadata, pending and error screens use the shared shell.

---

### Matches

#### `/matches` layout (`src/routes/matches/route.tsx`)

Canonical `<Page>`.

#### `/matches/` index (`src/routes/matches/index.tsx`)

Aligned with warbands/warriors/events indexes.

**Verify.** Header, table/empty, new-match dialog width.

#### `/matches/$matchId` not-found

Same not-found panel.

#### `/matches/$matchId/` detail (`src/routes/matches/$matchId/index.tsx`)

| Axis | Finding |
| --- | --- |
| Layout | `grid gap-8` (matches indexes, not warband’s `gap-10`). Full width. Participant cards `lg:grid-cols-2`. Warrior rows change columns at `sm`. |
| Surface | Page header is a bottom border (like warrior/event), not a hero card. Participants use `Card`. Empty participants: dashed `py-12`. Warrior rows: `rounded-lg border bg-background`. WarbandStat tiles use compact `StatTile`. |
| Spacing | Header `pb-7` matches `IndexPageHeader`. Duplicate “Add event” in the page header **and** the events section header. |
| Alignment | Header actions wrap (`md:items-end`). Events heading row `sm:flex-row sm:items-end`. |
| Responsive | Participant warrior stats collapse to a single extra line on small screens (`sm:hidden` / `sm:block`). |
| Typography | Title `font-mordheim text-4xl sm:text-5xl` (aligned with list pages). Section h2s `font-serif text-3xl` (not mordheim, unlike warband/stats). Empty h3 `font-serif text-2xl`. |

**Verify.** Toolbar, badges + title + status actions, both Add event buttons, events table, two-column rosters, empty participants, match image block, completion/edit/new-event dialogs.

#### `/matches/$matchId/delete`

Same destructive confirm.

---

### `/stats/` (`src/routes/stats/index.tsx`)

| Axis | Finding |
| --- | --- |
| Layout | Own `<Page>` wrapping `IndexPage` (no `stats/route.tsx`). Pending/error use `PagePending` / `PageError`. Totals `sm:grid-cols-3`. Charts `lg:grid-cols-2`. Reserved section sits in `md:grid-cols-2` **with one child**, so it never fills the row. |
| Surface | Uses `Card`, `StatTile`, `CombatLeaderboard`, `ReservedStatSection` — closest to the target shared system. Header action is a pill (`rounded-full border … text-xs`) rather than a button. |
| Spacing | `IndexPage` `gap-8`. Extra `mb-4` on campaign totals h2 (leaderboards put titles inside cards). |
| Alignment | Chart empty copy is centered in `h-80`. |
| Responsive | Vertical bar chart Y-axis width 100px; long names truncate at 14 chars. |
| Typography | Page title via `IndexPageHeader`. Section/chart titles `font-mordheim text-2xl`. Reserved eyebrow uses `tracking-widest`, not `tracking-[0.28em]`. |

**Verify.** Live badge, three totals, two charts (or empty copy), two leaderboards, reserved match-results panel. After Issue A, padding should still match `/warbands`.

---

### Events

#### `/events` layout (`src/routes/events/route.tsx`)

Canonical `<Page>`.

#### `/events/` index (`src/routes/events/index.tsx`)

Aligned with other indexes. Dialog gated empty uses `font-serif` / `py-10` like warriors.

**Verify.** Header, table/empty, new-event dialog, gated “two staffed warbands” message.

#### `/events/$eventId` not-found

Same not-found panel.

#### `/events/$eventId/` detail (`src/routes/events/$eventId/index.tsx`)

Structurally the same as warrior detail: toolbar, `mt-7` border header, `max-w-3xl`, `Card` body, `font-serif text-4xl font-semibold` title. Voided banner is `rounded-xl border bg-muted/40`. Delete action is labeled “Void event” and hidden when already voided.

**Verify.** Back, void (when active), eyebrow “Knock down”, match name title, outcome form or voided note, optional edit form, event image.

#### `/events/$eventId/delete` (void)

Destructive panel with eyebrow “Historical correction”. Adds a reason `Field`. Keep-event link is missing `hover:text-foreground` used on the other keep links.

**Verify.** Cancel, reason required before Void, keep link.

---

### Diagnostic / admin

These four routes share a second visual language. They are the highest-contrast inconsistency versus the campaign pages.

These four routes now use `Page` (Issue A) but still share a second header language: `flex flex-col gap-6`, `h1.text-3xl` (sans, no mordheim), outline `LinkButton` clusters. Pending/error use `PagePending` / `PageError`.

#### `/settings` (`src/routes/settings.tsx`)

`Page width="narrow"` (`max-w-3xl`). Header links sit **above** the description. Pending/error use `PagePending` / `PageError`. Form is wrapped in `Card` inside `ImageGenerationSettingsForm`.

**Verify.** Title, three related links, description, instructions form, loading and D1 error retry.

#### `/queue` (`src/routes/queue.tsx`)

`Page width="form"` (`max-w-2xl`). Same header cluster (jobs/images/settings). Form uses `Card`. No pending/error route components.

**Verify.** Title, links, prompt/model/submit, status `output`, footer note.

#### `/queue-jobs` (`src/routes/queue-jobs.tsx`)

`Page width="wide"` (`max-w-7xl`) — **wider than campaign pages, by product decision**. Header is `items-start justify-between` with actions on the right (closer to `IndexPageHeader` than settings). Table wrapped in `Card`. `Table` has `min-w-5xl` so the card must scroll horizontally on smaller viewports; there is no explicit `overflow-x-auto` on the wrapper.

**Verify.** Title, related links, refresh, empty table, populated columns, pending, retry error.

#### `/generated-images` (`src/routes/generated-images.tsx`)

`Page width="wide"` (`max-w-7xl`) like jobs. Empty is a `Card` paragraph. Grid `sm:2 lg:3 xl:4`. Tiles use `Card`. Lightbox dialog `size="lg"` (`sm:max-w-3xl`) with `max-h-[90dvh]`.

**Verify.** Title, links, refresh, empty copy, grid, enlarge dialog, image error text.

---

### `/projector` (`src/routes/projector.tsx`)

| Axis | Finding |
| --- | --- |
| Layout | `fixed inset-0 flex h-dvh` full-bleed. Header/strap/body/rundown/ticker. Rail + stage. Not in the campaign shell; root hides primary nav. |
| Surface | Mostly `src/projector.css` (`.broadcast-*`, `.standings-*`, `.match-card`, …) plus some Tailwind borders/cards. |
| Spacing | Clamp-based gaps (`clamp(1rem,2vh,2rem)`). |
| Alignment | Broadcast-specific; rundown + controls on one row. |
| Responsive | `md`/`lg`/`xl` grids inside segments; designed for a large display more than a phone. |
| Typography | Mix of `font-mordheim` display and `font-serif` names, all clamp-sized. Eyebrows use `tracking-[0.3em]` / `font-black` rather than the campaign `tracking-[0.28em] font-semibold`. |

**Do not** migrate onto `Page` / `IndexPageHeader`. Optional later: share portrait and empty-state internals only.

**Verify (projector-specific).** Nav hidden, live header, segment rundown, pause/fullscreen, ticker. Unification work must not change this layout.

---

### `/api/generated-images/$jobId`

No UI. Skip visual verification.

---

## Suggested primitive map

Concrete replacements for follow-on PRs. Names are suggestions; match existing `src/components/shared/` style.

| New or extended primitive | Replaces | First consumers |
| --- | --- | --- |
| `Page` | **Shipped (MOR-54).** Campaign `<main>` plus width/padding variants | All non-projector routes |
| `PageHeader` (extend `IndexPageHeader`) | Match detail header, admin headers, warrior/event headers | List pages, match detail, settings family |
| `EntityToolbar` | Four detail toolbars | Warband, warrior, match, event details |
| `NotFoundPanel` | Five not-found cards | Entity routes + `router.tsx` |
| `EmptyState` | Index, dialog, match, warband empties | List pages, warband dashboard, match detail |
| `DestructiveConfirm` | Four delete/void pages | Warband, warrior, match, event |
| `SectionHeading` | **Shipped (MOR-57).** Warband local heading | Warband detail |
| `StatTile` (extend) | **Shipped (MOR-57).** Warband `MetricCard` plus compact warrior/match tiles | Warband + stats + warrior + match |
| `HeroStat` | **Shipped (MOR-57).** Warband hero footer cells | Warband detail |
| `CatalogueItem` | **Shipped (MOR-57).** Equipment `<details>` accordion | `/equipment` |
| `NavLink` | Eight root `Link`s | `__root.tsx` |
| `Dialog` default class | **Shipped (MOR-57).** Repeated max-height/width; `size="lg"`/`size="xl"` variants | All form dialogs; completion; lightbox |
| `AdminRelatedLinks` | Repeated queue/settings/gallery `LinkButton` rows | Four diagnostic routes |
| Typography utilities or a short heading component | Mixed `font-mordheim` / `font-serif` titles | After Issue B decision |

---

## Priority snapshot

| Priority | Theme | Why first | Routes most affected |
| --- | --- | --- | --- |
| P0 | Page shell | Every screen’s width/padding depends on it; admin pages will keep looking foreign until this lands | All except projector |
| P0 | Typography scale | Headings are the most obvious family split (`mordheim` vs `serif` vs sans `text-3xl`) | Details, deletes, admin, match sections |
| P1 | Entity chrome | High duplication, low design disagreement | Warband/warrior/match/event + 404 |
| P1 | Admin pages | Second design system; same four-page cluster | settings, queue, queue-jobs, generated-images |
| P2 | Surfaces, tiles, dialogs | Visible but local; easier once shell/type exist | Equipment, queue family, warband hero, stats |
| P2 | Buttons/links | Home and delete actions will still look like a different kit until this | Home, deletes, 404, root nav |
| P3 | Projector | Separate product surface | `/projector` only |

---

## Verification matrix

Use this after each migration PR. Mark a cell passing only after visiting the route (or the listed empty/error path) in the browser.

Legend: **S** shell/padding/width · **T** typography · **C** chrome (toolbar/empty/not-found/delete) · **R** responsive arrangement.

| Route | S | T | C | R | Checks |
| --- | --- | --- | --- | --- | --- |
| `/` | ✓ | | | | Display title; four CTAs use shared buttons; loose vertical padding |
| `/warbands` | ✓ | | | | `Page` + `PageHeader`; empty dashed; new dialog |
| `/warbands/$id` | ✓ | | | | Toolbar; hero; five-up stats at lg; empties; leaderboard |
| `/warbands/$id` unknown | ✓ | | | | Shared not-found panel |
| `/warbands/$id/delete` | ✓ | | | | Shared destructive confirm |
| `/warriors` | ✓ | | | | Same list pattern as warbands; gated dialog empty |
| `/warriors/$id` | ✓ | | | | Title on the agreed scale; cards; stats tiles |
| `/warriors/$id` unknown | ✓ | | | | Shared not-found |
| `/warriors/$id/delete` | ✓ | | | | Shared destructive confirm |
| `/equipment` | ✓ | | | | Same shell as lists; pending/error use `Page`; accordion surface |
| `/matches` | ✓ | | | | Same list pattern |
| `/matches/$id` | ✓ | | | | Header actions wrap; events + rosters; empty participants |
| `/matches/$id` unknown | ✓ | | | | Shared not-found |
| `/matches/$id/delete` | ✓ | | | | Shared destructive confirm |
| `/stats` | ✓ | | | | Same shell as lists; totals/charts/leaderboards; reserved panel width |
| `/events` | ✓ | | | | Same list pattern; gated dialog empty |
| `/events/$id` | ✓ | | | | Same detail chrome as warrior; void hidden when voided |
| `/events/$id` unknown | ✓ | | | | Shared not-found |
| `/events/$id/delete` | ✓ | | | | Destructive confirm + reason field |
| `/settings` | ✓ | | | | Campaign shell + page title scale; related links; error retry |
| `/queue` | ✓ | | | | Same header cluster; form on `Card` |
| `/queue-jobs` | ✓ | | | | Same header; table scrolls; width decision documented |
| `/generated-images` | ✓ | | | | Same header; empty; grid 1/2/3/4 cols; lightbox |
| `/projector` | ✓ | | | | Unchanged broadcast layout; app nav still hidden |
| Unknown URL | ✓ | | | | Default not-found uses shared panel |

**Width decision (MOR-54).** `/queue-jobs` and `/generated-images` stay `width="wide"` (`max-w-7xl`). Do not shrink them to `max-w-6xl` when ticking **S**.

---

## File checklist (every UI route reviewed)

| File | UI? | Notes |
| --- | --- | --- |
| `src/routes/__root.tsx` | Yes | Nav + projector exception |
| `src/router.tsx` | Yes | Default not-found |
| `src/routes/index.tsx` | Yes | Home |
| `src/routes/warbands/route.tsx` | Yes | Shell only |
| `src/routes/warbands/index.tsx` | Yes | List |
| `src/routes/warbands/$warbandId/route.tsx` | Yes | Not-found |
| `src/routes/warbands/$warbandId/index.tsx` | Yes | Detail |
| `src/routes/warbands/$warbandId/delete.tsx` | Yes | Confirm |
| `src/routes/warriors/route.tsx` | Yes | Shell only |
| `src/routes/warriors/index.tsx` | Yes | List |
| `src/routes/warriors/$warriorId/route.tsx` | Yes | Not-found |
| `src/routes/warriors/$warriorId/index.tsx` | Yes | Detail |
| `src/routes/warriors/$warriorId/delete.tsx` | Yes | Confirm |
| `src/routes/equipment.tsx` | Yes | List + pending/error |
| `src/routes/matches/route.tsx` | Yes | Shell only |
| `src/routes/matches/index.tsx` | Yes | List |
| `src/routes/matches/$matchId/route.tsx` | Yes | Not-found |
| `src/routes/matches/$matchId/index.tsx` | Yes | Detail |
| `src/routes/matches/$matchId/delete.tsx` | Yes | Confirm |
| `src/routes/stats/index.tsx` | Yes | Dashboard |
| `src/routes/events/route.tsx` | Yes | Shell only |
| `src/routes/events/index.tsx` | Yes | List |
| `src/routes/events/$eventId/route.tsx` | Yes | Not-found |
| `src/routes/events/$eventId/index.tsx` | Yes | Detail |
| `src/routes/events/$eventId/delete.tsx` | Yes | Void confirm |
| `src/routes/settings.tsx` | Yes | Admin |
| `src/routes/queue.tsx` | Yes | Admin |
| `src/routes/queue-jobs.tsx` | Yes | Admin |
| `src/routes/generated-images.tsx` | Yes | Admin |
| `src/routes/projector.tsx` | Yes | Separate system |
| `src/routes/api/generated-images/$jobId.ts` | No | Binary response |
