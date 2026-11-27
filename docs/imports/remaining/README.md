# Remaining SQLite imports — run 10 through 24 in order

These complete the retained data from **Football Game DB spreadsheet (1).xlsx**, SHA-256 `ea9f4319219b46711d28143c90ab27a9fd5ba80b0ade895a2aebf6516c59b704`. They build on the AFL league, 107 player identities and imports 01–09 already loaded locally. They do not read live Google Sheets or switch the app's storage provider.

## Download and run

Use the download archive **remaining-imports.zip** in this folder, or open an individual SQL file on GitHub and click **Download raw file**. Large SQL files may not have an inline preview; the raw download is still available. Extract the archive before opening its SQL files in DB Browser.

1. Save pending edits with **Write Changes**, then back up the SQLite database (`npm run db:backup` from `apps/api`).
2. Execute file **10** first. It upgrades the schema and records the exact managed migration-2 checksum. Alternatively, update to app code containing migration 0002 and run `npm run db:migrate`; this performs the same upgrade with an automatic pre-upgrade backup. If you use the CLI, skip executing file 10 and start data at 11.
3. For each data file in order, use **Execute SQL → Open SQL file**, execute the **entire file**, inspect its final record counts, and click **Write Changes**.
4. Finish with **24**, which is read-only. Every row should say **OK** for this exact snapshot.

The scripts use SAVEPOINT/RELEASE and support DB Browser's existing transaction; there is no extra BEGIN/COMMIT to remove. They never replace different existing data. Save unrelated work first because conflict guards roll back the surrounding transaction. On an error, stop and **do not Write Changes**. Use **Revert Changes** if any transaction remains open, then resolve the error.

Use the repository code from `codex/complete-sqlite-imports` (or merge its changes into `migrate-local-ui-sheets-db`) before running management commands against a version-2 database. Older code containing only migration 0001 will correctly refuse to inspect a newer migration history. This is a code/schema version check, not lost data. Updating this code does not activate the SQLite app provider.

## Exact order

| # | File | Expected records / purpose |
| --- | --- | --- |
| 10 | [Schema upgrade](10-schema-upgrade.sql) | 27 additional tables; 51 total including the migration ledger; stats/standings/award views |
| 11 | [Aliases and preferences](11-aliases-and-preferences.sql) | 107 exact player-name lookups; 1 Visual_Mode preference |
| 12 | [Official plays](12-official-plays.sql) | 9,575 plays, original play IDs and per-game source order |
| 13 | [Play details](13-play-details.sql) | 9,575 raw payload/log records |
| 14 | [Participants](14-play-participants.sql) | 23,811 named/team-role records |
| 15 | [Line matchups](15-line-matchups.sql) | 32,343 structured matchups |
| 16 | [Final-play links](16-final-play-links.sql) | 70 final snapshots linked to their last official play |
| 17 | [Derived statistics](17-derived-statistics.sql) | 123,766 metric deltas; 1,237 player/game/team rows; 140 team/game rows |
| 18 | [Baselines and standings](18-source-baselines-and-standings.sql) | 117 cached comparison snapshots; 36 source/canonical standing snapshots |
| 19 | [Normalized routes](19-normalized-route-settings.sql) | 19 routes, 9 depths, 171 eligibility pairs, 28 curve points |
| 20 | [Playoff bracket](20-playoff-bracket.sql) | 6 frozen seeds; 12 slots including 2 byes |
| 21 | [Awards and first teams](21-awards-and-first-teams.sql) | 3 definitions, 18 rank weights, 18 nominees, 3 unstarted votes, 34 honor slots and 34 selections |
| 22 | [Articles](22-articles.sql) | 19 complete articles |
| 23 | [Coaches and draft reference](23-coaches-and-draft-reference.sql) | 20 coaches, 20 rating snapshots, 1 original draft board |
| 24 | [Final verification](24-verify-complete-import.sql) | Read-only counts, schema checksum, integrity, references and intentionally empty tables |

Files 12–15 contain larger datasets and can take longer. Wait for each script to finish before continuing. The settings version remains **draft**.

## Meaning of the imported data

### Official history and participants

Only `Games` and `PlayHistory` are official. The 72 `OLDGames` rows and 341 `OLDPlayHistory` rows are excluded, following the user's confirmation that they are test/simulation data. [workbook-disposition.csv](workbook-disposition.csv) lists all 43 source sheets and the decision for each.

Play IDs remain the source IDs. `sequence` follows the original order **within each game**, including game 68's history being located after game 69's rows. Both before/after field coordinates remain in the game's original coordinate system. Original descriptions, flags and JSON remain available in `play_details.original_payload_json`; logs and recovery details are also typed separately. Unknown post-play clocks and animations remain NULL. No random rolls or old fatigue states are invented.

Participant teams come from that play's recorded possession and role; line teams come from the same play. `Home`, `Away` and `NA` are not player identities. Team-level kneels, spikes, punts and field goals have NULL player IDs. The source's duplicate interceptor identity in tackler/recoveredby becomes one interceptor-role record. Exact canonical player-name aliases use casefolding only; no fuzzy merges are performed. Draft spelling variations stay in the reference board.

File 16 fills only `game_state.last_play_id` on final archives. It does not change final scores, clocks, state versions or reopen ties. The current 09-games.sql tolerates this later-known link when rerun; use the updated file if rerunning an older download of 09 after this step.

### Six source turnover inconsistencies

[turnover-reconciliation.json](turnover-reconciliation.json) lists six source rows where `turnover = Yes` but the named ball carrier recovered his own fumble. The canonical flags keep these as fumbles with **no lost possession**, while the source Yes flag is retained unchanged in the raw payload and reconciliation details. All 18 fumbles remain recorded; nine were lost. The 68 explicit turnovers on downs and 21 interceptions retain their distinct types.

