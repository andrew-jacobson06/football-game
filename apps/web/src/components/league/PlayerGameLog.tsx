import type { LeagueSeason, PlayerGame } from "../../api/client";
import { AppSelect } from "../ui/AppSelect";
import type { LeagueTeam } from "./types";
import { gameLogGroups, gameLogTotals } from "./gameLogStats";

export function SeasonSelect({ seasons, seasonId, onChange }: { seasons: LeagueSeason[]; seasonId: string; onChange: (id: string) => void }) {
  return <label className="stats-select"><span className="sr-only">Season / year</span><AppSelect aria-label="Season / year" value={seasonId} onChange={e => onChange(e.target.value)} disabled={!seasons.length}>
    {!seasons.length && <option value="">Loading seasons…</option>}
    {seasons.map(season => <option key={season.id} value={season.id}>{season.name}{season.year ? ` (${season.year})` : ""}</option>)}
  </AppSelect></label>;
}
export function PlayerGameLog({ position, games, loading, error, teams, seasons, seasonId, onSeasonChange }: {
  position: string; games: PlayerGame[]; loading: boolean; error: string | null; teams: LeagueTeam[];
  seasons: LeagueSeason[]; seasonId: string; onSeasonChange: (id: string) => void;
}) {
  const groups = gameLogGroups(position);
  const season = seasons.find(s => s.id === seasonId);
  const cells = (game: PlayerGame) => groups.flatMap(group => group.columns.map((column, index) => <td className={index === 0 ? "game-log-group-start" : ""} key={`${group.label}-${column.label}`}>{column.value(game).toLocaleString(undefined, { minimumFractionDigits: column.decimals ?? 0, maximumFractionDigits: column.decimals ?? 0 })}</td>));
  return <section className="player-game-log">
    <header><h2>Game Log</h2><SeasonSelect seasons={seasons} seasonId={seasonId} onChange={onSeasonChange} /></header>
    {loading || error ? <p role="status">{loading ? "Loading game log…" : error}</p> : !groups.length ? <p>Offensive game logs are available for QB, RB, WR, TE and OL.</p> : !games.length ? <p>No completed games recorded for this player in {season?.name ?? "this season"}.</p> :
      ["regular", "playoffs"].map(stage => {
        const rows = games.filter(g => stage === "regular" ? g.stage === "regular" : g.stage !== "regular");
        if (!rows.length) return null;
        return <div className="player-stat-table-scroll" key={stage} tabIndex={0} aria-label={`${stage === "regular" ? "Regular season" : "Postseason"} game log`}>
          <table className="player-game-log-table"><thead>
            <tr><th colSpan={3}>{season?.name} · {stage === "regular" ? "REGULAR SEASON" : "POSTSEASON"}</th>{groups.map(group => <th className="game-log-group-start" key={group.label} colSpan={group.columns.length}>{group.label}</th>)}</tr>
            <tr><th>WEEK</th><th>OPP</th><th>RESULT</th>{groups.flatMap(group => group.columns.map((column, index) => <th className={index === 0 ? "game-log-group-start" : ""} key={`${group.label}-${column.label}`}>{column.label}</th>))}</tr>
          </thead><tbody>{rows.map(g => {
            const opponent = teams.find(t => String(t.Abbrev).trim().toUpperCase() === g.opponent.trim().toUpperCase());
            return <tr key={`${g.gameId}-${g.team}`}><td>{g.week}</td><td><span className="game-log-opponent"><span>{g.location}</span>{opponent?.Logo && <img src={String(opponent.Logo)} alt="" />}<span>{g.opponent}</span></span></td><td className="game-log-result"><span className={g.result.startsWith("W") ? "game-result-win" : g.result.startsWith("L") ? "game-result-loss" : "game-result-tie"}>{g.result.slice(0, 1)}</span> {g.result.slice(2)}</td>{cells(g)}</tr>;
          })}</tbody><tfoot><tr><th colSpan={3}>{stage === "regular" ? "REGULAR SEASON" : "POSTSEASON"} TOTALS</th>{cells(gameLogTotals(rows))}</tr></tfoot></table>
        </div>;
      })}
  </section>;
}
