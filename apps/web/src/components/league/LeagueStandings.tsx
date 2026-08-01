import { useState } from "react";
import type { LeagueTeam } from "./types";
import {
  computeDiff,
  parseInteger,
  teamName,
} from "./leagueMappers";

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

function StandingsTable({ teams, onSelectTeam }: { teams: LeagueTeam[]; onSelectTeam?: (team: LeagueTeam) => void }) {
  return (
    <div className="standings-table-scroll">
      <table className="standings-table">
        <thead>
          <tr>
            <th className="team-col">TEAM</th>
            <th>W</th>
            <th>L</th>
            <th>T</th>
            <th>HOME W</th>
            <th>HOME L</th>
            <th>AWAY W</th>
            <th>AWAY L</th>
            <th>DIV W</th>
            <th>DIV L</th>
            <th>PF</th>
            <th>PA</th>
            <th>DIFF</th>
            <th>STRK</th>
          </tr>
        </thead>
        <tbody>
          {teams.map((team, index) => (
            <tr key={`${teamName(team)}-${index}`}>
              <td className="team-col"><TeamIdentity team={team} onSelect={onSelectTeam} /></td>
              <td>{parseInteger(team.Wins ?? team.W)}</td>
              <td>{parseInteger(team.Losses ?? team.L)}</td>
              <td>{parseInteger(team.Ties ?? team.T)}</td>
              <td>{parseInteger(team["Home W"] ?? team.HomeWins)}</td>
              <td>{parseInteger(team["Home L"] ?? team.HomeLosses)}</td>
              <td>{parseInteger(team["Away W"] ?? team.AwayWins)}</td>
              <td>{parseInteger(team["Away L"] ?? team.AwayLosses)}</td>
              <td>{parseInteger(team["Div W"] ?? team.DivisionWins)}</td>
              <td>{parseInteger(team["Div L"] ?? team.DivisionLosses)}</td>
              <td>{parseInteger(team.PF ?? team.PointsFor)}</td>
              <td>{parseInteger(team.PA ?? team.PointsAgainst)}</td>
              <td>{value(team, "DIFF", "Diff") || computeDiff(team)}</td>
              <td>{value(team, "STRK", "Streak") || "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function LeagueStandings({ teams, onSelectTeam }: { teams: LeagueTeam[]; onSelectTeam?: (team: LeagueTeam) => void }) {
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
            <StandingsTable teams={teams} onSelectTeam={onSelectTeam} />
          </section>
        ) : (
          <div className="standings-division-list">
            {divisions.map(([division, divisionTeams]) => (
              <section className="standings-panel" key={division}>
                <header className="standings-panel-header">{division} Division</header>
                <StandingsTable teams={divisionTeams} onSelectTeam={onSelectTeam} />
              </section>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
