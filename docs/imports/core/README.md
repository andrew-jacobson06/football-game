# Divisions, teams and initial settings imports

These four SQL files load the **uploaded workbook snapshot**, not live Google Sheets.
They do not connect the app to SQLite or alter the current Sheets provider.
The AFL league and 107 player identities were loaded separately.

## Run in this order

| File | Destination | Expected reviewed records |
| --- | --- | ---: |
| [01-divisions.sql](01-divisions.sql) | `divisions` | 2 |
| [02-teams.sql](02-teams.sql) | `teams` | 10 |
| [03-settings-versions.sql](03-settings-versions.sql) | `settings_versions` | 1 |
| [04-configuration-tables.sql](04-configuration-tables.sql) | `configuration_tables` | 38 |

Download each file using GitHub's **Download raw file** button.
In DB Browser for SQLite:

1. Save any pending edits with **Write Changes**. Back up the database with `npm run db:backup` from `apps/api` before importing.
2. Open **Execute SQL**, then **Open SQL file** and choose the first file.
3. Execute the **entire file**. Do not execute a selected fragment or a single statement.
4. Check the final `reviewed_records_present` count against the table above.
5. Click **Write Changes** to save. Repeat for the next file.

These scripts use **SAVEPOINT**, which works inside DB Browser's existing transaction and also when run standalone. They intentionally have no `BEGIN` or `COMMIT`; do not remove their SAVEPOINT/RELEASE statements. If DB Browser owns the surrounding transaction, **Write Changes** is required after success.

Each file checks for the expected AFL league ID (`36c6e53f-7be2-5a94-84a8-0df871aae9fd`), checks existing identities/data, and inserts without replacing records. Identical reruns are safe. A preflight conflict rolls back the transaction: save unrelated work before starting and stop on an error. Each file is its own unit; a failed later file does not undo earlier files already saved with Write Changes.

## Divisions and teams

Division names and order come from `Divisions`: West, then East. Team IDs are stable UUIDv5 identifiers derived from the spreadsheet's existing numeric team IDs, using the same initial-import namespace as the player preview. The numeric IDs are retained as TEXT in `teams.legacy_team_id`.

| Legacy ID | Abbreviation | Location | Nickname | Division |
| --- | --- | --- | --- | --- |
| 1 | POR | PORTLAND | WILDFIRE | West |
| 2 | CLT | CHARLOTTE | KINGSMEN | East |
| 3 | ABQ | ALBUQUERQUE | VORTEX | West |
| 4 | MIL | MILWAUKEE | FORGE | West |
| 5 | SAN | SAN ANTONIO | OUTLAWS | West |
| 6 | NAS | NASHVILLE | SHOCK | East |
| 7 | SAC | SACRAMENTO | GOLD RUSH | West |
| 8 | COL | COLUMBUS | TALONS | East |
| 9 | RIC | RICHMOND | REBELLION | East |
| 10 | TAL | TALLAHASSEE | MAKOS | East |

`teams` holds permanent identity only. Abbreviations, location, nickname, logos, jerseys, uniforms, colors, cap space and division membership belong in `team_seasons`, after the season is created. These source values are preserved in the team import's `source_record_mappings.original_record_json` and in [preview.json](preview.json). The workbook's `Teams.Division` and `TeamDivisions` agree for all ten teams. No season, team-season, or roster rows are inserted here.

## Settings version and configuration

File 03 creates version **1**, labeled **Initial uploaded workbook settings snapshot**, with status **draft**. Its content hash freezes the exact configuration records. File 04 requires that matching draft version. Changes to an existing version cause a conflict instead of overwriting it. Later settings changes should create a new version.

File 04 stores all 38 blocks from [settings-map.csv](settings-map.csv):

- 24 current gameplay tables have `is_active = 1`.
- Eight legacy compatibility tables and five experimental/reference blocks have `is_active = 0`.
- Route-preview metadata is preserved with `is_active = 0` pending its adapter verification.

The version remains **draft**, regardless of the individual table flags. These flags classify intended tables inside this draft; they do not activate the SQLite provider or change the live game. `GamePlaySettings.Visual_Mode` is an app preference, not an engine configuration block, and is not imported in these files. Engine formulas currently defined in TypeScript remain in code.

Each configuration record uses `schema_version = 1` and has:

- `table_key`: stable snake-case identifier listed in preview.json.
- `units_json`: source units and sentinel notes.
- `values_json`: `afl-configuration-v1` JSON containing `family`, `classification`, normalized `data` where supported, and complete `source` cells for its audited range.
- `source`: original cached cell values, formula text, number formats, and tagged dates/error markers. Formulas are provenance only and are **never executed**. Reference-only blocks have `data = null`.

The existing API parsers produced normalized data for completion, routes/depths, openness, TTO, QB decisions, accuracy, hands, jump, YAC and interceptions. The four current run-yardage tables use typed probability/min/max rows. Route-preview metadata is preserved as route/shape rows. Legacy/reference content is retained as source matrices rather than invented active rules. Future SQLite services must consume the `data` field, assemble the frontend settings contract, and handle references separately; no runtime adapter is added by this import.

Conversions preserve the workbook's meaning:

- `time_to_Throw` source fractions (e.g. `0.05`) become percentage points (`5`) in normalized `data`; the eight positive rows total 100. The zero placeholder remains only in the source.
- Hands/jump percentage multipliers remain fractions such as `0.5`.
- Negative Quick air yards are valid; Bomb's `--` upper bound becomes `null` in normalized data.
- `NA` notice values become `null`; `-1` openness ceilings become `null` where handled by the existing parsers.
- Zero remains zero, blank cells remain null, and `x1.5` route strings become numeric multipliers.

The spreadsheet snapshot differs from some earlier conversation examples. Its end-zone jump multiplier is **1**, Accurate YAC multipliers are **1**, the completion table has **10 depth rows**, and the primary notice chance for Tight window is **15**. These values are imported as supplied; they are not replaced with earlier examples. Review the snapshot before treating this draft as final.

## Import provenance and inspection

The four files also create four `import_batches` and 51 `source_record_mappings` records. They record the original workbook filename/SHA-256, importer version, source rows/blocks, destination IDs and source values. The SHA-256 and exact proposed identities are in preview.json. Existing league/player data is left intact.

After Write Changes, browse `divisions`, `teams`, `settings_versions`, `configuration_tables`, `import_batches` and `source_record_mappings` in DB Browser. To inspect configuration data as a readable table, run:

```sql
SELECT table_key, is_active,
       json_extract(values_json, '$.classification') AS classification,
       json_extract(values_json, '$.data') AS data
FROM configuration_tables
ORDER BY table_key;
```

The next import is the season, followed by `team_seasons`, player ratings, and roster assignments.

## Validation

Run from the repository root:

```text
python -m unittest discover -s docs/imports/core -p 'test_*.py' -v
```

The tests need only Python's standard library and use the actual schema. They cover nested DB Browser transactions, standalone execution, reruns, missing prerequisites, conflicting identities and changed configuration, row counts, provenance, source values, settings conversions, and integrity/foreign-key checks. These are import artifacts and tests; no frontend or API behavior changes.
