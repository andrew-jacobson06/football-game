# Game Save Strategy

This document describes the logical backend save model for resuming a game after the browser window is closed. The current gameplay scope is running plays only, but the model reserves the transitions needed for touchdowns, extra points, two-point tries, punts, field goals, quarter changes, halftime, and end of regulation.

## Save after every completed play

Treat one play as the transaction boundary. The backend should only persist a play after it has fully resolved: yards, score changes, turnover or fumble recovery, clock runoff, down and distance, ball spot, quarter transition, and any pending post-play choice are all known.

Each completed play should be saved in one atomic operation with these records:

1. the updated game state snapshot;
2. the ordered play-by-play row;
3. player stat deltas for the play; and
4. any pending next-step state, such as awaiting XP or two-point choice after a touchdown.

If any part of that write fails, none of the play should be considered saved. This prevents a resumed game from showing a new score without the matching play log or player stats.

## Game state snapshot

The resume screen should be able to load the latest game state without replaying the whole log. Save this snapshot after each play:

- game id;
- home and away teams;
- team in possession;
- home and away score;
- current quarter;
- time remaining in the current quarter;
- current down;
- distance to gain;
- ball spot;
- drive start spot;
- whether the game is awaiting a special-teams or conversion choice;
- half/game status: in progress, halftime, final, or awaiting overtime rules later;
- possession direction or field orientation if the UI depends on it;
- timeouts if/when they are implemented; and
- deterministic random seed or play-resolution audit data if reproducible simulations are needed.

For now, touchdowns should not immediately advance to the opponent taking the ball at the 25. They should set a pending conversion state first. Once XP or two-point try resolves, possession changes to the other team at the 25 because kickoffs are not implemented.

## Play-by-play event

Every completed play should have an append-only play row with a monotonic sequence number. The sequence number, not the timestamp, should define play order.

Required play fields:

- game id;
- play sequence number;
- play id;
- quarter at snap;
- time at snap;
- time at end of play;
- possession team at snap;
- play type, currently Run;
- down and distance at snap;
- down and distance at end of play;
- yard line at snap;
- yard line at end of play;
- runner;
- primary tackler;
- yards gained or lost;
- result flags: Normal, First Down, Touchdown, Tackle for Loss, Fumble, or Fumble Lost;
- fumble forced by;
- fumble recovered by;
- turnover flag;
- score after play;
- drive id; and
- a short human-readable description for the game log.

Useful extra fields to consider now are run direction or gap, blocking matchup details, broken tackle move type, whether a juke or truck succeeded, and whether the play ended the quarter, half, or game. These make stat audits and future UI explanations easier.

## Player stat deltas

Stats should be saved as per-play deltas first, then materialized into game totals. Per-play deltas make it possible to rebuild totals if a bug is fixed and also prevent ambiguous updates when a play has several stat events.

Runner stat deltas needed for running plays:

- carries;
- rushing yards;
- rushing touchdowns;
- long rush candidate;
- fumbles;
- fumbles lost;
- successful jukes; and
- successful trucks.

Defensive stat deltas needed for running plays:

- tackles;
- tackles for loss;
- defensive line wins against offensive line;
- defensive line losses against offensive line;
- forced fumbles; and
- fumble recoveries.

Offensive blocking stat deltas needed for running plays:

- offensive line wins against defensive line; and
- offensive line losses against defensive line.

Averages and long values should be derived from deltas or maintained as materialized totals. Carries, yards, and touchdowns are additive; average is yards divided by carries; long is the maximum single-play rushing gain; fumbles lost is counted only when the opponent recovers.

## End-of-play resolution order

A safe backend flow for running plays is:

1. Capture the start snapshot before the snap.
2. Resolve blocking matchups and record OL/DL win-loss deltas.
3. Resolve runner outcome, yards, tackle, successful juke/truck events, fumble, recovery, and touchdown.
4. Apply score changes if the play reached the end zone.
5. Advance the clock for the completed play.
6. Apply end-of-play football rules: first down, next down, turnover on downs, fumble turnover, or touchdown pending conversion.
7. Apply period rules after the play is complete.
8. Build the end snapshot.
9. Persist game snapshot, play row, and stat deltas atomically.
10. Return the updated snapshot and play row to the client.

## Period and possession rules

Time should only run during a play. If a play consumes the last seconds of a quarter, the play still completes in that quarter, then the next play starts in the next quarter with 15:00 remaining.

At the end of the first or third quarter, carry over possession, down, distance, and ball spot into the next quarter. At halftime, stop play and set the game status to halftime; the next possession should follow the app's halftime possession rule once it is implemented. At the end of regulation, stop play and set the game status to final unless overtime is later added.

Touchdowns should set an awaiting conversion state. XP attempts, two-point attempts, punts, and field goals should all be terminal possession-changing plays in the current no-kickoff model: after they resolve, the opponent starts at the 25.

## Resume strategy

When the user reopens a game, load the latest game state snapshot, all play rows ordered by sequence number, and the current materialized player totals. The UI can render the scoreboard and controls from the snapshot, the game log from ordered play rows, and stat panels from totals.

For integrity, the backend should be able to compare materialized totals against the sum of stat deltas for the game. If the totals ever disagree, the stat deltas and play log should be treated as the source of truth.
