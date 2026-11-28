import { useEffect, useRef, useState } from "react";
import type { DraftPlayer, DraftTeam } from "../../api/client";
import { traits, type SortKey } from "./draftSkills";

const metrics = [
  "Passing score",
  "Rushing score",
  "Receiving score",
  "Run block score",
  "Pass protect score",
  "Runstop score",
  "Pass rush score",
  "Coverage score",
];
export function DraftRosterDetails({
  team,
  players,
  onClose,
}: {
  team: DraftTeam;
  players: DraftPlayer[];
  onClose: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [view, setView] = useState<"skills" | "metrics">("skills");
  const [sort, setSort] = useState<SortKey>("Name"),
    [descending, setDescending] = useState(false);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null,
      overflow = document.body.style.overflow;
    dialog.current?.showModal();
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = overflow;
      previous?.focus();
    };
  }, []);
  const sorted = [...players].sort((a, b) => {
    const aa = a[sort],
      bb = b[sort],
      missingA = aa === undefined || aa === "",
      missingB = bb === undefined || bb === "";
    if (missingA !== missingB) return missingA ? 1 : -1;
    const diff =
      sort === "Name" || sort === "Pos" || sort === "DefPos"
        ? String(aa ?? "").localeCompare(String(bb ?? ""))
        : Number(aa ?? 0) - Number(bb ?? 0);
    return (
      (descending ? -diff : diff) ||
      String(a.Name).localeCompare(String(b.Name))
    );
  });
  function sortBy(key: SortKey) {
    if (sort === key) setDescending(!descending);
    else {
      setSort(key);
      setDescending(key !== "Name" && key !== "Pos" && key !== "DefPos");
    }
  }
  return (
    <dialog
      ref={dialog}
      className="draft-roster-dialog"
      aria-labelledby="draft-roster-title"
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
    >
      <header className="draft-roster-dialog__header">
        <div>
          <span className="draft-eyebrow">
            {team.abbreviation} / CURRENT ROSTER
          </span>
          <h2 id="draft-roster-title">{team.name}</h2>
          <p>
            {players.length} {players.length === 1 ? "player" : "players"} ·
            Live draft roster
          </p>
        </div>
        <button
          className="draft-secondary"
          aria-label="Close expanded roster"
          onClick={onClose}
        >
          ×
        </button>
      </header>
      <div
        className="draft-tabs"
        role="tablist"
        aria-label="Expanded roster views"
      >
        <button
          id="roster-skills-tab"
          role="tab"
          aria-selected={view === "skills"}
          aria-controls="roster-skills-panel"
          onClick={() => setView("skills")}
        >
          Player skills
        </button>
        <button
          id="roster-metrics-tab"
          role="tab"
          aria-selected={view === "metrics"}
          aria-controls="roster-metrics-panel"
          onClick={() => setView("metrics")}
        >
          Team metrics
        </button>
      </div>
      {view === "skills" ? (
        <div
          role="tabpanel"
          id="roster-skills-panel"
          aria-labelledby="roster-skills-tab"
          className="draft-roster-dialog__body"
        >
          <p className="draft-roster-dialog__hint">
            Select a column to sort. Select it again to reverse the order.
          </p>
          <div className="draft-player-scroll">
            <table className="draft-player-table">
              <caption className="draft-sr-only">
                {team.name} full player skills
              </caption>
              <thead>
                <tr>
                  {(["Name", "Pos", "DefPos", ...traits] as const).map(
                    (key) => (
                      <th
                        key={key}
                        aria-sort={
                          sort === key
                            ? descending
                              ? "descending"
                              : "ascending"
                            : "none"
                        }
                      >
                        <button onClick={() => sortBy(key)}>
                          {key === "Name"
                            ? "Player"
                            : key === "Pos"
                              ? "Offense"
                              : key === "DefPos"
                                ? "Defense"
                                : key}
                          {sort === key ? (descending ? " ↓" : " ↑") : ""}
                        </button>
                      </th>
                    ),
                  )}
                </tr>
              </thead>
              <tbody>
                {sorted.map((player) => (
                  <tr key={player.id}>
                    {(["Name", "Pos", "DefPos", ...traits] as const).map(
                      (key) => (
                        <td key={key}>
                          {player[key] === undefined || player[key] === ""
                            ? "—"
                            : player[key]}
                        </td>
                      ),
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
            {!players.length && (
              <p className="draft-player-empty">
                No players on this roster yet. Draft selections will appear
                here.
              </p>
            )}
          </div>
        </div>
      ) : (
        <div
          role="tabpanel"
          id="roster-metrics-panel"
          aria-labelledby="roster-metrics-tab"
          className="draft-roster-dialog__body"
        >
          <p className="draft-roster-dialog__hint">
            Team metrics will use the {players.length}{" "}
            {players.length === 1 ? "player" : "players"} on this roster. Scores
            are pending the calculation formulas.
          </p>
          <dl className="draft-team-metrics">
            {metrics.map((metric) => (
              <div key={metric}>
                <dt>{metric}</dt>
                <dd aria-label="Not calculated">—</dd>
                <small>Formula pending</small>
              </div>
            ))}
          </dl>
        </div>
      )}
    </dialog>
  );
}
