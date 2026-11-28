# Creating and selecting leagues

From the main menu, **New League** opens a two-step modal:

1. Enter a league name (1–80 characters) and keeper count (0–100), then **Next**.
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

Games, plays, standings, statistics, articles, nominations, winners and existing player ownership are not copied. Scheduling and season start remain future work. The new home page explains that the league is ready for draft setup; its Draft tab manages coaches and keepers, and the player draft.

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

## Seasons, keepers and coaches

League creation now also asks for **Keepers per team** (0–100). This is stored in `leagues.keeper_count`. Season 1 skips keepers: all players are free agents, and each team hires a coach from the league-owned coach pool in a randomized, saved order. The Draft tab displays this preparation flow. Once all coaches are assigned, it opens the player draft board; scheduling remains future work.

After the National Championship is final with a winner, **Advance Season** opens a confirmation dialog. Confirm the league keeper limit, then advance. The API creates Season N+1 with the same teams, divisions, latest player/coach traits and settings, but no games, plays or statistics. It preserves previous seasons and copies their rosters as provisional new-season assignments.

In the new season’s Draft tab:

1. Each team selects exactly the league keeper limit from its previous roster and chooses **Keep coach** or **Fire coach**. Teams without a recorded coach hire one. **Lock keepers** saves both decisions; unlock to edit before finalization.
2. Once every team is locked, **Finalize keepers** releases nonkeepers (`player_team_assignments.team_id=NULL` for the new season only) and releases fired coaches. This is final for that offseason.
3. Teams needing coaches hire in a newly randomized, persisted order. Fired coaches are available again, including to their previous team. A coach can lead only one team in a season. When every team has a coach, the draft is ready.

Migration `0005_season_preparation.sql` adds the league keeper setting, previous-season link, coach assignment status/uniqueness, and four offseason tables: `season_preparation`, `season_roster_candidates`, `season_team_decisions`, `season_keeper_selections`. Existing leagues without a keeper setting choose one when advancing. Existing leagues without coach assignments hire coaches; the upgrade does not guess historical assignments. Leagues previously created without their own coach pool receive a copy of the template league’s active coaches and latest ratings. New leagues clone this pool at creation.

Endpoints (all scoped by `X-League-Id`):

- `GET /api/season/preparation`
- `POST /api/season/advance-year` — `{fromSeasonId, keeperCount}`; retry-safe.
- `PUT /api/season/keepers/:teamId` — `{seasonId, playerIds, coachAction}`.
- `POST /api/season/keepers/:teamId/unlock` — `{seasonId}`.
- `POST /api/season/keepers/finalize` — `{seasonId}`.
- `POST /api/season/coaches/hire` — `{seasonId, teamId, coachId}`.

The API rejects stale seasons, incorrect keeper counts, players from another roster, out-of-turn coach selections, and already-assigned coaches. Transactions preserve the previous season and prevent partial offseason saves.

## Player draft

Once coaching and keeper preparation is complete, the Draft tab opens the snake draft room. The left quarter of the layout keeps the selected team’s roster visible. The other three quarters switch between a draft board and available players. Click a team’s column header/logo to inspect its roster. The active pick opens the available-player view; selecting a player reveals **Draft for [team]**, which always drafts for the team on the clock.

- Season 1’s first-round order is randomized and persisted during league creation, independently of coach selection. Older undrafted leagues receive a one-time saved order when first opened.
- Season 2 onward uses reverse previous-season finish: non-playoff teams, divisional losers, divisional championship losers, runner-up, champion. Equal finishes use regular-season ranking (win percentage, head-to-head percentage, head-to-head differential, overall differential, division percentage). Only regular-season games participate in those tiebreakers.
- Each even round reverses the first-round order. The board keeps each team in its own column and shows pick numbers and direction arrows.
- The final roster target defaults to **10**, including keepers, and is editable before starting. The API checks the player pool and equal keeper counts before generating picks. All teams finish at the same target; surplus players remain free agents. A target equal to the keeper count needs no draft picks.
- Available players can be filtered by offensive or defensive position, or shown together. Every displayed trait is sortable using the column headers or sort control. Drafted players disappear from this pool and appear on their team’s roster immediately.
- Picks, their snake slots, roster ownership and draft status persist in SQLite. Saving a pick is atomic and retry-safe; stale turns and already-owned players are rejected. The draft resumes after reload and becomes read-only when completed. Completing it does not create a schedule or start games.

Migration `0006_player_draft.sql` adds `drafts.roster_target` and draft lookup indexes. Existing `drafts.order_rules_json` stores the saved order, and `draft_picks` stores round/overall numbers, team, player and pick time. Endpoints: `GET /api/draft`, `POST /api/draft/start` (`seasonId`, `rosterTarget`) and `POST /api/draft/pick` (`seasonId`, `pickId`, `playerId`).

### Expanded draft roster

**Expand roster** in the on-the-clock card opens that team's roster even when another team's column is selected. The sidebar's **Full roster & metrics** button opens the currently viewed team instead. The expanded dialog includes a full player skill table with ascending/descending sorting on every column, plus a **Team metrics** tab for passing, rushing, receiving, run blocking, pass protection, runstop, pass rush and coverage. These scores remain uncalculated until their formulas are supplied; they use the current roster, not draft-pool players.

Sidebar roster entries combine each player's portrait with the selected team's away jersey and show both offensive and defensive stars. Missing artwork falls back to the player's initial. `GET /api/draft` now includes each team's `awayJerseyUrl` from its season record, so changing teams also changes the jersey artwork.