These are reviewed import corrections, not silent edits to the workbook. Other raw facts remain available for comparison. The recovery-side rule is specific to this reviewed snapshot: same recorded carrier means retained possession; all other recoverers here are the opposing side. This is not a substitute for the future runtime recovery engine.

### Statistics and unknowns

`play_stat_deltas` records the deterministic metric contributions with calculation version `history-v1`; materialized player/team game totals are rebuildable from them and the official events. Canonical season/career views recalculate rates and take maximum longest plays rather than adding averages or long gains. `games_with_recorded_participation` counts observed roles/line appearances, not a fabricated complete active roster.

- Sacks are not pass attempts. There are 135 sacks, 4,094 attributed player pass attempts, 2,401 completions, 21 interceptions and 12 deflections.
- Team attempts additionally include four spikes whose quarterback identity is unrecorded (4,098 attempts). Team rushing includes 59 team-only kneels; individual rush totals exclude them because the actor is only Home/Away.
- Receiving fumbles, named defensive interceptions/deflections, forced fumbles, line wins/losses and recoveries are separated by their recorded roles.
- Return yards/TDs, exact drive counts, possession time, extra points and two-point attempts have insufficient historical evidence and remain NULL. Recorded-event counts are not claims that every unrecorded action was zero.
- Gross passing yards and sack yards lost remain separate. `team_game_statistics`/`team_season_stats` expose gross and net yardage explicitly.
- Defensive yards allowed join **the opposite team's row in the same game**. Regular-season league rushing and passing yards allowed therefore reconcile to the matching offensive totals. No opponent's season total is added once for every matchup.
- Current PlayerTeams assignments are never used to attribute past plays. They remain the new current-roster authority established in file 08.

`season_standings` provides regular, postseason and combined scopes from final game scores. Source Standings combines regular-season records with playoff-inclusive PF/PA, so its snapshots are labeled `worksheet_mixed`. The cached 107 PlayerStats rows and ten Standings rows remain comparison baselines with source column numbers, including duplicate INT/Sacks headers and formula text. They are not added to canonical totals. No new frontend sorting or stats UI behavior is introduced by these files.

### Settings, playoffs, awards and content

Normalized route tables reference the same settings version as their route/depth joins. `Screen` is an explicit alias of `WR Screen`; Quick can have negative air yards; Bomb's maximum is NULL. Zero-duration route phases are valid. Eligibility includes every route/depth pair, with availability driven by the source 1 flag. This does not activate draft settings or rewrite rules used in old games.

The six already-stamped playoff seeds are preserved, rather than reseeded using corrected totals. Each division has a first-seed bye and 2-vs-3 game, then a division championship. National championship sides refer to winners of the two division championships. All resolved teams match the exported games.

The 18 candidates and all 34 first-team selections are preserved without rerunning AI. Award teams are inferred only from the last unambiguous recorded regular-season participation (and matching division for honors); they do not follow the newly imported PlayerTeams roster. All teams resolved unambiguously in this snapshot. Source selection dates remain unknown.

MVP rank weights are **10, 7, 5, 4, 3, 2, 1, 0**; OPOY/DPOY use the first five. All three vote runs are **not_started**, expecting 125 ballots and currently containing zero. No ballots, results or winners are fabricated from cached zero totals. Future ranking compares total points then first-through-eighth-place vote counts; exact ties remain tied. Constraints reject cross-award rankings, premature results and completion without 125 complete ballots. These are storage rules, not a running Gemini integration.

Article IDs, Markdown (including inline img tags), publication fields and schedule stages remain exactly as exported. Coach allocations are dormant catalog data. CoachTeams is header-only, so it creates no assignments. The entire Draft board grid is retained as reference, including duplicate names, formulas and errors; no chronological draft picks are inferred.

### Empty tables are intentional

`game_player_state`, `coach_team_assignments`, `drafts`, `draft_picks`, `award_ballots`, `ballot_rankings`, `award_results`, `ai_jobs` and `audit_log` start empty because those runtime/assignment/vote events were not recorded or performed. Tables for design notes and old test analysis are not created. Keep the original XLSX as an immutable external archive for those reference sheets; source SHA-256 and mappings identify this exact export.

## Updating code and validating

Schema 0002 is immutable after application. SQL file 10 and `npm run db:migrate` use exactly the same migration name and SHA-256, with CRLF normalized by the application migration runner. Applying the raw 0002 SQL alone would miss the migration ledger; use one of the two supported methods instead.

From the repository root:

```text
python -m unittest discover -s docs/imports/remaining -p 'test_*.py' -v
```

The tests use Python's standard library and the actual checked-in SQL. They load the earlier imports and every new file, verify counts and checksums, rerun the sequence inside DB Browser-style transactions, check rollback, compare stats to raw events, validate same-game defensive yardage, preserve source fumble flags, and exercise valid 125-ballot exact ties without inventing a winner. API migration tests also cover version consistency and ballot membership/completion rules. Linux import tests and Windows/Linux API database tests are configured in CI.

To regenerate the artifacts from the reviewed workbook, install the development-only `openpyxl` Python package and run:

```text
python docs/imports/remaining/build_remaining.py "PATH_TO_THE_REVIEWED_WORKBOOK.xlsx"
```

The generator refuses a different workbook hash. A later live-sheet export needs a reconciled import, not a mixture of different snapshots. Regenerate the download ZIP after any artifact change. These files complete this snapshot's database import; the SQLite repository/API adapters, runtime save/rebuild services, access control and deployment remain subsequent application work.
