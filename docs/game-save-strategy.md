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

## Expected Google Sheets columns for the current model

The backend now writes `PlayHistory` rows by reading the sheet header row and mapping each known play field into the matching column. This means columns may be wider than the original `A:AA` model, but these headers must exist if you want the corresponding values persisted and reloadable.

### Games sheet

Pulled by the game list and resume screen, and pushed after every completed play:

| Column | Direction | Notes |
| --- | --- | --- |
| Id | Pull | Game id. |
| Home | Pull | Home team name/key. |
| Away | Pull | Away team name/key. |
| HomeScore | Pull + push | Latest home score snapshot. |
| AwayScore | Pull + push | Latest away score snapshot. |
| Qtr | Pull + push | Current quarter snapshot. |
| Time | Pull + push | Current game-clock snapshot. |
| Down | Pull + push | Current down snapshot. |
| Distance | Pull + push | Current distance snapshot. |
| BallOn | Pull + push | Current absolute ball spot. |
| Possession | Pull + push | `Home` or `Away`. |
| DriveStart | Pull + push | Absolute ball spot where the current drive began. |
| Previous | Pull + push | Previous ball spot used by the field animation. |
| HomeTimeouts | Pull + push | Current home timeout count, if present. |
| AwayTimeouts | Pull + push | Current away timeout count, if present. |
| HomeLogo | Pull | URL/path for home logo. |
| AwayLogo | Pull | URL/path for away logo. |

### PlayHistory sheet

Pulled on resume and pushed once per completed play. Keep the first 27 columns if you already use the legacy layout, then add the new audit/stat columns after them.

| Column | Direction | Notes |
| --- | --- | --- |
| gameid | Pull + push | Game id for filtering play history. |
| playid | Pull + push | Unique/idempotency key. Duplicate `playid` saves are ignored. |
| time | Pull + push | Time at snap. |
| qtr | Pull + push | Quarter at snap. |
| possession | Pull + push | Possession at snap. |
| down | Pull + push | Down at snap. |
| distance | Pull + push | Distance at snap. |
| ballon | Pull + push | Ball spot at snap. |
| playtype | Pull + push | `Run`, `Pass`, etc. |
| player | Pull + push | Runner/passer/primary actor. |
| receiver | Pull + push | Receiver/target when applicable. Empty for runs. |
| yards | Pull + push | Final credited yards. |
| defensepredicted | Pull + push | Defensive prediction/audit field. |
| predictioncorrect | Pull + push | Boolean prediction result. |
| tackler | Pull + push | Primary tackler or `NA`. |
| result | Pull + push | Normalized outcome. |
| defenseresult | Pull + push | Defensive outcome such as `TFL` or `Fumble`. |
| turnover | Pull + push | Turnover flag. |
| description | Pull + push | Log/result description. |
| recoveredby | Pull + push | Fumble/interception recovery player. |
| airyards | Pull + push | Passing air yards; `0` for runs. |
| newdown | Pull + push | Down after the play. |
| newdist | Pull + push | Distance after the play. |
| newballon | Pull + push | Ball spot after the play. |
| drivestart | Pull + push | Drive start at snap. |
| homescore | Pull + push | Home score after the play. |
| awayscore | Pull + push | Away score after the play. |
| lineMatchups | Pull + push | JSON array of every OL/DL matchup: `slot`, `offensePlayer`, `defensePlayer`, and `winner`. This is the source of truth for recalculating OL/DL wins and losses on load. |
| olWins | Pull + push | Count of OL wins on the play. Convenience audit total; can be rebuilt from `lineMatchups`. |
| olLosses | Pull + push | Count of OL losses on the play. Convenience audit total; can be rebuilt from `lineMatchups`. |
| dlWins | Pull + push | Count of DL wins on the play. Convenience audit total; can be rebuilt from `lineMatchups`. |
| dlLosses | Pull + push | Count of DL losses on the play. Convenience audit total; can be rebuilt from `lineMatchups`. |
| jukes | Pull + push | Successful jukes credited to the runner. |
| trucks | Pull + push | Successful trucks credited to the runner. |
| brokenTackles | Pull + push | Alias of successful trucks for broken-tackle stat displays. |
| stopReason | Pull + push | Engine stop reason/audit note. |
| runLog | Pull + push | JSON array of detailed run-resolution notes. |

### Players sheet

Pulled for player traits and not pushed by the current play-save flow:

| Column | Direction | Notes |
| --- | --- | --- |
| Team | Pull | Player team. |
| Name | Pull | Player display name. |
| Pos | Pull | Offensive/listed position. |
| Off Stars | Pull | Offensive star rating. |
| Def Stars | Pull | Defensive star rating. |
| Size | Pull | Size trait. |
| Strength | Pull | Strength trait. |
| Speed | Pull | Speed trait. |
| Stamina | Pull | Initial fatigue/stamina value. |
| Poise | Pull | QB/mental trait. |
| Accuracy | Pull | Passing trait. |
| Arm-Strength or Arm Strength | Pull | Passing trait. |
| Read Defense | Pull | QB read trait. |
| Juke | Pull | Runner juke trait. |
| Vision | Pull | Runner vision trait. |
| Acceleration | Pull | Runner acceleration trait. |
| Route Running | Pull | Receiver trait. |
| Jump | Pull | Receiver trait. |
| Hands | Pull | Receiver trait. |
| Ball Security | Pull | Fumble-resistance trait. |
| QB Favorite | Pull | Targeting hint. |
| Run Blocking | Pull | OL run-block trait. |
| Pass Protect | Pull | OL pass-protection trait. |
| RunStop or Run Stop | Pull | Defensive run-stop trait. |
| Tackling | Pull | Tackle trait. |
| Run Def | Pull | Defensive run trait. |
| Tackle Chance | Pull | Tackler-selection weight. |
| Strip | Pull | Forced-fumble trait. |
| PassRush or Pass Rush | Pull | Pass-rush trait. |
| Sack Chance | Pull | Sack trait. |
| Ball Hawk | Pull | Interception/coverage trait. |
| Read QB | Pull | Defensive read trait. |
| Coverage | Pull | Coverage trait. |
| DefPos or Def Pos | Pull | Defensive position group. |
| Image or Player Image from AI | Pull | Player image URL/path. |
| translateX | Pull | Image alignment. |
| translateY | Pull | Image alignment. |
| scale | Pull | Image scale. |
| jersey or Jersey or Jersey Image | Pull | Jersey image URL/path. |

### Settings sheet

Pulled for play resolution and not pushed by the current play-save flow. The backend expects setting labels in column A and values in following columns. The active prefixes are `RunType_`, `Break_`, `accel_to_LB_`, `speed_lvl2_`, `Breakaway_`, `negative_`, `Stamina_Drain_`, `Tackle_`, `airYards_Completion_`, `routeType_AirYardsReqd_`, `TNTT_`, `separation_`, `yacCalc_bySep_`, and `SackLoss_`.
