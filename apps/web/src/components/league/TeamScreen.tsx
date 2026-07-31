import { useEffect, useMemo, useState } from "react";
import { getPlayers, getPlayerStats, type PlayerStats } from "../../api/client";
import type { Player } from "../players/types";
import { PlayerImage } from "../players/PlayerImage";
import { PLACEHOLDER_LOGOS } from "./leagueConstants";
import { parseInteger, teamName } from "./leagueMappers";
import type { LeagueTeam } from "./types";

type TeamTab = "Overview" | "Stats" | "Schedule" | "Roster";

const number = (value: unknown) => Number(value) || 0;

function matchesTeam(playerTeam: string | undefined, selectedTeam: string) {
  if (!playerTeam) return false;
  const player = playerTeam.trim().toLowerCase();
  const selected = selectedTeam.trim().toLowerCase();
  return player === selected || player.includes(selected) || selected.includes(player);
}

export function TeamScreen({ team, onBack }: { team: LeagueTeam; onBack: () => void }) {
  const [activeTab, setActiveTab] = useState<TeamTab>("Stats");
  const [players, setPlayers] = useState<Player[]>([]);
  const [stats, setStats] = useState<PlayerStats[]>([]);
  const [loading, setLoading] = useState(true);
  const selectedName = teamName(team);

  useEffect(() => {
    Promise.all([getPlayers(), getPlayerStats()])
      .then(([playerResult, statResult]) => {
        setPlayers(playerResult.players);
        setStats(statResult.playerStats);
      })
      .catch(() => {
        setPlayers([]);
        setStats([]);
      })
      .finally(() => setLoading(false));
  }, []);

  const roster = useMemo(
    () => players.filter((player) => matchesTeam(player.Team, selectedName)),
    [players, selectedName],
  );
  const playerByName = useMemo(
    () => new Map(roster.map((player) => [player.Name?.trim().toLowerCase(), player])),
    [roster],
  );
  const rushing = useMemo(
    () =>
      stats
        .filter((row) => playerByName.has(row.Player?.trim().toLowerCase()))
        .filter((row) => number(row.Carries) > 0)
        .sort((a, b) => number(b.Yards) - number(a.Yards)),
    [playerByName, stats],
  );
  const leaders = rushing.slice(0, 3);
  const totalCarries = rushing.reduce((sum, row) => sum + number(row.Carries), 0);
  const totalYards = rushing.reduce((sum, row) => sum + number(row.Yards), 0);
  const logo = String(team.Logo || PLACEHOLDER_LOGOS.team);

  return (
    <div className="team-page">
      <button className="team-page-back" type="button" onClick={onBack}>← All teams</button>
      <header className="team-page-hero">
        <img src={logo} alt="" />
        <div>
          <p>{String(team.Division || "AFL")} Division</p>
          <h1>{selectedName}</h1>
          <span>{parseInteger(team.Wins ?? team.W)}-{parseInteger(team.Losses ?? team.L)} · Current season</span>
        </div>
      </header>
      <nav className="team-page-tabs" aria-label={`${selectedName} sections`}>
        {(["Overview", "Stats", "Schedule", "Roster"] as TeamTab[]).map((tab) => (
          <button key={tab} type="button" className={activeTab === tab ? "active" : ""} onClick={() => setActiveTab(tab)}>{tab}</button>
        ))}
      </nav>

      {activeTab === "Stats" ? (
        <main className="team-stats-page">
          <div className="team-stats-heading">
            <div><p>Current season</p><h2>{selectedName} Player Stats</h2></div>
            <button type="button">Regular Season <span>⌄</span></button>
          </div>
          {loading ? <div className="team-stats-state">Loading team statistics…</div> : (
            <>
              <section>
                <h3>Team leaders</h3>
                <div className="team-leader-grid">
                  {leaders.length ? leaders.map((row) => {
                    const player = playerByName.get(row.Player.trim().toLowerCase());
                    return <article key={row.Player}><span>Rushing yards</span><div><PlayerImage player={player || { Image: logo }} /><p><b>{row.Player}</b><small>{player?.Pos || "RB"}</small><strong>{number(row.Yards).toLocaleString()}</strong></p></div></article>;
                  }) : <p className="team-empty">No player statistics have been recorded for this team yet.</p>}
                </div>
              </section>
              <section className="team-stat-section">
                <h3>Rushing</h3>
                <div className="team-stat-scroll"><table><thead><tr><th>PLAYER</th><th>GP</th><th>CAR</th><th className="sorted">YDS ↓</th><th>AVG</th><th>TD</th><th>FUM</th><th>LONG</th></tr></thead><tbody>
                  {rushing.map((row) => { const carries = number(row.Carries); return <tr key={row.Player}><td><b>{row.Player}</b><small>{playerByName.get(row.Player.trim().toLowerCase())?.Pos || "—"}</small></td><td>{row.GP || "—"}</td><td>{carries}</td><td className="sorted">{number(row.Yards).toLocaleString()}</td><td>{carries ? (number(row.Yards) / carries).toFixed(1) : "0.0"}</td><td>{row.TD || 0}</td><td>{row.Fum || 0}</td><td>{row.Long || 0}</td></tr>; })}
                  {rushing.length > 0 && <tr className="total"><td>Total</td><td>—</td><td>{totalCarries}</td><td className="sorted">{totalYards.toLocaleString()}</td><td>{totalCarries ? (totalYards / totalCarries).toFixed(1) : "0.0"}</td><td>{rushing.reduce((s, r) => s + number(r.TD), 0)}</td><td>{rushing.reduce((s, r) => s + number(r.Fum), 0)}</td><td>{Math.max(...rushing.map((r) => number(r.Long)))}</td></tr>}
                </tbody></table></div>
              </section>
              <p className="team-stats-note">Statistics are updated after every game.</p>
            </>
          )}
        </main>
      ) : <div className="team-stats-state">{activeTab} content is coming soon.</div>}
    </div>
  );
}
