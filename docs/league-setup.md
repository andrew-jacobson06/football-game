# Creating and selecting leagues

From the main menu, **New League** opens a two-step modal:

1. Enter a league name (1–80 characters), then **Next**.
2. Select the included teams and assign their divisions. Available teams start in their original default division. You can include/exclude teams, add teams, and add divisions. **Next** creates the league and opens its home screen.

**Cancel**, **X**, or Escape closes setup and leaves you on the main menu. Nothing is saved before the final Next. Team additions are local to the form until creation succeeds. Controls briefly disable while committing the creation so an in-flight save cannot be mistaken for a cancelled setup. Failed requests keep your entries and can be retried.

**Existing League** shows three saved slots. Select a populated slot to open it, or an empty one to start setup. Existing leagues are preserved and assigned slots on upgrade. At most three populated slots can be created; this is enforced in a SQLite transaction, not only by the UI. Duplicate retries use a creation request ID and return the same saved league.

## Database changes

Migration `0004_league_creation.sql` adds:

- `leagues.save_slot` (unique 1–3), `creation_request_id`, and `creation_config_json`.
- `teams.default_division` and `teams.catalog_team_id`.
- `team_catalog`, which stores the available team identities, artwork, colors and original default divisions independently of cloned league instances.

Each existing team gets its default division from its earliest recorded season. The initial league populates the catalog. Moving a team while creating another league changes its new `team_seasons.division_id`; it does not change the team's original default or the old league's division assignment. Custom teams enter the catalog only when creation commits and are then available for later leagues.

New league creation commits all of the following together:

- League record, first available save slot, divisions, teams and team-season assignments.
- Season 1 in `setup` status, regular stage, Week 1.
- An independent settings version: configuration tables, routes, depths, eligibility, curve points and award weights.
- Copies of the initial league's active player identities, aliases and latest season ratings, with new IDs. All players start unassigned in the new league's draft pool.
- A planned draft record and creation audit entry.

Games, plays, standings, statistics, articles, nominations, winners and existing player ownership are not copied. Draft execution, scheduling and season start are intentionally still future work. The new home page explains that the league is ready for draft setup; its Draft tab remains a placeholder.

## League selection

The browser stores its selection in session storage and sends `X-League-Id` on API calls. Node AsyncLocalStorage keeps that selection request-local. An explicit browser selection takes priority over the optional `.env` defaults; one browser cannot change another browser's selection.

Unscoped API calls keep using the original default league (or explicit environment defaults). New league data never needs to be moved into the original league to be displayed. The league screen loads empty data on a fresh league and shows a recoverable loading error instead of substituting mock teams/games from another league.

Management endpoints:

- `GET /api/leagues` — populated slots and current season summaries.
- `GET /api/league-catalog` — available teams and divisions.
- `POST /api/leagues` — validated, atomic league creation.

No Google Sheets connection is used. Close DB Browser and restart the updated API to apply the migration, then refresh the frontend.

## Validation

Database tests cover preserving the original league, defaults/catalog migration, division changes, custom teams, independent settings and IDs, unassigned player pools, no copied games/stats, transaction rollback, creation retries, three-slot capacity, validation and concurrent HTTP requests for different leagues (including an environment-pinned original season).

Browser checks use a disposable copy of the imported database. They cover Cancel/X and cancelling team edits without saving, division reassignment, custom team creation, the new draft-ready home, slot switching, third-slot creation and full-capacity blocking. New screens are checked in dark and light themes at 1440×1000 and 390×844, including scrollable team/custom-team forms.
