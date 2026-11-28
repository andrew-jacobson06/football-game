# Historical season statistics

The stats page lists every season belonging to the selected league, newest first.
Season selection is local to statistics reads; it never changes the league's live
season or the season used by saves, drafts, or advancement.

`GET /api/seasons` returns season IDs, names, numbers, optional display years and
statuses. Statistics reads accept `?seasonId=<id>` with the existing
`X-League-Id` header. Supported reads are players, teams, standings, games,
player-stats, team-season-stats, team-defense-stats, player game logs and team
player stats. Unknown or cross-league season IDs cannot return another league's
data. Omitting the parameter retains the existing current-season behavior.

Season leaderboards aggregate completed regular-season game statistics. Team
leaders use the recorded team_game_stats team IDs. A player's season total may
span teams; team roster statistics include only contributions for that team.
The player game log uses player_game_stats participation and historical team
IDs, not the player's latest roster assignment. Completed postseason games are
shown in their own section and total separately from the regular season.

Offensive game logs use grouped columns for QB (passing/rushing), RB
(rushing/receiving), WR (receiving/rushing), TE (receiving/blocking), and OL
(blocking). Totals sum counts, retain longest plays and recalculate rates from
the summed counts. Passing rating is calculated from completions, attempts,
yards, touchdowns and interceptions; no QBR is invented. Blocking plays and win
percentage use the recorded OL wins/losses. Missing historical game stats are
not reconstructed from current rosters or invented as zero-stat appearances.

No database schema migration is needed: existing season IDs and normalized
player/team game statistics already support this history.

Verification includes API integration coverage for simultaneous old/current
season reads, rejected cross-league access, historical team contributions, and
read-only season selection; game-log unit coverage checks position groups,
longest-play totals, and weighted averages. The UI was checked with controlled
API fixtures at desktop/mobile sizes in both light and dark themes.
