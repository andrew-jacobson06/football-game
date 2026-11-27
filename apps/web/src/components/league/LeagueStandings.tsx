import { useState } from "react";
import type { LeagueGame, LeagueTeam } from "./types";
import { teamName } from "./leagueMappers";
import { sortStandings, standingNumber, standingWinPercentage, standingDivisionPercentage, standingRecord, standingDiff } from "./standings";

type StandingsView = "league" | "division";

function value(team: LeagueTeam, ...keys: string[]): string {
  const match = keys.find((key) => team[key] !== undefined && team[key] !== "");
  return match ? String(team[match]) : "";
}

function TeamIdentity({ team, onSelect }: { team: LeagueTeam; onSelect?: (team: LeagueTeam) => void }) {
  const [logoFailed, setLogoFailed] = useState(false);
  const name = value(team, "City", "Location", "TeamName") || teamName(team);
  const nickname = value(team, "Nickname", "NickName", "Name", "Mascot");
  const logo = value(team, "Logo", "LogoUrl", "LogoURL");

  return (
    <button className="standings-team standings-team-button" type="button" onClick={() => onSelect?.(team)}>
      {logo && !logoFailed ? (
        <img
          className="standings-team-logo"
          src={logo}
          alt=""
          onError={() => setLogoFailed(true)}
        />
      ) : (
        <span className="standings-team-logo-fallback" aria-hidden="true">
          {(nickname || name).slice(0, 2).toUpperCase()}
        </span>
      )}
      <span className="standings-team-copy">
        <span className="standings-team-name">{name}</span>
        {nickname && nickname !== name && (
          <span className="standings-team-nickname">{nickname}</span>
        )}
      </span>
    </button>
  );
}

function StandingsTable({ teams, games, onSelectTeam }: { teams: LeagueTeam[]; games: LeagueGame[]; onSelectTeam?: (team: LeagueTeam) => void }) {
  const orderedTeams = sortStandings(teams, games);

  return (
    <div className="standings-table-scroll">
      <table className="standings-table">
        <thead>
          <tr>
            <th className="team-col">TEAM</th>
            <th>W</th>
            <th>L</th>
            <th>T</th>
            <th className="pct-col" aria-sort="descending">PCT ↓</th>
            <th>HOME</th>
            <th>AWAY</th>
            <th>DIV</th>
            <th>DIV PCT</th>
            <th>PF</th>
            <th>PA</th>
            <th>DIFF</th>
            <th>STRK</th>
          </tr>
        </thead>
        <tbody>
          {orderedTeams.map((team, index) => (
            <tr key={`${teamName(team)}-${index}`}>
              <td className="team-col"><TeamIdentity team={team} onSelect={onSelectTeam} /></td>
              <td>{standingNumber(team, "W", "Wins")}</td>
              <td>{standingNumber(team, "L", "Losses")}</td>
              <td>{standingNumber(team, "T", "Ties")}</td>
              <td className="pct-col">{(standingWinPercentage(team) * 100).toFixed(2)}%</td>
              <td>{standingRecord(team, "Home")}</td>
              <td>{standingRecord(team, "Away")}</td>
              <td>{standingRecord(team, "Div")}</td>
              <td>{(standingDivisionPercentage(team) * 100).toFixed(2)}%</td>
              <td>{standingNumber(team, "PF", "PointsFor")}</td>
              <td>{standingNumber(team, "PA", "PointsAgainst")}</td>
              <td className={standingDiff(team) > 0 ? "standings-diff-positive" : standingDiff(team) < 0 ? "standings-diff-negative" : undefined}>{standingDiff(team) > 0 ? "+" : ""}{standingDiff(team)}</td>
              <td>{value(team, "STRK", "Streak") || "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function LeagueStandings({ teams, games = [], onSelectTeam }: { teams: LeagueTeam[]; games?: LeagueGame[]; onSelectTeam?: (team: LeagueTeam) => void }) {
  const [view, setView] = useState<StandingsView>("league");
  const divisions = Object.entries(
    teams.reduce<Record<string, LeagueTeam[]>>((groups, team) => {
      const division = value(team, "Division") || "Unassigned";
      (groups[division] ??= []).push(team);
      return groups;
    }, {}),
  ).sort(([a], [b]) => a.localeCompare(b));

  return (
    <div className="standings-wrapper">
      <div className="standings-header">
        <div className="standings-title">League Standings</div>
        <div className="standings-season-picker">
          <button className="season-select">2025 ▾</button>
          <button className="season-select muted">Regular Season ▾</button>
        </div>
      </div>
      <div className="standings-tabs" role="tablist" aria-label="Standings breakdown">
        <button className={`standings-tab ${view === "league" ? "active" : ""}`} role="tab" aria-selected={view === "league"} onClick={() => setView("league")}>League</button>
        <button className={`standings-tab ${view === "division" ? "active" : ""}`} role="tab" aria-selected={view === "division"} onClick={() => setView("division")}>Division</button>
      </div>
      <div className="standings-view">
        {view === "league" ? (
          <section className="standings-panel">
            <header className="standings-panel-header">League</header>
            <StandingsTable teams={teams} games={games} onSelectTeam={onSelectTeam} />
          </section>
        ) : (
          <div className="standings-division-list">
            {divisions.map(([division, divisionTeams]) => (
              <section className="standings-panel" key={division}>
                <header className="standings-panel-header">{division} Division</header>
                <StandingsTable teams={divisionTeams} games={games} onSelectTeam={onSelectTeam} />
              </section>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
