import { PLACEHOLDER_LOGOS } from "./leagueConstants";
function LeaderTable({
  title,
  stat,
  kind,
}: {
  title: string;
  stat: string;
  kind: "Player" | "Team";
}) {
  return (
    <div className="leader-group">
      <table className="leader-table">
        <thead>
          <tr>
            <th className="statCol1">{title}</th>
            <th className="stat-value">{stat}</th>
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: 5 }, (_, i) => (
            <tr key={i}>
              <td className="team-cell">
                <span className="rank">{i + 1}</span>
                <img
                  className="team-logo"
                  src={PLACEHOLDER_LOGOS.team}
                  alt=""
                />
                <a href="#" className="team-link">
                  {kind} Name
                </a>
              </td>
              <td className="stat-value">
                {[308.5, 298.7, 296.4, 294.0, 291.7][i]}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="complete-link">
        <a href="#">Complete Leaders</a>
      </div>
    </div>
  );
}
export function LeagueStats() {
  return (
    <>
      <div className="stats-tabs">
        <button className="stats-tab">Player</button>
        <button className="stats-tab active">Team</button>
      </div>
      <div className="season-row">
        <button className="season-pill">Season 1 ▾</button>
      </div>
      <div className="stats-content active">
        <div className="stats-section">
          <div className="stats-section-title">Offensive Leaders</div>
          {["TOTAL YARDS", "PASSING", "RUSHING"].map((t) => (
            <LeaderTable key={t} title={t} stat="YDS/G" kind="Team" />
          ))}
        </div>
        <div className="stats-section">
          <div className="stats-section-title">Defensive Leaders</div>
          {["TACKLES", "SACKS", "INTERCEPTIONS"].map((t) => (
            <LeaderTable
              key={t}
              title={t}
              stat={t === "TACKLES" ? "TOT" : t === "SACKS" ? "SACK" : "INT"}
              kind="Player"
            />
          ))}
        </div>
      </div>
    </>
  );
}
