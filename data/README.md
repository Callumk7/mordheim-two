# Mordheimer weapons and armour catalogue

Reviewed against these source pages on 2026-09-09:

- https://mordheimer.net/docs/weapons-armour/close-combat — 65 records
- https://mordheimer.net/docs/weapons-armour/missile — 22 records
- https://mordheimer.net/docs/weapons-armour/blackpowder — 20 records (17 weapons and 3 ammunition types)
- https://mordheimer.net/docs/weapons-armour/armour — 18 records

These 125 records are a source catalogue, not executable combat or purchasing rules. Each JSON file is an array accepted by `EquipmentFieldsSchema` in `src/db/validation/equipment.ts`.

## Field contract

- `name`: the displayed item name. Separately displayed aliases (Club, Hammer, Mace, and Club, Mace or Hammer) and historical variants remain separate records.
- `cost`: the displayed **price expression as text**, including units and qualifications, or `null` when no cost is stated. Do not parse it as a single gold-crown amount or use it for arithmetic.
- `availability`, `range`, `strength`: displayed profile text, or `null` when absent/not applicable. Restrictions and variant profiles remain in the source text.
- `save`: the displayed basic armour-save stat, not every saving effect or enemy save modifier. Helmet, Cooking Pot Helmet and Enchanted Skins have conditional saves in their rules, not an ordinary armour-save stat; their `save` remains `null`. Weapon save modifiers also remain in their rules.
- `specialRules`: source-displayed rule labels (or the complete rule when unlabeled). This is a summary, **not** a list of globally interchangeable rule definitions: e.g. different items' Movement Penalty and Heavy rules can have opposite effects.
- `sourceUrl`: the original page and actual item anchor. Ammunition links to its parent Swivel Gun section, because individual ammunition blocks have no anchors.
- `sourceText`: the full per-item static page transcription, including attribution, introductions, displayed stats, rule bodies, tables and editorial notes. Block/line breaks, numbered lists and table rows (` | ` separated cells) are preserved as plain text. HTML markup, navigation, decorative/tooltip icons and link destinations are omitted; this is not HTML to render. Tooltip-only FAQs and external linked rules are not embedded. Swivel Gun retains its full ammunition section as well as the separate ammunition records.
- `notes`: catalogue annotations for missing values, source ambiguities and material/ammunition context; `null` when no additional annotation is needed. These are not quoted source rules.

Source-backed records include all fields explicitly. The database also permits null provenance/text/notes for equipment created without a published source. Empty strings are not a substitute for null in validation.

## Pricing fidelity

The former numeric normalization has been removed rather than retaining a second, misleading price:

- Dice additions remain intact, e.g. Beastlash `10 + 1D6 gc` and Elf Bow `35 + 3D6 gc`.
- Brace offers stay with the weapon: Double-barrelled Duelling Pistol is `45 + 2D6 gc (80 + 4D6 gc for a brace)` and Double-barrelled Pistol is `25 + 1D6 gc (46 + 2D6 gc for a brace)`. Neither brace base equals twice the single price. No unlisted brace prices are invented.
- Dagger retains `1st free/2 gc`; explicit pair prices retain `per pair`. Additional pair/set qualifications can also occur in rule text.
- Gromril Weapon, Ithilmar Weapon and Obsidian Weapon retain `4 x Price`, `3 x Price` and `4 x Price`. These are material multipliers, not 4/3/4 gold crowns. They are not expanded into every possible base weapon.
- Dark Elf Blade retains `+ 20 gc`: an upgrade surcharge on a sword or dagger, retaining the base weapon's abilities, not a standalone 20-gc weapon.
- Bec de Corbin, Fist, Firepots Miragliano and Masterwork Heavy Armour have **unknown** costs (`null`), not free (`0`).
- Even a simple cost line can have further qualifications: Chaos Armour's cost reduction by Hero experience is preserved in `sourceText`. This catalogue does not calculate final purchase prices.

## Source qualifications

- Ball Shot, Chain Shot and Grape Shot remain `weapon` records for compatibility, with notes identifying Swivel Gun ammunition bought per game. Separate availability is not stated. Swivel Gun's range/strength come from ammunition and are therefore null on the gun itself. Its mandatory Blackpowder Rules paragraph is retained from the raw page HTML.
- Mechanical Suit has no stated save and repeats several Chaos Armour paragraphs. Both the missing save and the wording ambiguity are retained, not corrected by guessing.
- Crossbow pistol displays conflicting-looking Ballistic Skill and Weapon Skill hand-to-hand rules; both remain. The catalogue does not resolve their interaction.
- Sunstaff (Lustria)'s profile says `As user`; its S4 ranged Sunbolt remains in the rule text. Serpent Staff's alternate attack and the conditional helmet saves likewise remain qualified rather than replacing their displayed stats.
- The pages' editorial notes on javelin variants, the old Tilean Pike, the two Obsidian rulesets, and Brass Knuckles' removed status remain in `sourceText`. Lamellar Armour's rarity question icon is noted explicitly. Different Double-barrelled Duelling Pistol and Duelling Pistol ranges (9 and 10 inches) are retained.
- This review verifies the supplied website, not the historical print publications or tooltip-only FAQs. A source link is not a claim that ambiguous rules have been adjudicated.

