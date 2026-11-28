# Touchdowns and conversion attempts

After a touchdown, the field animation completes before the scoreboard displays
the scoring team's touchdown banner. Its colors come from the team's primary
and secondary colors. The scoring team then chooses an automatic extra point or
a two-point attempt. An untied, game-ending touchdown skips the try.

The pending try is saved with the game, so reloading preserves the choice. A
two-point attempt uses the normal run/pass controls for one snap from the two.
Neither option consumes game-clock time. After the try, the game resumes the
possession, halftime, final, or overtime transition saved with the touchdown.

Migration 0008 adds `plays.is_conversion`, `conversion_type` (`xp` or `2pt`),
and `touchdown_play_id`. Each touchdown can have only one linked conversion.
The API history exposes `time: "xp"` or `time: "2pt"` and `playLength: 0`.
The database retains numeric clock fields; the explicit conversion columns
should be used for SQL filtering.

Conversion rows are retained for auditing and scoring, but excluded from drive
plays, yardage, time of possession, player statistics, and normal team play
statistics. The UI attaches their description and final score to the touchdown
instead of showing a separate timeline or scoring-summary entry.

Integration coverage is in `apps/web/tests/conversions.test.ts`. It exercises
the engine and a migrated SQLite database together, including duplicate-try
protection, reloads, failed tries, halftime, and end-of-game boundaries.
