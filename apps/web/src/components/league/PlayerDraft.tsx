import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import {
  getPlayerDraft,
  startPlayerDraft,
  makeDraftPick,
  type DraftPlayer,
  type DraftTeam,
  type PlayerDraftState,
} from "../../api/client";
import { AppSelect } from "../ui/AppSelect";
import "./playerDraft.css";
const traits = [
  "Off Stars",
  "Def Stars",
  "Size",
  "Strength",
  "Speed",
  "Stamina",
  "Poise",
  "Accuracy",
  "Arm-Strength",
  "Read Defense",
  "Juke",
  "Vision",
  "Acceleration",
  "Route Running",
  "Jump",
  "Hands",
  "Ball Security",
  "QB Favorite",
  "Run Blocking",
  "Pass Protect",
  "RunStop",
  "Tackling",
  "Run Def",
  "Tackle Chance",
  "Strip",
  "PassRush",
  "Sack Chance",
  "Ball Hawk",
  "Read QB",
  "Coverage",
] as const;
type SortKey = (typeof traits)[number] | "Name" | "Pos" | "DefPos";
function TeamMark({ team }: { team: DraftTeam }) {
  return (
    <span className="draft-mark">
      <span>{team.abbreviation}</span>
      {team.logoUrl && (
        <img
          src={team.logoUrl}
          alt=""
          onError={(event) => {
            event.currentTarget.style.display = "none";
          }}
        />
      )}
    </span>
  );
}
export function PlayerDraft({
  onUpdated,
}: {
  onUpdated: () => Promise<unknown>;
}) {
  const [state, setState] = useState<PlayerDraftState | null>(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState(""),
    [view, setView] = useState<"board" | "players">("board");
  const [position, setPosition] = useState(""),
    [sort, setSort] = useState<SortKey>("Speed"),
    [descending, setDescending] = useState(true);
  const [target, setTarget] = useState(""),
    [selectedPlayer, setSelectedPlayer] = useState("");
  const selectedRow = useRef<HTMLButtonElement | null>(null);
  useEffect(() => {
    let live = true;
    getPlayerDraft()
      .then((s) => {
        if (live) {
          setState(s);
          setSelectedTeam(s.currentPick?.teamId ?? s.teams[0]?.id ?? "");
          setTarget(String(s.rosterTarget ?? s.suggestedRosterTarget));
        }
      })
      .catch((e) => {
        if (live) setError(e.message);
      });
    return () => {
      live = false;
    };
  }, []);
  useEffect(() => {
    if (view === "board" && state?.currentPick?.id)
      selectedRow.current?.scrollIntoView({
        block: "nearest",
        inline: "center",
      });
  }, [view, state?.currentPick?.id]);
  const available = useMemo(() => {
    const players = (state?.players ?? []).filter(
      (p) =>
        !p.teamId && (!position || p.Pos === position || p.DefPos === position),
    );
    return players.sort((a, b) => {
      const aa = a[sort],
        bb = b[sort];
      const missingA = aa === undefined || aa === "",
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
  }, [state, position, sort, descending]);
  async function perform(action: () => Promise<PlayerDraftState>) {
    setBusy(true);
    setError("");
    try {
      const next = await action();
      setState(next);
      setSelectedPlayer("");
      if (next.currentPick) setSelectedTeam(next.currentPick.teamId);
      await onUpdated();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to save the draft.");
      getPlayerDraft()
        .then(setState)
        .catch(() => undefined);
    } finally {
      setBusy(false);
    }
  }
  if (!state)
    return (
      <section className="draft-room">
        <h1>Draft room</h1>
        {error ? (
          <>
            <p role="alert">{error}</p>
            <button onClick={() => void perform(getPlayerDraft)}>
              Try again
            </button>
          </>
        ) : (
          <p role="status">Loading the draft board…</p>
        )}
      </section>
    );
  const team = state.teams.find((t) => t.id === selectedTeam) ?? state.teams[0];
  const roster = state.players.filter((p) => p.teamId === team?.id);
  const onClock = state.teams.find((t) => t.id === state.currentPick?.teamId);
  const rounds =
    state.status === "planned"
      ? Math.max(0, Math.min(100, Number(target) || 0) - roster.length)
      : state.rounds;
  const preview =
    state.status === "planned"
      ? Array.from({ length: rounds }, (_, r) =>
          (r % 2 ? [...state.teams].reverse() : state.teams).map((t, i) => ({
            id: `${r}-${t.id}`,
            round: r + 1,
            pickInRound: i + 1,
            overallPick: r * state.teams.length + i + 1,
            teamId: t.id,
            playerId: null,
          })),
        ).flat()
      : state.picks;
  const selected = state.players.find(
    (p) => p.id === selectedPlayer && !p.teamId,
  );
  const positions = [
    ...new Set(
      state.players
        .flatMap((p) => [p.Pos, p.DefPos])
        .filter((p): p is string => !!p),
    ),
  ].sort();
  const sortBy = (key: SortKey) => {
    if (sort === key) setDescending(!descending);
    else {
      setSort(key);
      setDescending(key !== "Name" && key !== "Pos" && key !== "DefPos");
    }
  };
  const playerName = (player: DraftPlayer) => (
    <>
      <strong>{player.Name}</strong>
      <small>
        {player.Pos || "—"}
        {player.DefPos ? ` / ${player.DefPos}` : ""}
      </small>
    </>
  );
  return (
    <section className="draft-room">
      <header className="draft-room__heading">
        <div>
          <span className="draft-eyebrow">SEASON DRAFT / SNAKE FORMAT</span>
          <h1>Make your next move.</h1>
          <p>
            {state.status === "completed"
              ? "Every pick is in. Your rosters are set."
              : state.status === "planned"
                ? "Your order is locked. Build a roster that can go all the way."
                : `Round ${state.currentPick?.round} · Pick ${state.currentPick?.overallPick} of ${state.picks.length}`}
          </p>
        </div>
        <div className="draft-room__status" aria-live="polite">
          {onClock ? (
            <>
              <TeamMark team={onClock} />
              <span>
                <small>ON THE CLOCK</small>
                <strong>{onClock.name}</strong>
              </span>
            </>
          ) : (
            <strong>
              {state.status === "completed"
                ? "DRAFT COMPLETE"
                : "DRAFT PREVIEW"}
            </strong>
          )}
        </div>
      </header>
      {state.status === "planned" && (
        <form
          className="draft-start"
          onSubmit={(e) => {
            e.preventDefault();
            void perform(() =>
              startPlayerDraft(state.seasonId, Number(target)),
            );
          }}
        >
          <label className="league-field">
            Final roster size
            <input
              aria-label="Final roster size"
              type="number"
              min={Math.max(1, roster.length)}
              max={100}
              step={1}
              required
              disabled={busy}
              value={target}
              onChange={(e) => setTarget(e.target.value)}
            />
          </label>
          <p>
            Includes keepers. {rounds} draft rounds per team.
            <br />
            {state.orderMethod === "random_at_league_creation"
              ? "First-round order randomized once at league creation."
              : "Worst previous-season finish picks first; tied finishes use regular-season rankings."}
          </p>
          <button
            className="draft-primary"
            disabled={busy || !state.ready || target === ""}
          >
            {busy ? "Starting…" : "Start draft"}
          </button>
        </form>
      )}
      {error && (
        <p className="draft-error" role="alert">
          {error}
        </p>
      )}
      <div className="draft-layout">
        <aside className="draft-roster" aria-label="Current team roster">
          <div className="draft-roster__identity">
            {team && <TeamMark team={team} />}
            <span>
              <small>VIEWING ROSTER</small>
              <h2>{team?.name}</h2>
            </span>
          </div>
          <div className="draft-roster__count">
            <strong>
              {roster.length}
              {state.rosterTarget ? ` / ${state.rosterTarget}` : ""}
            </strong>
            <span>PLAYERS</span>
          </div>
          {onClock && team?.id !== onClock.id && (
            <button
              className="draft-secondary"
              onClick={() => setSelectedTeam(onClock.id)}
            >
              View team on the clock
            </button>
          )}
          <ul>
            {roster.map((p) => (
              <li key={p.id}>
                {playerName(p)}
                <span>
                  {state.picks.some((pick) => pick.playerId === p.id)
                    ? "Drafted"
                    : "Keeper"}
                </span>
              </li>
            ))}
          </ul>
          {!roster.length && (
            <p className="draft-roster__empty">
              A clean slate.
              <br />
              This team’s selections will appear here.
            </p>
          )}
          <p className="draft-roster__hint">
            Click a team logo on the board to view its roster.
          </p>
        </aside>
        <div className="draft-workspace">
          <div className="draft-tabs" role="tablist" aria-label="Draft views">
            <button
              id="draft-board-tab"
              role="tab"
              aria-selected={view === "board"}
              aria-controls="draft-board-panel"
              onClick={() => setView("board")}
            >
              Draft board
            </button>
            <button
              id="draft-players-tab"
              role="tab"
              aria-selected={view === "players"}
              aria-controls="draft-players-panel"
              onClick={() => setView("players")}
            >
              Available players{" "}
              <span>{state.players.filter((p) => !p.teamId).length}</span>
            </button>
          </div>
          {view === "board" ? (
            <div
              id="draft-board-panel"
              role="tabpanel"
              aria-labelledby="draft-board-tab"
            >
              <div className="draft-board-scroll">
                <div
                  className="draft-board"
                  style={
                    { "--draft-teams": state.teams.length } as CSSProperties
                  }
                >
                  <div className="draft-board__corner">RD</div>
                  {state.teams.map((t, i) => (
                    <button
                      key={t.id}
                      aria-label={`View ${t.name} roster`}
                      aria-pressed={team?.id === t.id}
                      className={`draft-board__team ${team?.id === t.id ? "is-selected" : ""} ${onClock?.id === t.id ? "is-on-clock" : ""}`}
                      style={
                        {
                          "--team-color": t.primaryColor || "var(--accent-red)",
                        } as CSSProperties
                      }
                      onClick={() => setSelectedTeam(t.id)}
                    >
                      <small>{String(i + 1).padStart(2, "0")}</small>
                      <TeamMark team={t} />
                      <strong>{t.abbreviation}</strong>
                    </button>
                  ))}
                  {Array.from({ length: rounds }, (_, r) => (
                    <div className="draft-board__round" key={r}>
                      <div className="draft-board__round-label">
                        <strong>{r + 1}</strong>
                        <span>{r % 2 ? "←" : "→"}</span>
                      </div>
                      {state.teams.map((t) => {
                        const pick = preview.find(
                          (p) => p.round === r + 1 && p.teamId === t.id,
                        );
                        const player = state.players.find(
                          (p) => p.id === pick?.playerId,
                        );
                        const current = pick?.id === state.currentPick?.id;
                        return (
                          <button
                            key={t.id}
                            ref={current ? selectedRow : undefined}
                            className={`draft-board__pick ${current ? "is-current" : ""} ${player ? "is-filled" : ""}`}
                            onClick={() => {
                              setSelectedTeam(t.id);
                              if (current) setView("players");
                            }}
                            aria-label={`Round ${r + 1}, pick ${pick?.overallPick}, ${t.name}${player ? `, ${player.Name}` : current ? ", on the clock" : ""}`}
                          >
                            <small>
                              {r + 1}.{pick?.pickInRound}{" "}
                              <span>#{pick?.overallPick}</span>
                            </small>
                            {player ? (
                              playerName(player)
                            ) : current ? (
                              <>
                                <strong>On the clock</strong>
                                <span className="draft-board__cta">
                                  Choose player ↗
                                </span>
                              </>
                            ) : (
                              <span className="draft-board__waiting">
                                {state.status === "planned" ? "Upcoming" : "—"}
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  ))}
                </div>
              </div>
              <p className="draft-board__hint">
                Snake order reverses each round. Select a logo to inspect a
                roster; select the active pick to choose a player.
              </p>
            </div>
          ) : (
            <div
              id="draft-players-panel"
              role="tabpanel"
              aria-labelledby="draft-players-tab"
            >
              <div className="draft-filters">
                <label>
                  Position
                  <AppSelect
                    aria-label="Filter available players by position"
                    value={position}
                    onChange={(e) => setPosition(e.target.value)}
                  >
                    <option value="">All positions</option>
                    {positions.map((p) => (
                      <option key={p}>{p}</option>
                    ))}
                  </AppSelect>
                </label>
                <label>
                  Sort by
                  <AppSelect
                    aria-label="Sort available players"
                    value={sort}
                    onChange={(e) => {
                      setSort(e.target.value as SortKey);
                      setDescending(true);
                    }}
                  >
                    {["Name", "Pos", "DefPos", ...traits].map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </AppSelect>
                </label>
                <button
                  className="draft-secondary"
                  aria-label="Reverse player sort"
                  onClick={() => setDescending(!descending)}
                >
                  {descending ? "High → Low" : "Low → High"}
                </button>
                <span>{available.length} available</span>
              </div>
              <div className="draft-player-scroll">
                <table className="draft-player-table">
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
                                : key === "DefPos"
                                  ? "Defense"
                                  : key === "Pos"
                                    ? "Offense"
                                    : key}
                              {sort === key ? (descending ? " ↓" : " ↑") : ""}
                            </button>
                          </th>
                        ),
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {available.map((player) => (
                      <tr
                        key={player.id}
                        className={
                          selectedPlayer === player.id ? "is-selected" : ""
                        }
                      >
                        {(["Name", "Pos", "DefPos", ...traits] as const).map(
                          (key) => (
                            <td key={key}>
                              {key === "Name" ? (
                                <button
                                  className="draft-player-name"
                                  aria-pressed={selectedPlayer === player.id}
                                  onClick={() => setSelectedPlayer(player.id)}
                                >
                                  {player.Name}
                                </button>
                              ) : (
                                (player[key] ?? "—")
                              )}
                            </td>
                          ),
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
                {!available.length && (
                  <p className="draft-player-empty">
                    No available players match this position.
                  </p>
                )}
              </div>
            </div>
          )}
          {selected && view === "players" && (
            <div className="draft-selection" aria-live="polite">
              <span>{playerName(selected)}</span>
              <button
                className="draft-primary"
                disabled={
                  busy || state.status !== "running" || !state.currentPick
                }
                onClick={() => {
                  if (state.currentPick)
                    void perform(() =>
                      makeDraftPick(
                        state.seasonId,
                        state.currentPick!.id,
                        selected.id,
                      ),
                    );
                }}
              >
                {busy
                  ? "Saving pick…"
                  : onClock
                    ? `Draft for ${onClock.abbreviation}`
                    : "Draft not running"}
              </button>
              <button
                className="draft-secondary"
                onClick={() => setSelectedPlayer("")}
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