## Database migration

`0015_equipment_source_catalogue.sql` changes cost to nullable text, permits nullable profile fields, and adds provenance, source text and notes. It backs up and restores `warrior_equipment` while rebuilding the parent table, preserving equipment IDs, assignments, timestamps, indexes and cascading foreign keys with D1 foreign-key enforcement enabled.

Existing database costs are cast to text **without inventing source information** and receive a legacy-cost warning in `notes`. Existing zeroes or multipliers cannot safely be identified from the number alone; this migration does not rewrite existing rows to match the catalogue by name. Reconcile legacy rows explicitly when importing rather than interpreting their text as a verified source price.

## Importing the catalogue

`scripts/import-equipment.ts` imports exactly `armour.json`, `blackpowder.json`, `close-combat.json`, and `missile.json` from this directory into `mordheim-two-db` using the repository's `wrangler.jsonc`. Install dependencies with `pnpm install` first. The script uses the existing `tsx` runtime and resolves paths from the repository, not the caller's working directory.

Validate first (no files written, Wrangler invoked, authentication needed, or database contacted):

```sh
pnpm db:import:equipment:local --dry-run
pnpm db:import:equipment:remote --dry-run
```

Apply the migrations **separately** to the intended target before importing, including `0015_equipment_source_catalogue.sql`. The importer never applies migrations:

```sh
# Local development database
pnpm db:migrate:local
pnpm db:import:equipment:local

# Remote Cloudflare database: review the configured database/account first
pnpm exec wrangler login
pnpm exec wrangler whoami
pnpm db:migrate:remote
pnpm db:import:equipment:remote --confirm-remote
```

For CI, supply Wrangler authentication through secure environment variables (e.g. `CLOUDFLARE_API_TOKEN` with D1 edit permission and `CLOUDFLARE_ACCOUNT_ID`), not arguments or committed files. Remote imports require `--confirm-remote` even in non-interactive environments. This explicitly authorizes the write and answers Wrangler's subsequent prompts with `--yes`; omitting it fails without contacting D1. There is no default target: direct invocation requires exactly one of `--local` or `--remote`. `pnpm exec tsx scripts/import-equipment.ts --help` lists options.

### Validation, identity and re-import policy

- Every file must parse as an array of strict `EquipmentFieldsSchema` records. Generated records are also validated with `EquipmentSchema`. Unknown fields (including supplied IDs/timestamps), malformed records, duplicate identities, empty catalogues and literal NUL bytes in SQL text fail before Wrangler is invoked. Errors exit nonzero.
- An import identity is the JSON tuple `[sourceUrl, name]` **after schema validation/trimming**. Names and URLs are otherwise case-sensitive and are not slugified or URL-normalized; a null URL is permitted and participates in the tuple. The ID is `equipment-catalogue-` plus the full lowercase SHA-256 hex digest of that UTF-8 tuple. File order, file location and non-identity field edits do not change IDs. Ammunition sharing Swivel Gun's URL has distinct names and therefore distinct IDs.
- Re-runs use `INSERT ... ON CONFLICT(id) DO UPDATE`, never `REPLACE`. Existing catalogue rows are updated in place, preserving IDs, `created_at`, and warrior-equipment assignments. Identical rows are left untouched, including `updated_at`; changed rows get a new `updated_at`. New rows use database timestamp defaults.
- Existing manually-created or legacy rows with different IDs are **not matched or merged by name**, even if the name/source matches. They remain untouched and may appear alongside the imported catalogue. Reserve the `equipment-catalogue-` ID namespace for this importer. Reconcile legacy duplicates and reassign warriors explicitly if desired; this script does not perform that reconciliation.
- Renaming an item or changing its source URL creates a new identity. Removed records are not deleted from the database. Review and reconcile identity changes deliberately to avoid stranding existing assignments on an older catalogue row. Re-imports overwrite edits to catalogue-owned fields on matching IDs.
- SQL uses escaped string literals, SQL `NULL`, and JSON-serialized `specialRules`. A temporary SQL file is removed on normal completion or failure, and Wrangler failures propagate as a nonzero exit. Forced termination can leave a file in the OS temporary directory. No whole-file rollback guarantee is added by the script: if execution fails, inspect the error and safely re-run after correcting it.

The implementation has been validated using dry runs and scratch in-memory SQLite only; adding the script does not apply migrations or upload data.
