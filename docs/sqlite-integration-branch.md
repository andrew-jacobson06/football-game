# SQLite integration branch

`migrate-sqlite-db` is the dedicated development branch for connecting the app to the populated SQLite database. It starts with the latest Sheets branch at `8c000c3`, includes the complete version-2 schema/imports and the revised interception polynomials from their separate review branch. Publishing this branch does not move `migrate-local-ui-sheets-db`.

## Separate local checkout

From the existing football-game repository in PowerShell:

```powershell
git fetch origin
git worktree add -b migrate-sqlite-db ..\football-game-sqlite origin/migrate-sqlite-db
code -n ..\football-game-sqlite
```

The new folder is a **sibling** of the existing Sheets checkout. It has its own ignored environment files and dependency directories. Install dependencies in its `apps/api` and `apps/web` folders as needed. Keep future SQLite integration commits/PRs targeted at `migrate-sqlite-db`; continue Sheets work on `migrate-local-ui-sheets-db`.

The actual local database, `.env` files and service-account credentials are not stored in Git. Use a copy of the populated database for development: from this branch's `apps/api`, `npm run db:backup -- --path "ABSOLUTE_PATH_TO_IMPORTED_DATABASE" --output "ABSOLUTE_PATH_TO_NEW_DEV_DATABASE"` creates a verified, separate copy. Point only this checkout's `DATABASE_PATH` at that development copy. The SQLite CLI commands work without Google credentials.

## Current runtime and first integration work

The API's runtime routes **still use Sheets**. `gameRoutes.ts`, `awardsWorkflow.ts` and `services/sheets.ts` are the current integration points; importing `sheets.ts` eagerly requires the Google environment variables. Database schema/import readiness is separate from completed API migration. Supplying `DATABASE_PATH` does not switch the routes.

1. Add SQLite repositories below the route layer and remove eager Sheets dependencies from the SQLite startup path. Keep the Sheets branch independently runnable.
2. Configure a separate API/frontend pair before testing both versions together. The server accepts `PORT`, but `apps/web/src/api/client.ts` currently hard-codes `http://localhost:4000/api`; setting a different API port alone does not redirect the frontend. Add explicit frontend API configuration on this branch first.
3. Migrate read endpoints: season/games/state, teams/rosters/ratings, settings, stored player/team stats, bracket/awards and articles. Preserve existing API response shapes and handle UUID versus legacy game IDs explicitly.
4. Migrate mutations: play/game saves, coin toss/OT, preferences, season advancement, playoffs and awards. Use transactions, idempotent play IDs and state versions. Update stat deltas/game summaries together with saved outcomes. Do not introduce dual writes to the live spreadsheet.
5. Verify gamecast behavior, stat parity, no Google calls from the SQLite path, backups/restores and season isolation before any eventual cutover.

See `docs/sqlite-setup.md` and `docs/imports/remaining/README.md` for the version-2 schema and completed source-snapshot imports. Retain the existing unknown/null historical metrics and the documented source reconciliations.
