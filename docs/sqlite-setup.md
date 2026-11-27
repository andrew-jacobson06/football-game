# Run the app with SQLite

The `sqlite-development` branch reads all league data from SQLite. It also saves games, plays, player/team game totals, preferences, playoff seeds, season progression and award ballots in SQLite. The API no longer imports Google Sheets libraries or needs Sheets credentials. Images remain URLs and Gemini still requires its own key for AI nominations/voting.

## Switch your existing installation

1. Stop both development servers. Save pending edits in DB Browser using **Write Changes**.
2. Back up your existing populated database using DB Browser or `npm run db:backup -- --output "C:/Backups/football-before-switch.sqlite"` from `apps/api`.
3. Switch to `sqlite-development` and pull it.
4. Run `npm ci` in `apps/api`. Use a supported Node release (CI tests Node 24); SQLite's native module requires Node 22 or newer and dependencies must be installed on each device.
5. Set `DATABASE_PATH` in **apps/api/.env** to the exact database you already populated:

   ```dotenv
   DATABASE_PATH=C:/Users/YourName/AppData/Local/FootballGame/data/football.sqlite
   ```

   Use **File → Open Database** in DB Browser to identify the actual file. The default when blank is `%LOCALAPPDATA%/FootballGame/data/football.sqlite` on Windows, or `$XDG_DATA_HOME/FootballGame/data/football.sqlite` / `~/.local/share/FootballGame/data/football.sqlite` on Linux. Dotenv does not expand `%VARIABLE%` syntax: enter a literal absolute path. The file should live outside Git and live file-sync folders.
6. Run `npm run db:status` and `npm run db:check` in `apps/api`. Existing migration files/checksums are preserved. Startup applies only missing versioned schema migrations; it does not reimport or reset your league. An empty or missing database fails clearly instead of falling back to Sheets.
7. Start the API with `npm run dev`. Its console prints the selected SQLite path and season. Start the frontend from `apps/web` with `npm ci` (once after switching) and `npm run dev`.
8. Verify `http://localhost:4000/api/health` returns `"storage":"sqlite"`. In the UI check roster, settings-driven routes, standings, news, statistics and game history. New saves appear immediately in SQLite; use **Refresh** in DB Browser to see writes from the API.

`GOOGLE_SHEET_ID` and `GOOGLE_SERVICE_ACCOUNT_KEY_FILE` are ignored on this branch. Keep them locally if you still switch back to the Sheets branch. The database itself is local data, not part of Git; pulling a branch does not download your populated database.

## League, season and settings selection

Set `LEAGUE_ID` and/or `SEASON_ID` in `.env` to pin the application to existing records. With a single league and no explicit selection, the newest season number is used. Multiple leagues require an explicit selection. Games, rosters, traits, articles, standings, statistics and awards are scoped to that season.

`seasons.settings_version_id` is the preferred settings selection. A season without it can use a single active version in its league, or an unambiguous single draft version from the reviewed import. Multiple candidates require you to assign the version explicitly.

The imported database is a snapshot, not a live mirror of Sheets. Edits made in Sheets after that snapshot do not appear here. In particular, verify interception accuracy multipliers and other recently tuned settings in `configuration_tables.values_json` (`data` is the executable value for structured settings). Nothing is silently replaced with hard-coded defaults. Normalized `routes`, `route_depths`, `route_depth_eligibility` and `openness_curve_points` are authoritative for route settings; compatibility metadata in `configuration_tables.source` is used only for older run/settings sections that have no normalized representation.

Current rosters come from active, effective `player_team_assignments` (the imported PlayerTeams assignments), not the old Players.Team snapshot. The newest ratings version per player and season supplies traits.

## Saved play behavior

A single immediate SQLite transaction saves a play, participants, line matchups, detailed logs/animation/fatigue JSON, game state and recalculated statistics for that game. Duplicate play IDs are idempotent and cannot rewind the game snapshot. The frontend sends the game-state version to reject stale submissions. A failed save rolls back all changes. Completed-game statistics read the per-game tables; season snapshots are historical reference data and are never added again to these totals. Defensive yards allowed join the opposing team row from the same game.

Season and preference changes also commit to SQLite. Playoff seed slots and completed-game winners populate scheduled rounds without workbook formulas. Scheduled playoff games retain the normal pregame toss and the national championship retains neutral-site branding. Award point weights come from `award_weights`; all 125 ranked ballots, their placements and final results are stored, including the existing place-vote tiebreak order. Gemini is contacted only for the explicit AI nominations/voting workflow.

The obsolete `/api/plays` payload returns HTTP 410; callers must use `/api/games/:gameId/save-play-and-game` so a play cannot be detached from its state update.

## Database commands and inspection

From `apps/api`:

```powershell
npm run db:status
npm run db:check
npm run db:backup -- --output "C:/Backups/football.sqlite"
```

See `src/db/cli.ts` for exact options. `db:init` is for a new empty database; it creates the schema but no league data. For a fresh installation, import the reviewed files in [docs/imports](imports/remaining/README.md) in order. Do not rerun old snapshot imports over an actively played league to refresh it.

DB Browser's **Browse Data** tab can inspect the same file. Do not leave an edit transaction open while the app is saving. Use SQLite-aware online backups or DB Browser's backup/export tools; copying only the main file while WAL writes are active can omit committed changes. Keep backups outside the active database directory.

## Validation

`npm test` and `npm run typecheck` in `apps/api` cover the repository, existing gameplay/settings services and database management. Repository tests exercise HTTP reads without Google credentials, native settings/roster edits, play rollback/idempotency, state conflicts, completion/sack/turnover credit, per-game totals, season isolation, playoff progression, preferences and award ballots. The web production build verifies the API version contract. Tests use disposable databases, not your local league file.
