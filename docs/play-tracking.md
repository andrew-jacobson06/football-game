# Pass tracking and play length

Migration `0003_play_pass_tracking.sql` adds these nullable columns to `plays`. The API applies it at startup; close DB Browser and restart the updated API. No table recreation or data reimport is needed. Existing column values and IDs are preserved.

| Play JSON / API field | SQLite column | Meaning |
|---|---|---|
| `blitz` | `blitz` | Boolean, stored as 0/1: whether a blitz was called. |
| `blitzBy` | `blitz_by` | Selected blitzing player's name, including when blocked. NULL when no blitzer was selected. |
| `qbPressures` | `qb_pressures` | 0/1 per play: pressure handling occurred, an instant sack happened, or the QB exhausted his available pocket time. A blitz call alone is not pressure. |
| `qbHits` | `qb_hits` | 0/1 per play: the pressure-hit check passed, or an unblocked blitzer caused an instant sack. |
| `qbHitBy` | `qb_hit_by` | The selected hitter or instant-sacking blitzer; independent of a receiver's tackler. |
| `timeToThrow` | `time_to_throw` | Available pocket time in decimal seconds, after OL/DL adjustments; a negative budget or instant sack gives zero available time. |
| `timeUntilThrow` | `time_until_throw` | Elapsed route/read time when the QB chose to release the ball, including throwaways. NULL for sacks and scrambles. This is not total play duration. |
| `coveringDefender` | `covering_defender` | The assigned defender of the targeted receiver at throw time, whether the pass completes, is incomplete, is deflected or is intercepted. NULL without a target. It is never inferred from the eventual tackler. |
| `playLength` | `play_length` | Game-clock seconds consumed by the entire play, for runs, passes and special-teams plays, including clock-mode runoff. |

Player-name fields are event snapshots. The corresponding `play_participants` roles `blitz_rusher`, `qb_hitter`, and `covering_defender` also link these events to stable player IDs. Covering-player participation does not itself credit a tackle, hit, deflection or interception.

Tracking comes from the existing engine state; recording it consumes no extra random rolls. Pass-origin metadata survives a QB tuck-and-run, including a losing scramble classified as a sack. A scramble tackle is not retrospectively turned into a successful pressure-hit check.

The shared clock helper compares the game's before/after period and clock, not the next play's timestamp. For example, 15:00 to 14:52.5 is 7.5 seconds; 0:03 to the next quarter's 15:00 is 3 seconds. Halftime and overtime resets follow the same rule. The pre-play possession owns these seconds even if the play ends in a turnover or score. Zero-second events are recorded as zero.

The migration backfills `play_length` only for old rows that already have complete, valid before/after clock pairs. Imported history with unknown after-clocks stays NULL, and old blitz/hit/coverage facts are not guessed. The native save service can also derive a duration from its supplied play and game snapshots and rejects a contradictory explicit duration.

`team_game_stats.possession_seconds` is recalculated when a play is saved and is only a full total if every play for that offense has a known duration. Unknown legacy durations do not silently become zero.

## Query recorded possession time

This exposes both known seconds and data coverage, so partial historical records cannot look like complete totals:

```sql
SELECT g.legacy_game_number AS Game,
       t.abbreviation AS Team,
       COUNT(*) AS Recorded_Plays,
       COUNT(p.play_length) AS Plays_With_Duration,
       SUM(p.play_length IS NULL) AS Plays_Missing_Duration,
       SUM(p.play_length) AS Known_Possession_Seconds,
       CASE WHEN COUNT(*) = COUNT(p.play_length)
            THEN SUM(p.play_length) END AS Complete_Possession_Seconds
FROM plays p
JOIN games g ON g.id = p.game_id
JOIN team_seasons t ON t.season_id = g.season_id
                   AND t.team_id = p.offense_team_id
WHERE g.season_id = '97808f43-a0d5-5251-bf8d-fae1643c8258'
GROUP BY g.id, p.offense_team_id
ORDER BY g.legacy_game_number, t.abbreviation;
```

## Start coverage statistics

Use the guarding player's stable participant ID to keep statistics together if a display name later changes. This includes only documented targets, with sacks excluded; historical rows lacking coverage data are not attributed to a guessed defender.

```sql
SELECT defender.display_name AS Covering_Defender,
       COUNT(*) AS Targets,
       SUM(COALESCE(p.is_complete,0)) AS Completions_Allowed,
       SUM(CASE WHEN p.is_complete=1 THEN p.yards ELSE 0 END) AS Yards_Allowed,
       SUM(CASE WHEN p.is_complete=1 THEN COALESCE(p.is_touchdown,0) ELSE 0 END) AS TD_Allowed
FROM plays p
JOIN games g ON g.id=p.game_id
JOIN play_participants guard ON guard.play_id=p.id
                            AND guard.role='covering_defender'
JOIN players defender ON defender.id=guard.player_id
WHERE g.season_id='97808f43-a0d5-5251-bf8d-fae1643c8258'
  AND p.play_type='Pass' AND COALESCE(p.is_sack,0)=0
GROUP BY defender.id
ORDER BY Yards_Allowed, Targets DESC;
```
