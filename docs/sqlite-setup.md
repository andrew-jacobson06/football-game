# SQLite setup

SQLite is installed as an API dependency. A separate SQLite server installation is not required. This is the **storage foundation**, not the completed Sheets migration: the app still reads/writes Google Sheets. This change does not import the uploaded workbook, copy its data into Git, or switch the application's storage provider.

## Set up your local database

Use Node.js **24 LTS** (the dependency requires Node 22 or newer). From the repository root in PowerShell:

```powershell
cd apps/api
npm install
npm run db:init
npm run db:status
npm run db:check
```

`db:init` creates the database directories/file and applies the versioned SQL schema. Its output prints the full filename and every table's row count. It is safe to repeat. SQLite is a local file used by the Node server; the browser does not open it directly.

The default Windows path is:

```text
%LOCALAPPDATA%\FootballGame\data\football.sqlite
```

On Linux the default is `$XDG_DATA_HOME/FootballGame/data/football.sqlite`, or `~/.local/share/FootballGame/data/football.sqlite` if XDG_DATA_HOME is unset. To use another location, add an **absolute** path to `apps/api/.env`:

```dotenv
DATABASE_PATH=C:/Users/yourname/AppData/Local/FootballGame/data/football.sqlite
```

You can leave DATABASE_PATH unset/blank for the platform default. Dotenv does not expand `%LOCALAPPDATA%` inside a value. Choose a persistent local disk outside the repository and outside live OneDrive/Dropbox/network-share synchronization. Completed backup files can be synced. The existing `.env` and service-account settings remain needed for the current Sheets application; the standalone database commands do not require Google or Gemini credentials.

For a temporary test/custom file without editing .env:

```powershell
npm run db:init -- --path "C:/Temp/football-test.sqlite"
```

Relative command-line paths resolve from the command's working directory. Use absolute paths for the real database.

If the native dependency cannot install, check `node --version`, switch to supported Node 24 LTS for your OS/CPU, and reinstall dependencies. Native binaries are platform-specific: install dependencies on each device rather than copying node_modules between Windows and Linux. A Windows/Linux CI job exercises the database module; the cloud environment run itself uses Linux.

## What exists after initialization

The first schema contains **24 tables**, including `schema_migrations`:

- League and catalog: `leagues`, `divisions`, `teams`, `seasons`, `team_seasons`, `players`, `player_aliases`, `player_season_ratings`, `player_team_assignments`.
- Configuration: `settings_versions`, `configuration_tables`, `app_preferences`.
- Gameplay storage: `games`, `game_state`, `game_player_state`, `plays`, `play_participants`, `play_line_matchups`, `play_details`.
- Operations: `import_batches`, `source_record_mappings`, `audit_log`, `ai_jobs`, `schema_migrations`.

These are actual SQLite tables with foreign keys, indexes, validated JSON fields, constrained clocks/flags, unique game/play identifiers and roster interval validation. A NULL team supports unassigned players; zero traits stay different from NULL. The only initial data is the schema-migration ledger entry. No league, player or game is fabricated or imported.

The broader migration plan's stat summaries/views, routes/bracket/awards tables, import/reconciliation services and dormant coach/draft structures will be added through subsequent migrations. The current HTTP save handlers do not yet use the new SQLite transaction helper. The database is ready for the import/provider work; the live app remains Sheets-backed until that work is completed and verified.

## Visually inspect it

You can install **DB Browser for SQLite** separately if you want a spreadsheet-like viewer. This viewer is optional and is not needed to run the app.

1. Run `npm run db:status` and copy the printed filename.
2. Open that file in DB Browser for SQLite, using read-only mode for inspection when available.
3. Use **Database Structure** to see tables and **Browse Data** to inspect rows.
4. After the data import phase, league data will appear in those tables. Before import, empty league tables are expected.

A VS Code SQLite extension can also inspect the same file. For routine future edits, use validated app/import tools: direct edits can bypass application-level stat-rebuild and season-history rules even when database constraints allow the edit.

## Commands

Run these from `apps/api` (append `-- --path ABSOLUTE_FILE` to select another file):

| Command | Behavior |
|---|---|
| `npm run db:init` | Create or initialize a managed database. Existing data is retained. |
| `npm run db:migrate` | Upgrade an existing managed database. Backs up before applying pending upgrades. |
| `npm run db:status` | Read schema version, pending upgrades, SQLite settings and table counts. Does not create a missing file. |
| `npm run db:check` | Check database integrity and foreign-key consistency. |
| `npm run db:backup` | Create and verify a consistent backup in a sibling backups directory. |
| `npm run db:restore -- --from BACKUP --to NEW_FILE` | Restore to a new file and verify it; preserves existing files and does not change DATABASE_PATH. |

Explicit backup and restore example:

```powershell
npm run db:backup -- --output "C:/FootballBackups/season-1.sqlite"
npm run db:check -- --path "C:/FootballBackups/season-1.sqlite"
npm run db:restore -- --from "C:/FootballBackups/season-1.sqlite" --to "C:/FootballGame/restored.sqlite"
npm run db:status -- --path "C:/FootballGame/restored.sqlite"
```

A backup destination must not already exist. Automatic backup filenames include time and a random suffix. Restore always requires a new destination. After verifying a restored file, stop the API before choosing it as DATABASE_PATH and restart with that path.

Backups use SQLite's online backup API so committed WAL data is included; copying only the main file while it is being written is not the backup method. Keep backups on another device/location and practice restoration. These commands provide backup tooling; an automatic timed backup scheduler/retention policy is a later operational step.

Database files, WAL/SHM journals and SQLite backups are ignored by Git. `.env.example` contains placeholders; secrets and real league data remain local. On a new local device, initialize a fresh database or restore a verified backup; a git clone does not contain your live database.

## Schema migration rules

- SQL lives in `src/db/migrations/0001_core.sql`, then `0002_...sql`, etc.
- Applied migration names and SHA-256 checksums are recorded in schema_migrations. Line endings normalize across Windows/Linux.
- Applied files are immutable. Put later changes in a new numbered migration; edited or unknown/newer histories are rejected.
- All pending migrations are applied in one short immediate transaction. Failure rolls back pending schema changes.
- Existing unrelated databases without the Football Game migration ledger are rejected.
- If the API is later compiled for deployment, include the SQL migration files alongside the compiled database module. The current commands run the source tree through the existing tsx setup.

## Transaction helper and tests

`src/db/gameTransactions.ts` exports `commitPlay` for the future SQLite save service. It checks the expected state version, rejects writes to final games, recognizes a previously committed play ID, runs a **synchronous** callback in an immediate transaction and verifies the play/state before commit. Stat/state changes made in the callback roll back together. It does not itself calculate football outcomes or replace the current Sheets save handler.

Run:

```powershell
npm test
npm run typecheck
```

Database tests cover initialization, upgrades/checksums, migration failure rollback, constraints, roster interval validation, zero/NULL values, idempotent commits, stale-state rejection and online backup/restore without overwriting existing data. Existing service tests remain part of the same suite. The database tools are usable while the main API still depends on Sheets credentials.
