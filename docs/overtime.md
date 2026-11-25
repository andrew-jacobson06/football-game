# Overtime

Tied regulation games enter a 900-second OT period and show **Start OT** in Gamecast. This opens a new coin toss with the same kick/receive choice as the opening toss. Scores carry forward, the receiving team starts at its own 25 with first-and-10, and both teams have three timeouts.

- Any touchdown ends overtime immediately. A defensive safety also ends the game.
- An opening field goal gives the other team an answering possession **only while time remains**.
- If that possession ties the score with a field goal, play continues. A touchdown wins; a failed possession leaves the opening field-goal team as the winner.
- After both teams' initial possessions have ended, any lead ends the game.
- The clock always ends the period. An opening field goal at 0:00 wins without an answering possession.
- A tied regular-season OT is final. Tied playoff OT starts another 900-second period and another toss, continuing until there is a winner.

Periods are stored numerically as 5, 6, 7, etc., and displayed as OT, 2OT, 3OT. PlayHistory retains each play's actual period even when that play ends the game or starts a new OT. The scoring chart includes all OT periods and scrolls on narrow screens when necessary.

The API adds a Games column named **Overtime** automatically on the first overtime save, extending the grid if needed. It stores a JSON snapshot of the period, toss/play/final phase and completed initial possessions in the same values batch as the play and game state. No manual sheet setup is required. This allows refreshes during a pending toss or answering possession without losing the OT rules. An older tied FINAL game without an OT snapshot can also start OT when opened; finished OT ties have a final snapshot and do not restart.
