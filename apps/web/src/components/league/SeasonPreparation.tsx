import { PlayerDraft } from "./PlayerDraft";
import { useEffect, useState } from "react";
import {
  getSeasonPreparation,
  lockKeepers,
  unlockKeepers,
  finalizeKeepers,
  hireCoach,
  type PreparationTeam,
  type SeasonPreparationState,
} from "../../api/client";
import { AppSelect } from "../ui/AppSelect";
import "./seasonPreparation.css";

type TeamEdit = { players: string[]; action: string };
export function SeasonPreparation({
  onUpdated,
}: {
  onUpdated: () => Promise<unknown>;
}) {
  const [state, setState] = useState<SeasonPreparationState | null>(null);
  const [edits, setEdits] = useState<Record<string, TeamEdit>>({});
  const [coachId, setCoachId] = useState("");
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  useEffect(() => {
    let live = true;
    getSeasonPreparation()
      .then((s) => {
        if (live) setState(s);
      })
      .catch((e) => {
        if (live) setError(e.message);
      });
    return () => {
      live = false;
    };
  }, []);
  async function perform(
    action: () => Promise<SeasonPreparationState>,
    refresh = false,
  ) {
    setBusy(true);
    setError("");
    try {
      const next = await action();
      setState(next);
      setCoachId("");
      if (refresh) await onUpdated();
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Unable to save season preparation.",
      );
    } finally {
      setBusy(false);
    }
  }
  function edit(team: PreparationTeam) {
    if (team.locked)
      return {
        players: team.selectedPlayerIds,
        action: team.coachAction ?? "hire",
      };
    return (
      edits[team.id] ?? {
        players: team.selectedPlayerIds,
        action: team.coachAction ?? (team.previousCoach ? "" : "hire"),
      }
    );
  }
  if (!state)
    return (
      <section className="offseason">
        <h1>Draft preparation</h1>
        {error ? (
          <>
            <p role="alert">{error}</p>
            <button onClick={() => void perform(getSeasonPreparation)}>
              Try again
            </button>
          </>
        ) : (
          <p role="status">Loading season preparation…</p>
        )}
      </section>
    );
  if (state.draftReady) return <PlayerDraft onUpdated={onUpdated} />;
  const keepersOpen =
    state.phase === "keepers" || state.phase === "finalize_keepers";
  const next = state.teams.find((t) => t.id === state.nextTeamId);
  return (
    <section className="offseason" aria-busy={busy}>
      <header className="offseason__heading">
        <span className="offseason__eyebrow">
          SEASON {state.seasonNumber}
          {state.year ? ` / ${state.year}` : ""}
        </span>
        <h1>Build the next chapter.</h1>
        <p>
          {state.seasonNumber === 1
            ? "Your players are free agents. Assign a coach to every team before the player draft."
            : "Keep your core. Set your coaching staff. Then prepare for the draft."}
        </p>
      </header>
      <ol className="offseason__steps">
        <li className={keepersOpen ? "is-current" : ""}>
          {state.seasonNumber === 1
            ? "No keepers in Season 1"
            : `1. Keepers & coaching decisions (${state.keeperCount} per team)`}
        </li>
        <li className={state.phase === "coach_hiring" ? "is-current" : ""}>
          Coach selection
        </li>
        <li className={state.draftReady ? "is-current" : ""}>Player draft</li>
      </ol>
      {error && (
        <p className="offseason__error" role="alert">
          {error}
        </p>
      )}
      {keepersOpen && (
        <>
          <div className="offseason__section-heading">
            <div>
              <h2>Choose your keepers</h2>
              <p>
                Lock exactly {state.keeperCount} players per team and choose
                whether to keep or fire the coach. You can unlock a team until
                all keepers are finalized.
              </p>
            </div>
            <strong>
              {state.teams.filter((t) => t.locked).length} /{" "}
              {state.teams.length} locked
            </strong>
          </div>
          <div className="offseason__teams">
            {state.teams.map((team) => {
              const value = edit(team);
              return (
                <article className="offseason__team" key={team.id}>
                  <header>
                    {team.logoUrl && (
                      <img
                        src={team.logoUrl}
                        alt=""
                        onError={(event) => {
                          event.currentTarget.style.display = "none";
                        }}
                      />
                    )}
                    <div>
                      <small>{team.abbreviation}</small>
                      <h3>{team.name}</h3>
                    </div>
                    <span>
                      {team.locked
                        ? "Locked"
                        : `${value.players.length} / ${state.keeperCount}`}
                    </span>
                  </header>
                  {team.previousCoach ? (
                    <label className="league-field">
                      Coach: {team.previousCoach.name}
                      <AppSelect
                        aria-label={`Coach decision for ${team.name}`}
                        value={value.action}
                        disabled={busy || team.locked}
                        onChange={(e) =>
                          setEdits({
                            ...edits,
                            [team.id]: { ...value, action: e.target.value },
                          })
                        }
                      >
                        <option value="">Keep or fire…</option>
                        <option value="keep">Keep coach</option>
                        <option value="fire">Fire coach</option>
                      </AppSelect>
                    </label>
                  ) : (
                    <p>No recorded coach. This team will hire a coach.</p>
                  )}
                  <fieldset disabled={busy || team.locked}>
                    <legend>
                      Previous roster · select exactly {state.keeperCount}
                    </legend>
                    {team.roster.map((player) => (
                      <label className="offseason__player" key={player.id}>
                        <input
                          type="checkbox"
                          checked={value.players.includes(player.id)}
                          disabled={
                            !value.players.includes(player.id) &&
                            value.players.length >= (state.keeperCount ?? 0)
                          }
                          onChange={(e) =>
                            setEdits({
                              ...edits,
                              [team.id]: {
                                ...value,
                                players: e.target.checked
                                  ? [...value.players, player.id]
                                  : value.players.filter(
                                      (p) => p !== player.id,
                                    ),
                              },
                            })
                          }
                        />
                        <span>{player.name}</span>
                        <small>{player.position}</small>
                      </label>
                    ))}
                  </fieldset>
                  {team.locked ? (
                    <button
                      disabled={busy}
                      className="offseason__secondary"
                      onClick={() =>
                        void perform(() =>
                          unlockKeepers(state.seasonId, team.id),
                        )
                      }
                    >
                      Unlock team
                    </button>
                  ) : (
                    <button
                      disabled={
                        busy ||
                        value.players.length !== state.keeperCount ||
                        !value.action
                      }
                      onClick={() =>
                        void perform(() =>
                          lockKeepers(
                            state.seasonId,
                            team.id,
                            value.players,
                            value.action,
                          ),
                        )
                      }
                    >
                      Lock keepers
                    </button>
                  )}
                </article>
              );
            })}
          </div>
          <div className="offseason__finalize">
            <p>
              Finalizing releases every non-keeper into the new season’s draft
              pool and makes fired coaches available for rehiring. Previous
              seasons stay intact.
            </p>
            <button
              disabled={busy || state.phase !== "finalize_keepers"}
              onClick={() =>
                void perform(() => finalizeKeepers(state.seasonId), true)
              }
            >
              Finalize keepers
            </button>
          </div>
        </>
      )}
      {state.phase === "coach_hiring" && (
        <>
          <div className="offseason__section-heading">
            <div>
              <h2>Choose your coaches</h2>
              <p>
                The order was randomized once and is saved. Each coach can lead
                one team. Fired coaches can be hired again.
              </p>
            </div>
          </div>
          <ol className="offseason__coach-order">
            {state.coachOrder.map((id, index) => {
              const team = state.teams.find((t) => t.id === id);
              return (
                team && (
                  <li
                    key={id}
                    className={id === state.nextTeamId ? "is-current" : ""}
                  >
                    <span>
                      {index + 1}. {team.name}
                    </span>
                    <strong>
                      {team.coach?.name ??
                        (id === state.nextTeamId ? "On the clock" : "Waiting")}
                    </strong>
                  </li>
                )
              );
            })}
          </ol>
          {next && (
            <div className="offseason__hire">
              <h3>{next.name} are on the clock</h3>
              <label className="league-field">
                Available coaches
                <AppSelect
                  aria-label={`Coach for ${next.name}`}
                  value={coachId}
                  disabled={busy}
                  onChange={(e) => setCoachId(e.target.value)}
                >
                  <option value="">Select a coach…</option>
                  {state.availableCoaches.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                      {c.type ? ` · ${c.type}` : ""}
                    </option>
                  ))}
                </AppSelect>
              </label>
              {!state.availableCoaches.length && (
                <p role="alert">
                  No unassigned coaches are available. Add coaches to this
                  league’s coach pool before continuing.
                </p>
              )}
              <button
                disabled={busy || !coachId}
                onClick={() =>
                  void perform(
                    () => hireCoach(state.seasonId, next.id, coachId),
                    true,
                  )
                }
              >
                Hire coach
              </button>
            </div>
          )}
        </>
      )}
      {!keepersOpen && state.phase !== "coach_hiring" && (
        <div className="offseason__staff">
          {state.teams
            .filter((t) => t.coach)
            .map((t) => (
              <div key={t.id}>
                <strong>{t.name}</strong>
                <span>{t.coach?.name}</span>
              </div>
            ))}
        </div>
      )}
      {(state.phase === "in_progress" || state.phase === "season_complete") && (
        <p>
          {state.phase === "season_complete"
            ? "The championship is complete. Advance Season to start next year’s coaching and keeper decisions."
            : "The player draft is closed during the season. Next year’s preparation opens after the National Championship."}
        </p>
      )}
    </section>
  );
}
