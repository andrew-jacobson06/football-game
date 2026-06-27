import type { LeagueTeam } from "./types";
import {
  computeDiff,
  computeWinPct,
  parseInteger,
  teamName,
} from "./leagueMappers";
export function LeagueStandings({ teams }: { teams: LeagueTeam[] }) {
  return (
    <div className="standings-wrapper">
      <div className="standings-header">
        <div className="standings-title">Standings</div>
        <div className="standings-season-picker">
          <button className="season-select">2025 ▾</button>
          <button className="season-select muted">Regular Season ▾</button>
        </div>
      </div>
      <div className="standings-view">
        <div className="standings-tabs">
          <button className="standings-tab active">League</button>
          <button className="standings-tab">Division</button>
        </div>
        <section className="standings-panel">
          <header className="standings-panel-header">
            American Football League
          </header>
          <div className="standings-table-scroll">
            <table className="standings-table">
              <thead>
                <tr>
                  <th className="team-col">TEAM</th>
                  <th>W</th>
                  <th>L</th>
                  <th>T</th>
                  <th className="pct-col">PCT</th>
                  <th>HOME</th>
                  <th>AWAY</th>
                  <th>DIV</th>
                  <th>PF</th>
                  <th>PA</th>
                  <th>DIFF</th>
                  <th>STRK</th>
                </tr>
              </thead>
              <tbody>
                {teams.map((t, i) => (
                  <tr key={`${teamName(t)}-${i}`}>
                    <td className="team-col">
                      <span className="team-rank">{i + 1}</span>
                      {teamName(t)}
                    </td>
                    <td>{parseInteger(t.Wins ?? t.W)}</td>
                    <td>{parseInteger(t.Losses ?? t.L)}</td>
                    <td>{parseInteger(t.Ties ?? t.T)}</td>
                    <td>{computeWinPct(t)}</td>
                    <td>{String(t.Home ?? "0-0")}</td>
                    <td>{String(t.Away ?? "0-0")}</td>
                    <td>{String(t.DivisionRecord ?? t.Div ?? "0-0")}</td>
                    <td>{parseInteger(t.PF ?? t.PointsFor)}</td>
                    <td>{parseInteger(t.PA ?? t.PointsAgainst)}</td>
                    <td>{computeDiff(t)}</td>
                    <td>{String(t.Streak ?? "—")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}
