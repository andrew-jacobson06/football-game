import { useEffect, useState } from "react";
import { getPlayerCareerStats, type CareerStatLine, type PlayerCareerStats as CareerData } from "../../api/client";
import { AppSelect } from "../ui/AppSelect";
import { careerCategoryOrder, careerColumns, type CareerColumn } from "./careerStatColumns";

function statText(column: CareerColumn, line: CareerStatLine) {
  const value = column.value(line);
  return value === null ? "—" : value.toLocaleString(undefined, { minimumFractionDigits: column.decimals ?? 0, maximumFractionDigits: column.decimals ?? 0 });
}
export function PlayerCareerStats({ name, position }: { name: string; position: string }) {
  const [scope, setScope] = useState<"regular" | "playoffs">("regular");
  const [result, setResult] = useState<{ key: string; data?: CareerData; error?: string } | null>(null);
  const requestKey = `${name}:${scope}`;
  const loaded = result?.key === requestKey;
  const data = loaded ? result.data : undefined;
  useEffect(() => {
    let active = true;
    getPlayerCareerStats(name, scope).then(data => { if (active) setResult({ key: requestKey, data }); })
      .catch(error => { if (active) setResult({ key: requestKey, error: error.message }); });
    return () => { active = false; };
  }, [name, scope, requestKey]);
  return <section className="player-career-stats">
    <header className="player-career-heading"><h2>Stats</h2><label className="stats-select"><span className="sr-only">Season type</span><AppSelect aria-label="Season type" value={scope} onChange={event => setScope(event.target.value as "regular" | "playoffs")}><option value="regular">Regular Season</option><option value="playoffs">Postseason</option></AppSelect></label></header>
    {!loaded ? <p role="status">Loading career statistics…</p> : result.error ? <p role="alert">{result.error}</p> : null}
    {careerCategoryOrder(position).map(category => {
      const columns = careerColumns[category];
      return <section className="player-career-category" key={category} aria-label={`${category} season statistics`}><h3>{category}</h3>
        <div className="player-stat-table-scroll" tabIndex={0} aria-label={`${category} career table`}>
          <table className="player-career-table"><colgroup><col className="career-season-column" /><col className="career-team-column" />{columns.map(column => <col key={column.label} />)}</colgroup><thead><tr><th scope="col">SEASON</th><th scope="col">TEAM</th>{columns.map(column => <th scope="col" key={column.label}>{column.label}</th>)}</tr></thead>
            <tbody>{data?.seasons.map(row => <tr key={`${row.seasonId}-${row.teamId}`}><th scope="row" title={row.seasonName}>{row.year ?? row.seasonName}</th><td><span className="career-team">{row.logo && <img src={row.logo} alt="" onError={event => { event.currentTarget.style.display = "none"; }} />}{row.team}</span></td>{columns.map(column => <td key={column.label}>{statText(column, row)}</td>)}</tr>)}
              {data && !data.seasons.length && <tr><td colSpan={columns.length + 2}>No completed {scope === "regular" ? "regular-season" : "postseason"} statistics recorded.</td></tr>}
            </tbody>
            {data && <tfoot><tr><th scope="row" colSpan={2}>Career</th>{columns.map(column => <td key={column.label}>{statText(column, data.career)}</td>)}</tr></tfoot>}
          </table>
        </div>
      </section>;
    })}
  </section>;
}
