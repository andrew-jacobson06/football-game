# Season, team details, ratings, roster and games imports

These files continue the local SQLite import after the AFL league, 107 player identities, and [core imports 01–04](../core/README.md). They use the same uploaded workbook SHA-256, permanent IDs, and actual schema. No live Google Sheets access or app-provider switch is involved.

## Download and run in order

| File | Destination | Expected reviewed records |
| --- | --- | ---: |
| [05-seasons.sql](05-seasons.sql) | `seasons` | 1 |
| [06-team-seasons.sql](06-team-seasons.sql) | `team_seasons` | 10 |
| [07-player-season-ratings.sql](07-player-season-ratings.sql) | `player_season_ratings` | 107 |
| [08-player-team-assignments.sql](08-player-team-assignments.sql) | `player_team_assignments` | 107 |
| [09-games.sql](09-games.sql) | `games` **and** final `game_state` snapshots | 70 each |

Use GitHub's **Download raw file** button for each file. In DB Browser:

1. Save pending edits with **Write Changes**. Back up using `npm run db:backup` from `apps/api`.
2. Under **Execute SQL**, open the next file and execute the **entire script**.
3. Verify the final `reviewed_records_present` counts above. File 09 returns two rows: 70 games and 70 score/state snapshots.
4. Click **Write Changes** after success, then continue with the next file.

Do not remove SAVEPOINT/RELEASE statements. They support DB Browser's existing transaction. Identical reruns leave records and timestamps unchanged; different existing data or conflicting natural keys are rejected rather than replaced. If any error occurs, **do not Write Changes**: use **Revert Changes** if a transaction is still open, then resolve the error. Save unrelated work first because conflict guards roll back the surrounding transaction.

## 05 — Season 1

Creates Season 1 with display year 2026, derived from its schedule dates. The source `Season.Week` is **National Championship**; `current_week` is NULL because this is not a numbered regular-season week. All 70 source games are already FINAL, so lifecycle status is **awards_pending**, rather than inventing a finalized awards state.

Unknown actual season start/completion/finalization timestamps remain NULL. The previously imported settings version remains draft and is **not activated or attached as a proven historical ruleset**. Both season and game settings-version links remain NULL until the appropriate version is established. Source facts and derivation notes are stored with the import mappings.

## 06 — Team-season details

Loads all ten teams' abbreviations, locations, nicknames, division membership, logos, home/away jersey crops, home/away uniforms, primary/secondary/third colors, and cap space. Permanent team IDs reference the earlier `teams` import. Branding is season-specific, so a later change does not rewrite this season's identity.

## 07 — Player ratings

Loads one version-1 snapshot per player: offense/defense positions, both star ratings, all 24 core traits, image URL and three image-crop settings. Blanks remain NULL; actual zeroes and decimals are retained.

These are the exported ratings, not reconstructed ratings from every historical game. `effective_from` stays NULL because a historical effective date was not recorded. Optional legacy ratings absent from the sheet, overall rating and its formula version remain NULL. The unlabeled spreadsheet calculations and `jersey` URL are preserved in source mappings; they are not silently treated as an overall rating or image URL.

## 08 — PlayerTeams assignments

**PlayerTeams is the assignment authority**, following the user's migration preference. This explicitly accepts its 97 differences from `Players.Team`. The source preview lists both for review.

- 89 players have a team, and 18 have a NULL team (unassigned).
- Blank teams never fall back to `Players.Team`.
- Every row is season-scoped, status `active`, with no end date.
- `effective_from` is the timestamp of the **first successful import of this file**. Its batch uses exactly that timestamp, and reruns reuse it.

An import-time assignment does not claim the player was on that team throughout the already completed season. Future historical play/game statistics must use the team recorded on that game/play, not the current imported roster. The assignment source text and provenance record this distinction. If an existing overlapping assignment is found, the file refuses to overwrite it.

## 09 — Games and final score snapshots

Loads **65 regular-season games and five playoff games** from `Games`, excluding `OLDGames` and other test sheets. Legacy game numbers remain 1–70 within Season 1, while UUID primary keys are global so later seasons can reuse those numbers.

Because scores live in `game_state` in the current schema, file 09 also loads 70 final snapshots in the **same savepoint**. This preserves home/away scores, known final clock, possession, down/distance, field position, drive start, previous field position and remaining timeouts. The game and snapshot both stay final, including regular-season ties: these are archived results, not games to restart under current overtime rules.

The final period is the maximum recorded `PlayHistory.qtr` for that game. All 70 games have corresponding history. In particular:

- Game 68 is **period 5 (OT), 274 seconds / 4:34 remaining**, Portland 9–San Antonio 12. It is not forced to Q4 or 0:00.
- Game 70, the National Championship, alone has `is_neutral_site = 1` and branding key `afl_championship`. The later field adapter must use that key for AFL championship branding.
- All other games have `is_neutral_site = 0`.

Kickoffs are preserved as source-local ISO strings. Timezone and UTC kickoff remain NULL because the workbook does not identify a timezone. Scheduled kickoff is not relabeled as the actual start/end time. Historical engine/settings versions and the opening toss/receiving team remain unknown. Play history is not loaded here, so `last_play_id` stays NULL pending the history import.

Final snapshots are non-resumable archives. The source did not store historical overtime possession-completion flags; their schema-default zeroes are placeholders and must not be interpreted as verified historical possession facts. The known OT period/final phase is preserved. No historical fatigue or runtime player state is invented.

## Provenance and verification

[preview.json](preview.json) lists season/team-season values, every proposed roster assignment, all game scores and schedule information, and source SHA-256. The files add five import batches and 365 mappings (including separate mappings for each game's final snapshot). After core 01–04, totals are nine batches and 416 mappings. The manually imported players/league were not assigned fabricated earlier import records.

After saving, run:

```sql
SELECT 'seasons' AS table_name, COUNT(*) AS records FROM seasons
UNION ALL SELECT 'team_seasons', COUNT(*) FROM team_seasons
UNION ALL SELECT 'player_season_ratings', COUNT(*) FROM player_season_ratings
UNION ALL SELECT 'player_team_assignments', COUNT(*) FROM player_team_assignments
UNION ALL SELECT 'games', COUNT(*) FROM games
UNION ALL SELECT 'game_state', COUNT(*) FROM game_state;
```

For a database with only these imports, expected counts are 1, 10, 107, 107, 70 and 70. Next comes official play history and its related records, followed by validated stats, awards and bracket data in further migrations/imports.

## Validation

From repository root, with Python's standard library:

```text
python -m unittest discover -s docs/imports/season -p 'test_*.py' -v
```

The nine tests import the preceding files into the actual schema, exercise standalone and nested DB Browser transactions, reruns including stable roster timestamps, missing prerequisites, overlap and changed-record rejection, game/score rollback together, NULL versus zero handling, roster authority, completed ties, OT clocks, neutral-site scope, provenance and database integrity. No frontend or API behavior is changed by these artifacts.
