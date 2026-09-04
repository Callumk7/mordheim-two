# Match interface plan

## Context

Replace the current match-detail editing placeholder at `src/routes/matches/$matchId/index.tsx` with a useful in-match workspace that surfaces participating warbands, lists the match event history, and makes adding events quick.

## Approach

- Keep the match route backed by the existing live TanStack DB collections and derive display rows by joining events to warbands and warriors, ordered newest first.
- Reframe the page as a wider match workspace: match identity/status and actions in the header, participant cards with rosters, then event history.
- Show each participating warband in a responsive card with `name`, `faction`, `captain`, `rating`, and `status`, followed by its roster. Each warrior row will show the established roster fields (`name`, `class`, `status`, `injuries`, and `knockedDowns`) and link to the warrior detail; the card links to the warband detail.
- Put the existing `MatchForm` in an **Edit match** dialog. Preserve participant locking for warbands referenced by existing events and close the dialog only after persistence succeeds.
- Put event creation in an **Add event** dialog. Use a match-scoped `EventForm` mode that fixes/hides `matchId`, offers only staffed participating warbands, retains its existing attacker/defender and warrior validation, and closes after persistence succeeds.
- Use generic “event” language throughout this page and dialog even though the current event records represent knock downs.
- Render a dedicated match-events table with attacker and defender warrior/warband labels, notes, recorded timestamp, and view/delete actions. Keep event edits/deletes connected to the existing event detail routes.
- When the match lacks two participating warbands with warriors, keep **Add event** unavailable and explain the prerequisite near the events section rather than opening an unusable form.

## Files to modify

- `src/routes/matches/route.tsx` — preload `warriors` alongside the other collections required by the client-only match route.
- `src/routes/matches/$matchId/index.tsx` — primary workspace, live joined data, participant/roster cards, dialog state, event creation, and match update behavior.
- `src/components/event-form.tsx` — add an explicit match-scoped option that omits the match selector without changing the general event create/edit flows.
- `src/components/table/match-events-table.tsx` (new) — focused event history table without the redundant match column.

Participant cards can remain private components in the match route unless implementation size warrants a focused `src/components/match-participant-card.tsx`; they are not currently a repeated shared pattern.

## Reuse

- `getCollections()` from `src/db-collections/index.ts` and `useLiveQuery` joins already demonstrated in `src/routes/events/index.tsx`.
- `EventForm` from `src/components/event-form.tsx`, including its participant/warrior validation and `getParticipantWarbandIds` / `getWarriorsForWarband` helpers from `src/lib/event-options.ts`.
- `events.insert(...)` optimistic persistence flow from `src/routes/events/index.tsx`.
- `DataTable`, `TableActionLink`, and `TableActions` from `src/components/table/data-table.tsx` and `src/components/ui/table.tsx`; `WarbandWarriors` in `src/components/table/warbands-table.tsx` supplies the established roster content pattern.
- `Button`/`LinkButton`, `Card` subcomponents, and controlled `Dialog` primitives under `src/components/ui/`.
- Existing event edit/delete routes at `src/routes/events/$eventId/` and match delete route at `src/routes/matches/$matchId/delete.tsx`.

## Steps

- [x] Extend the `/matches` layout preload to include `warriors`, since the match workspace is client-only and roster/event forms depend on that collection.
- [x] Replace the narrow edit-page layout with a responsive match header showing scenario, name, formatted status, a primary **Add event** action, secondary **Edit match**, back navigation, and the existing delete route.
- [x] Build live match-scoped participant data from `warbandMatches`, `warbands`, and `warriors`, then render participant cards and full read-only rosters with links to their existing detail pages.
- [x] Build a live event query joined to attacker/defender warbands and warriors; select a typed display row and order by `createdAt` descending.
- [x] Add `MatchEventsTable` using the existing `DataTable` infrastructure, with recorded time, attacker, defender, notes, and event view/delete actions plus a match-specific empty message.
- [x] Add a backwards-compatible match-scoped mode to `EventForm` so the add dialog does not display a redundant match selector.
- [x] Implement the controlled **Add event** dialog using seeded attacker/defender warbands and warriors, `safeRandomUUID()`, and `events.insert(...)`; remount/reset the form between successful submissions and prevent entry when eligibility requirements are not met.
- [x] Move `MatchForm` into a controlled **Edit match** dialog and preserve the current `updateMatchTransaction` addition/removal logic and event-based participant locks.
- [x] Keep generic event wording and provide clear empty/prerequisite messaging while retaining route-level not-found behavior.

## Verification

- Run `pnpm format`, `pnpm lint`, `pnpm check`, and `pnpm test`.
- Manually verify responsive layouts for a match with no participants, one staffed participant, two or more staffed participants, empty rosters, and long names/notes.
- Verify **Add event** is unavailable with explanatory copy until two staffed participant warbands exist; then create an event and confirm it appears immediately at the top of the table with correct labels and persistence after refresh.
- Verify **Edit match** updates metadata/participants, cannot remove a participant referenced by an event, and closes only after persistence.
- Verify event view/delete, warband, warrior, match back, and match delete navigation.
- Before implementation edits, load the required TanStack Intent guidance for React DB/live queries, optimistic mutations, and client-side collection preloading per `AGENTS.md`.
