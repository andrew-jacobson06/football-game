import { useEffect, useRef, useState } from "react";
import type { CSSProperties, FormEvent } from "react";
import {
  createLeague,
  getLeagueCatalog,
  getLeagueSlots,
  type CatalogTeam,
  type LeagueSummary,
  type LeagueTeamChoice,
} from "../../api/client";
import { AppSelect } from "../ui/AppSelect";
import "./leagueSetup.css";
type TeamDraft = CatalogTeam & {
  included: boolean;
  division: string;
  custom?: LeagueTeamChoice["custom"];
};
type Props = {
  mode: "new" | "existing";
  onClose: () => void;
  onOpen: (league: LeagueSummary) => void;
  onNew: () => void;
};
export function LeagueDialog({ mode, onClose, onOpen, onNew }: Props) {
  const dialog = useRef<HTMLDialogElement>(null),
    nameInput = useRef<HTMLInputElement>(null),
    alive = useRef(true);
  const requestId = useRef(crypto.randomUUID());
  const [step, setStep] = useState<"name" | "teams">("name");
  const [leagues, setLeagues] = useState<LeagueSummary[]>([]),
    [slotsLoaded, setSlotsLoaded] = useState(false);
  const [keeperCount, setKeeperCount] = useState("");
  const [name, setName] = useState(""),
    [teams, setTeams] = useState<TeamDraft[]>([]),
    [divisions, setDivisions] = useState<string[]>([]);
  const [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [loading, setLoading] = useState(true);
  const [addingTeam, setAddingTeam] = useState(false),
    [custom, setCustom] = useState({
      location: "",
      nickname: "",
      abbreviation: "",
      division: "",
      logoUrl: "",
      primaryColor: "",
    });
  const [divisionName, setDivisionName] = useState("");
  const loadSlots = () => {
    setLoading(true);
    setError("");
    getLeagueSlots()
      .then((r) => {
        if (alive.current) {
          setLeagues(r.leagues);
          setSlotsLoaded(true);
        }
      })
      .catch((e) => {
        if (alive.current) setError(e.message);
      })
      .finally(() => {
        if (alive.current) setLoading(false);
      });
  };
  useEffect(() => {
    alive.current = true;
    const previous = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    dialog.current?.showModal();
    document.body.style.overflow = "hidden";
    getLeagueSlots()
      .then((r) => {
        if (alive.current) {
          setLeagues(r.leagues);
          setSlotsLoaded(true);
        }
      })
      .catch((e) => {
        if (alive.current) setError(e.message);
      })
      .finally(() => {
        if (alive.current) setLoading(false);
      });
    return () => {
      alive.current = false;
      document.body.style.overflow = previousOverflow;
      previous?.focus();
    };
  }, []);
  useEffect(() => {
    if (mode === "new" && step === "name") nameInput.current?.focus();
  }, [mode, step]);
  const committing = busy && step === "teams";
  const close = () => {
    if (!committing) onClose();
  };
  const next = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    if (!name.trim()) return setError("Give your league a name.");
    if (
      keeperCount === "" ||
      !Number.isSafeInteger(Number(keeperCount)) ||
      Number(keeperCount) < 0 ||
      Number(keeperCount) > 100
    )
      return setError("Enter a keeper count between 0 and 100.");
    if (leagues.length >= 3)
      return setError("All three league slots are occupied.");
    setBusy(true);
    try {
      if (step === "name") {
        if (!teams.length) {
          const catalog = await getLeagueCatalog();
          if (!alive.current) return;
          setTeams(
            catalog.teams.map((t) => ({
              ...t,
              included: true,
              division: t.defaultDivision,
            })),
          );
          setDivisions(catalog.divisions);
          setCustom((c) => ({ ...c, division: catalog.divisions[0] ?? "" }));
        }
        setStep("teams");
      } else {
        const chosen = teams.filter((t) => t.included);
        if (chosen.length < 2)
          throw new Error("Include at least two teams to create your league.");
        if (addingTeam)
          throw new Error(
            "Add or cancel the team you are editing before continuing.",
          );
        const { league } = await createLeague({
          name: name.trim(),
          keeperCount: Number(keeperCount),
          requestId: requestId.current,
          divisions,
          teams: chosen.map((t) => ({
            division: t.division,
            ...(t.custom ? { custom: t.custom } : { catalogId: t.id }),
          })),
        });
        if (alive.current) onOpen(league);
      }
    } catch (e) {
      if (alive.current)
        setError(
          e instanceof Error ? e.message : "Unable to create your league.",
        );
    } finally {
      if (alive.current) setBusy(false);
    }
  };
  const addDivision = () => {
    const value = divisionName.trim();
    if (!value) return;
    if (
      divisions.length >= 8 ||
      value.length > 40 ||
      divisions.some((d) => d.toLowerCase() === value.toLowerCase())
    )
      return setError(
        "Use a distinct division name, up to 40 characters (maximum eight divisions).",
      );
    setDivisions([...divisions, value]);
    setDivisionName("");
    setError("");
  };
  const addTeam = () => {
    const abbreviation = custom.abbreviation.trim().toUpperCase(),
      nickname = custom.nickname.trim();
    if (
      !nickname ||
      nickname.length > 40 ||
      !/^[A-Z0-9]{2,5}$/.test(abbreviation)
    )
      return setError(
        "Enter a nickname and a 2–5 character team abbreviation.",
      );
    if (
      teams.some(
        (t) => t.abbreviation.toLowerCase() === abbreviation.toLowerCase(),
      )
    )
      return setError("That team abbreviation is already in the list.");
    if (teams.length >= 32)
      return setError("A league can have up to 32 teams.");
    if (!divisions.includes(custom.division))
      return setError("Choose a division for the new team.");
    if (custom.logoUrl) {
      try {
        const url = new URL(custom.logoUrl);
        if (!["http:", "https:"].includes(url.protocol)) throw Error();
      } catch {
        return setError("Use an HTTP or HTTPS URL for the team logo.");
      }
    }
    if (custom.primaryColor && !/^#[0-9a-f]{6}$/i.test(custom.primaryColor))
      return setError("Use a six-digit hex team color, such as #c10206.");
    const details = { ...custom, abbreviation, nickname };
    setTeams([
      ...teams,
      {
        id: crypto.randomUUID(),
        abbreviation,
        nickname,
        location: custom.location.trim(),
        logoUrl: custom.logoUrl || null,
        primaryColor: custom.primaryColor || null,
        defaultDivision: custom.division,
        division: custom.division,
        included: true,
        custom: details,
      },
    ]);
    setCustom({
      location: "",
      nickname: "",
      abbreviation: "",
      division: divisions[0],
      logoUrl: "",
      primaryColor: "",
    });
    setAddingTeam(false);
    setError("");
  };
  const selected = teams.filter((t) => t.included).length;
  return (
    <dialog
      ref={dialog}
      className={`league-dialog ${mode === "new" && step === "teams" ? "league-dialog--wide" : ""}`}
      aria-labelledby="league-dialog-title"
      onCancel={(e) => {
        e.preventDefault();
        close();
      }}
    >
      <header className="league-dialog__header">
        <div>
          <p className="league-dialog__eyebrow">
            {mode === "existing"
              ? "PICK YOUR LEAGUE"
              : `LEAGUE SETUP / ${step === "name" ? "01" : "02"}`}
          </p>
          <h1 id="league-dialog-title">
            {mode === "existing"
              ? "Existing leagues"
              : step === "name"
                ? "Build your league."
                : "Make it your own."}
          </h1>
        </div>
        <button
          className="league-dialog__close"
          type="button"
          aria-label="Close league dialog"
          disabled={committing}
          onClick={close}
        >
          ×
        </button>
      </header>
      {mode === "existing" ? (
        <>
          <div className="league-dialog__body">
            <p className="league-dialog__intro">
              Three slots. Your leagues, your way.
            </p>
            {loading && <p role="status">Loading your leagues…</p>}
            {!loading && (
              <div className="league-slots">
                {[1, 2, 3].map((slot) => {
                  const league = leagues.find((l) => l.slot === slot);
                  return (
                    <button
                      type="button"
                      className={`league-slot ${league ? "" : "league-slot--empty"}`}
                      key={slot}
                      onClick={() => (league ? onOpen(league) : onNew())}
                      disabled={!slotsLoaded}
                    >
                      <span className="league-slot__number">0{slot}</span>
                      <span>
                        <strong>{league?.name ?? "Empty slot"}</strong>
                        <small>
                          {league
                            ? `Season ${league.seasonNumber} · ${league.teamCount} teams · ${league.status === "setup" ? "Draft setup" : league.stage === "regular" ? `Week ${league.week}` : league.stage}`
                            : "Create a new league"}
                        </small>
                      </span>
                      <span aria-hidden="true">{league ? "→" : "+"}</span>
                    </button>
                  );
                })}
              </div>
            )}
            {error && (
              <p className="league-dialog__error" role="alert">
                {error}{" "}
                <button
                  type="button"
                  className="league-dialog__link"
                  onClick={loadSlots}
                >
                  Try again
                </button>
              </p>
            )}
          </div>
          <footer className="league-dialog__footer">
            <span>{leagues.length} of 3 slots used</span>
            <button
              type="button"
              className="league-dialog__secondary"
              onClick={close}
            >
              Cancel
            </button>
          </footer>
        </>
      ) : (
        <form onSubmit={next} className="league-dialog__form" aria-busy={busy}>
          <div className="league-dialog__body">
            {step === "name" ? (
              <>
                <p className="league-dialog__intro">
                  Start with a name. Next, choose your teams and shape the
                  divisions.
                </p>
                <label className="league-field">
                  League name
                  <input
                    ref={nameInput}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    maxLength={80}
                    placeholder="Your league name"
                    autoComplete="off"
                    required
                    disabled={busy}
                  />
                </label>
                <label className="league-field">
                  Keepers per team
                  <input
                    type="number"
                    min={0}
                    max={100}
                    step={1}
                    required
                    value={keeperCount}
                    disabled={busy}
                    onChange={(e) => setKeeperCount(e.target.value)}
                    placeholder="Number of keepers"
                  />
                  <small>
                    From Season 2, every team must keep exactly this many
                    players. Season 1 starts with all players available.
                  </small>
                </label>
                <p className="league-dialog__hint">
                  {loading
                    ? "Checking available slots…"
                    : `${Math.max(0, 3 - leagues.length)} of 3 league slots available`}
                </p>
                {slotsLoaded && leagues.length >= 3 && (
                  <p className="league-dialog__error">
                    All slots are occupied. Open an existing league from the
                    main menu.
                  </p>
                )}
              </>
            ) : (
              <>
                <div className="league-setup-summary">
                  <div>
                    <strong>{name.trim()}</strong>
                    <span>
                      Season 1 · {selected} teams · {divisions.length} divisions
                      · {keeperCount} keepers
                    </span>
                  </div>
                  <button
                    type="button"
                    className="league-dialog__link"
                    disabled={busy}
                    onClick={() => setStep("name")}
                  >
                    Edit details
                  </button>
                </div>
                <p className="league-dialog__intro">
                  Keep the original divisions or build new rivalries. Uncheck a
                  team to leave it out.
                </p>
                <div className="league-division-counts">
                  {divisions.map((d) => (
                    <span key={d}>
                      <strong>{d}</strong>{" "}
                      {
                        teams.filter((t) => t.included && t.division === d)
                          .length
                      }{" "}
                      teams
                    </span>
                  ))}
                </div>
                <div className="league-team-grid">
                  {teams.map((t) => (
                    <div
                      className={`league-team-card ${t.included ? "" : "league-team-card--excluded"}`}
                      key={t.id}
                      style={
                        {
                          "--team-accent":
                            t.primaryColor || "var(--accent-red)",
                        } as CSSProperties
                      }
                    >
                      <label className="league-team-card__identity">
                        <input
                          type="checkbox"
                          aria-label={`Include ${t.nickname}`}
                          checked={t.included}
                          disabled={busy}
                          onChange={(e) =>
                            setTeams(
                              teams.map((x) =>
                                x.id === t.id
                                  ? { ...x, included: e.target.checked }
                                  : x,
                              ),
                            )
                          }
                        />
                        <span className="league-team-mark" aria-hidden="true">
                          <span>{t.abbreviation}</span>
                          {t.logoUrl && (
                            <img
                              src={t.logoUrl}
                              alt=""
                              onError={(e) => {
                                e.currentTarget.style.display = "none";
                              }}
                            />
                          )}
                        </span>
                        <span>
                          <small>{t.location || t.abbreviation}</small>
                          <strong>{t.nickname}</strong>
                        </span>
                      </label>
                      <AppSelect
                        aria-label={`Division for ${t.nickname}`}
                        value={t.division}
                        disabled={busy || !t.included}
                        onChange={(e) =>
                          setTeams(
                            teams.map((x) =>
                              x.id === t.id
                                ? { ...x, division: e.target.value }
                                : x,
                            ),
                          )
                        }
                      >
                        {divisions.map((d) => (
                          <option value={d} key={d}>
                            {d}
                          </option>
                        ))}
                      </AppSelect>
                    </div>
                  ))}
                </div>
                <section
                  className="league-setup-tools"
                  aria-label="Customize teams and divisions"
                >
                  <div className="league-add-division">
                    <label className="league-field">
                      Add a division
                      <input
                        value={divisionName}
                        onChange={(e) => setDivisionName(e.target.value)}
                        placeholder="Division name"
                        maxLength={40}
                        disabled={busy}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            addDivision();
                          }
                        }}
                      />
                    </label>
                    <button
                      type="button"
                      className="league-dialog__secondary"
                      onClick={addDivision}
                      disabled={busy || !divisionName.trim()}
                    >
                      Add division
                    </button>
                  </div>
                  {!addingTeam ? (
                    <button
                      type="button"
                      className="league-dialog__secondary"
                      onClick={() => setAddingTeam(true)}
                      disabled={busy || teams.length >= 32}
                    >
                      + Add team
                    </button>
                  ) : (
                    <div className="league-new-team">
                      <h2>New team</h2>
                      <div className="league-new-team__fields">
                        <label className="league-field">
                          Location
                          <input
                            value={custom.location}
                            maxLength={60}
                            onChange={(e) =>
                              setCustom({ ...custom, location: e.target.value })
                            }
                          />
                        </label>
                        <label className="league-field">
                          Nickname
                          <input
                            value={custom.nickname}
                            maxLength={40}
                            onChange={(e) =>
                              setCustom({ ...custom, nickname: e.target.value })
                            }
                          />
                        </label>
                        <label className="league-field">
                          Abbreviation
                          <input
                            value={custom.abbreviation}
                            maxLength={5}
                            onChange={(e) =>
                              setCustom({
                                ...custom,
                                abbreviation: e.target.value.toUpperCase(),
                              })
                            }
                          />
                        </label>
                        <label className="league-field">
                          Division
                          <AppSelect
                            value={custom.division}
                            onChange={(e) =>
                              setCustom({ ...custom, division: e.target.value })
                            }
                          >
                            {divisions.map((d) => (
                              <option key={d}>{d}</option>
                            ))}
                          </AppSelect>
                        </label>
                        <label className="league-field">
                          Logo URL <span>(optional)</span>
                          <input
                            type="url"
                            value={custom.logoUrl}
                            onChange={(e) =>
                              setCustom({ ...custom, logoUrl: e.target.value })
                            }
                            placeholder="https://…"
                          />
                        </label>
                        <label className="league-field">
                          Primary color <span>(optional)</span>
                          <input
                            value={custom.primaryColor}
                            onChange={(e) =>
                              setCustom({
                                ...custom,
                                primaryColor: e.target.value,
                              })
                            }
                            placeholder="#c10206"
                            maxLength={7}
                          />
                        </label>
                      </div>
                      <div className="league-new-team__actions">
                        <button
                          type="button"
                          className="league-dialog__secondary"
                          onClick={() => {
                            setAddingTeam(false);
                            setError("");
                          }}
                        >
                          Cancel team
                        </button>
                        <button
                          type="button"
                          className="league-dialog__primary"
                          onClick={addTeam}
                        >
                          Add to league
                        </button>
                      </div>
                    </div>
                  )}
                </section>
              </>
            )}
            {error && (
              <p className="league-dialog__error" role="alert">
                {error}
                {!slotsLoaded && (
                  <button
                    type="button"
                    className="league-dialog__link"
                    onClick={loadSlots}
                  >
                    Try again
                  </button>
                )}
              </p>
            )}
          </div>
          <footer className="league-dialog__footer">
            <span>
              {step === "teams"
                ? "Next creates your league and Season 1."
                : "Step 1 of 2"}
            </span>
            <div>
              <button
                type="button"
                className="league-dialog__secondary"
                disabled={committing}
                onClick={close}
              >
                Cancel
              </button>
              {step === "teams" && (
                <button
                  type="button"
                  className="league-dialog__secondary"
                  disabled={busy}
                  onClick={() => setStep("name")}
                >
                  Back
                </button>
              )}
              <button
                type="submit"
                className="league-dialog__primary"
                disabled={
                  busy || loading || !slotsLoaded || leagues.length >= 3
                }
              >
                {busy
                  ? step === "teams"
                    ? "Creating…"
                    : "Loading…"
                  : "Next →"}
              </button>
            </div>
          </footer>
        </form>
      )}
    </dialog>
  );
}
