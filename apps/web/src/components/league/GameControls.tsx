import { useEffect, useMemo, useState } from "react";
import type { LeagueGame } from "./types";
import type {
  PlayCallOptions,
  FormationSlot,
  DefensiveAssignment,
} from "./gameplay/gameEngine";

const str = (v: unknown) => String(v ?? "");
const WR_SLOTS: FormationSlot[] = ["WR1", "WR2", "WR3", "WR4"];
const RB_SLOTS: FormationSlot[] = ["RB1", "RB2"];
const OL_SLOTS: FormationSlot[] = ["LT", "LG", "C", "RG", "RT"];
const REQUIRED = new Set<FormationSlot>(["QB", "LG", "C", "RG"]);
const EXPECTED_PLAYERS_PER_SIDE = 8;
const ROUTES = ["No Route", "Screen", "Short", "Medium", "Deep", "Bomb"];
const READS = ["1st", "2nd", "3rd", "4th", "5th"];

type Player = Record<string, unknown>;
type Props = {
  game: LeagueGame;
  players: Player[];
  options: PlayCallOptions;
  onOptionsChange: (next: PlayCallOptions) => void;
  onAction: (label: string, options?: PlayCallOptions) => void;
  onFormationModeChange?: (active: boolean) => void;
  onSelectedFormationPlayerChange?: (player: string) => void;
  selectedFormationPlayer?: string;
};

/**
 * These small accessors normalize player records that may use different API
 * casing. The controls can then work with names, positions, teams, images, and
 * traits without repeating fallback property checks.
 */
function nameOf(p: Player) {
  return str(p.name ?? p.Name);
}
function posOf(p: Player) {
  return str(p.position ?? p.Pos).toUpperCase();
}
function teamOf(p: Player) {
  return str(p.team ?? p.Team);
}
function imgOf(p?: Player) {
  return str(p?.image ?? p?.Image ?? p?.photo ?? p?.Photo);
}
function trait(p: Player | undefined, key: string) {
  return Number(p?.[key] ?? p?.[key[0].toUpperCase() + key.slice(1)] ?? 0);
}
/**
 * Reusable modal shell for routes, run selection, and clock management. It
 * centralizes the close button and panel sizing classes so each modal only
 * needs to supply its specific controls.
 */
function ControlModal({
  children,
  onClose,
  wide = false,
  full = false,
}: {
  children: React.ReactNode;
  onClose: () => void;
  wide?: boolean;
  full?: boolean;
}) {
  return (
    <div className="game-modal open">
      <div
        className={`game-modal-panel formation-panel ${wide ? "routes-panel" : ""} ${full ? "formation-full-panel" : ""}`}
      >
        <button className="close-button" onClick={onClose} type="button">
          ×
        </button>
        {children}
      </div>
    </div>
  );
}
/**
 * Determines who can receive a pass from the current formation. Wide receivers
 * and running backs are always considered, and the outside-most occupied
 * linemen are treated as exposed eligible slots for this eight-player ruleset.
 */
function eligibleReceivers(formation: Partial<Record<FormationSlot, string>>) {
  const occupiedLinemen = OL_SLOTS.filter((slot) => formation[slot]);
  const exposedLinemen =
    occupiedLinemen.length > 1
      ? [occupiedLinemen[0], occupiedLinemen[occupiedLinemen.length - 1]]
      : occupiedLinemen;
  const eligibleSlots = [...WR_SLOTS, ...RB_SLOTS, ...exposedLinemen];
  return eligibleSlots
    .map((slot) => ({ slot, player: formation[slot] }))
    .filter((x): x is { slot: FormationSlot; player: string } =>
      Boolean(x.player),
    );
}
/**
 * Compact player avatar used throughout controls. It intentionally accepts a
 * missing player record so formation slots and route chips can still render
 * when only a name is known.
 */
function PlayerBubble({
  name,
  player,
  small = false,
}: {
  name?: string;
  player?: Player;
  small?: boolean;
}) {
  const src = imgOf(player);
  return (
    <div
      className={`${small ? "control-player-bubble" : "player-circle-static"} ${name ? "" : "empty"}`}
    >
      {name && (src ? <img src={src} alt={name} /> : <span>👤</span>)}
    </div>
  );
}
/**
 * Rebuilds the quarterback read order after a route changes. The preferred
 * player gets the requested read slot, then remaining routed receivers fill the
 * first unused read labels in stable formation order.
 */
function normalizeReads(
  nextRoutes: Record<string, string>,
  orderedPlayers: string[],
  preferred?: { player: string; readIndex: number },
) {
  const used = new Set<string>();
  const nextReads: Record<string, string> = {};
  if (
    preferred &&
    nextRoutes[preferred.player] &&
    nextRoutes[preferred.player] !== "No Route"
  ) {
    nextReads[preferred.player] =
      READS[Math.min(preferred.readIndex, READS.length - 1)] || "";
    used.add(nextReads[preferred.player]);
  }
  orderedPlayers
    .filter(
      (player) =>
        nextRoutes[player] &&
        nextRoutes[player] !== "No Route" &&
        player !== preferred?.player,
    )
    .forEach((player) => {
      const read = READS.find((r) => !used.has(r));
      if (read) {
        nextReads[player] = read;
        used.add(read);
      }
    });
  return nextReads;
}

/**
 * Creates an eight-player defensive preview from the offense formation. It
 * picks the non-possessing team, ranks defenders by defensive stars inside each
 * position group, aligns coverage to receivers, aligns linemen to blockers, and
 * fills any remaining spots with linebackers/safeties.
 */
function buildDefense(
  game: LeagueGame,
  players: Player[],
  formation: Partial<Record<FormationSlot, string>>,
): DefensiveAssignment[] {
  // The defense belongs to the team without possession; deriving it here keeps the UI preview and play-call payload in sync with the scoreboard.
  const defenseTeam = game.Possession === "Home" ? game.Away : game.Home;
  const defenders = players.filter((p) => teamOf(p) === defenseTeam);
  const by = (d: string) =>
    defenders
      .filter(
        (p) =>
          str(p.defPos ?? p.DefPos ?? p.defensePosition).toUpperCase() === d,
      )
      .sort((a, b) => trait(b, "defStars") - trait(a, "defStars"));
  const dbs = by("DB"),
    dls = by("DL"),
    lbs = by("LB"),
    safeties = by("S");
  const take = (arrs: Player[][]) => arrs.find((a) => a.length)?.shift();
  // Saved receiver slots drive coverage first, then saved offensive-line slots drive front-seven alignment.
  const wrs = WR_SLOTS.filter((s) => formation[s]);
  const ol = OL_SLOTS.filter((s) => formation[s]);
  const out: DefensiveAssignment[] = [];
  wrs.forEach((slot, i) =>
    out.push({
      position: `DB${i + 1}`,
      player: nameOf(take([dbs, lbs]) ?? {}),
      align: slot,
    }),
  );
  ol.forEach((slot, i) =>
    out.push({
      position: `DL${i + 1}`,
      player: nameOf(take([dls, lbs]) ?? {}),
      align: slot,
    }),
  );
  // Any remaining defenders key on backfield/QB slots before the safety fallback
  // so the final formation always matches the eight-player offense.
  (["QB", "RB1", "RB2"] as FormationSlot[]).forEach((slot) => {
    if (out.length >= EXPECTED_PLAYERS_PER_SIDE) return;
    const p = take([lbs, dls, dbs]);
    if (p)
      out.push({
        position: `LB${out.length + 1}`,
        player: nameOf(p),
        align: slot,
      });
  });
  while (out.length < EXPECTED_PLAYERS_PER_SIDE) {
    const p = take([safeties, lbs, dbs, dls]);
    if (!p) break;
    out.push({ position: `S${out.length + 1}`, player: nameOf(p) });
  }
  return out.slice(0, EXPECTED_PLAYERS_PER_SIDE);
}

/**
 * Play-calling panel for the team in possession. It manages formation editing,
 * route/read assignment, runner and clock options, generated defensive preview,
 * and the final play-call payload sent back to GameCenter.
 */
export function GameControls({
  game,
  players,
  options,
  onOptionsChange,
  onAction,
  onFormationModeChange,
  onSelectedFormationPlayerChange,
  selectedFormationPlayer = "",
}: Props) {
  const [collapsed, setCollapsed] = useState(true);
  const [modal, setModal] = useState<"routes" | "run" | "clock" | null>(null);
  const [settingFormation, setSettingFormation] = useState(false);
  const [selected, setSelected] = useState<string>("");
  const [detail, setDetail] = useState<string>("");

  const offenseTeam = game.Possession === "Home" ? game.Home : game.Away;

  useEffect(() => {
    onFormationModeChange?.(settingFormation);
  }, [onFormationModeChange, settingFormation]);

  const roster = useMemo(
    () => players.filter((p) => teamOf(p) === offenseTeam),
    [players, offenseTeam],
  );
  const byName = (n?: string) => players.find((p) => nameOf(p) === n);
  const formation = options.formation ?? {};
  const routes = options.routes ?? {};
  const reads = options.reads ?? {};
  const receivers = eligibleReceivers(formation);
  const runners = (["QB", ...RB_SLOTS, ...WR_SLOTS] as FormationSlot[])
    .map((s) => formation[s])
    .filter((r): r is string => Boolean(r));
  const formationPlayerCount = Object.values(formation).filter(Boolean).length;
  const validFormation =
    formationPlayerCount === EXPECTED_PLAYERS_PER_SIDE &&
    [...REQUIRED].every((slot) => formation[slot]);
  const canPass = receivers.some(
    (r) => routes[r.player] && routes[r.player] !== "No Route",
  );
  const setOpt = (patch: Partial<PlayCallOptions>) =>
    onOptionsChange({ ...options, ...patch });
  const bench = roster.filter(
    (p) => !Object.values(formation).includes(nameOf(p)),
  );
  const fieldedNames = Object.values(formation).filter((name): name is string =>
    Boolean(name),
  );
  const selectedBenchPlayer = bench.some(
    (player) => nameOf(player) === selected,
  )
    ? selected
    : "";
  const selectedFieldPlayer = fieldedNames.includes(selectedFormationPlayer)
    ? selectedFormationPlayer
    : "";

  useEffect(() => {
    onSelectedFormationPlayerChange?.(
      settingFormation ? selectedBenchPlayer : "",
    );
  }, [onSelectedFormationPlayerChange, selectedBenchPlayer, settingFormation]);
  const setRouteAndRead = (
    player: string,
    route: string,
    readIndex: number,
  ) => {
    const nextRoutes = { ...routes, [player]: route };
    const nextReads = normalizeReads(
      nextRoutes,
      receivers.map((r) => r.player),
      { player, readIndex },
    );
    setOpt({ routes: nextRoutes, reads: nextReads });
  };

  // Every offensive formation edit is held in `options.formation`; from that saved setup we deterministically generate the defensive alignment preview.
  const defense = useMemo(
    () => buildDefense(game, players, options.formation ?? {}),
    [game, players, options.formation],
  );

  // Snapping a play should carry both the user-saved offense and the generated defense into the engine so the final resolver sees the same field shown in the UI.
  const optionsWithDefense = (): PlayCallOptions => ({
    ...options,
    defense,
  });

  const saveFormation = () => {
    // Saving closes the bench but keeps `options.formation` plus the generated defensive mirror available for the next play call.
    onOptionsChange(optionsWithDefense());
    setSettingFormation(false);
    setSelected("");
  };

  return (
    <div
      className={`control-panel play-caller ${collapsed ? "collapsed" : ""}`}
    >
      <button
        className="control-panel-toggle"
        type="button"
        onClick={() => setCollapsed(!collapsed)}
      >
        {collapsed ? "Open Controls" : "Minimize Controls"}
      </button>
      {!collapsed && (
        <>
          <h3>{offenseTeam} Control Console</h3>
          <div className="play-call-summary">
            <span>
              {validFormation
                ? "Formation ready"
                : `Set ${EXPECTED_PLAYERS_PER_SIDE}-player formation`}
            </span>
            <span>
              Players: {formationPlayerCount}/{EXPECTED_PLAYERS_PER_SIDE}
            </span>
            <span>Runner: {options.runner || "Auto"}</span>
            <span>Clock: {options.clockMode || "Normal"}</span>
          </div>
          <div className="game-controls primary">
            <button onClick={() => setSettingFormation((active) => !active)}>
              {settingFormation ? "Hide Bench" : "Set Formation"}
            </button>
            <button
              disabled={!validFormation || runners.length === 0}
              onClick={() => setModal("run")}
            >
              Call Run Play
            </button>
            <button
              disabled={!validFormation}
              onClick={() => {
                if (!canPass) setModal("routes");
                else onAction("Pass Play", optionsWithDefense());
              }}
            >
              Call Pass Play
            </button>
            <button onClick={() => onAction("Punt", optionsWithDefense())}>
              Call Punt Play
            </button>
          </div>
        </>
      )}
      {settingFormation && (
        <div className="field-formation-bench" aria-label="Offensive bench">
          <div className="field-formation-bench-header">
            <h4>Bench</h4>
            <span>
              Pick a bench player to place/swap. Select a fielded player, then
              click open bench space to remove them.
            </span>
          </div>
          <div
            className={`bench bench-ten-wide ${selectedFieldPlayer ? "remove-target" : ""}`}
            onClick={(event) => {
              if (event.currentTarget !== event.target || !selectedFieldPlayer)
                return;

              const nextFormation = Object.fromEntries(
                Object.entries(formation).filter(
                  ([, player]) => player !== selectedFieldPlayer,
                ),
              ) as Partial<Record<FormationSlot, string>>;

              setOpt({ formation: nextFormation, routes: {}, reads: {} });
              setSelected("");
              onSelectedFormationPlayerChange?.("");
            }}
            role={selectedFieldPlayer ? "button" : undefined}
            tabIndex={selectedFieldPlayer ? 0 : undefined}
            aria-label={
              selectedFieldPlayer
                ? `Remove ${selectedFieldPlayer} from the field`
                : "Offensive bench players"
            }
            onKeyDown={(event) => {
              if (
                !selectedFieldPlayer ||
                (event.key !== "Enter" && event.key !== " ")
              )
                return;
              event.preventDefault();

              const nextFormation = Object.fromEntries(
                Object.entries(formation).filter(
                  ([, player]) => player !== selectedFieldPlayer,
                ),
              ) as Partial<Record<FormationSlot, string>>;

              setOpt({ formation: nextFormation, routes: {}, reads: {} });
              setSelected("");
              onSelectedFormationPlayerChange?.("");
            }}
          >
            {bench.map((p) => (
              <button
                type="button"
                onClick={() =>
                  setSelected(
                    selectedBenchPlayer === nameOf(p) ? "" : nameOf(p),
                  )
                }
                className={`player-item ${selectedBenchPlayer === nameOf(p) ? "selected" : ""}`}
                key={nameOf(p)}
              >
                <PlayerBubble name={nameOf(p)} player={p} />
                <span className="player-name">
                  {nameOf(p)} - {posOf(p)}
                </span>
              </button>
            ))}
          </div>
          <div className="formation-actions">
            <button
              type="button"
              onClick={() => {
                setSettingFormation(false);
                setSelected("");
              }}
            >
              Exit
            </button>
            <button type="button" onClick={saveFormation}>
              Save Formation
            </button>
          </div>
        </div>
      )}
      {modal === "routes" && (
        <ControlModal wide onClose={() => setModal(null)}>
          <h3>Receiver Routes</h3>
          <div className="eligible-receiver-list">
            <span>Eligible receivers:</span>
            {receivers.map(({ slot, player }) => (
              <button
                type="button"
                draggable
                onDragStart={(e) =>
                  e.dataTransfer.setData("text/plain", player)
                }
                onClick={() => setDetail(detail === player ? "" : player)}
                className="eligible-receiver-chip"
                key={`${slot}-${player}`}
              >
                <PlayerBubble small name={player} player={byName(player)} />
                <span>
                  {slot}: {player}
                </span>
              </button>
            ))}
          </div>
          <div className="routes-board">
            {ROUTES.map((r) => (
              <div className="route-zone" key={r}>
                <span>{r}</span>
                {READS.map((read, readIndex) => (
                  <div
                    className="route-read-lane"
                    key={read}
                    style={{ left: `${readIndex * 20}%`, width: "20%" }}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) =>
                      setRouteAndRead(
                        e.dataTransfer.getData("text/plain"),
                        r,
                        readIndex,
                      )
                    }
                  >
                    <span className="route-read-label">{read}</span>
                  </div>
                ))}
                {receivers.map(({ player }) => {
                  const route = routes[player] || "Short";
                  const readIndex = Math.max(
                    0,
                    READS.indexOf(reads[player] || READS[0]),
                  );
                  return (
                    route === r && (
                      <button
                        type="button"
                        draggable
                        onDragStart={(e) =>
                          e.dataTransfer.setData("text/plain", player)
                        }
                        onClick={() =>
                          setDetail(detail === player ? "" : player)
                        }
                        className="player-circle"
                        style={{ left: `calc(${readIndex * 20}% + 10%)` }}
                        key={player}
                      >
                        <span className="read-badge">
                          {route === "No Route"
                            ? ""
                            : reads[player] || READS[readIndex]}
                        </span>
                        <PlayerBubble name={player} player={byName(player)} />
                      </button>
                    )
                  );
                })}
              </div>
            ))}
          </div>
          {detail && (
            <div className="player-detail">
              <h4>{detail}</h4>
              <div>Size: {trait(byName(detail), "size")}</div>
              <div>Speed: {trait(byName(detail), "speed")}</div>
              <div>RR: {trait(byName(detail), "routeRunning")}</div>
              <div>JMP: {trait(byName(detail), "jump")}</div>
              <div>HND: {trait(byName(detail), "hands")}</div>
            </div>
          )}
          <div className="read-summary">
            <div className="summary-title">Read Summary:</div>
            {READS.map((r) => {
              const player = Object.keys(reads).find((p) => reads[p] === r);
              return (
                <div className="summary-row" key={r}>
                  <span className="summary-label">{r}:</span>
                  <span>
                    {player ? `${player} - ${routes[player] || ""}` : ""}
                  </span>
                </div>
              );
            })}
          </div>
          <div className="formation-actions">
            <button onClick={() => setOpt({ routes: {}, reads: {} })}>
              Clear
            </button>
            <button onClick={() => setModal(null)}>Save</button>
          </div>
        </ControlModal>
      )}
      {modal === "run" && (
        <ControlModal onClose={() => setModal(null)}>
          <h3>Run Play</h3>
          <div className="rusher-options">
            {runners.map((r) => (
              <button
                className={`rusher-option ${
                  (options.runner || runners[0]) === r ? "selected" : ""
                }`}
                onClick={() => setOpt({ runner: r })}
                type="button"
                key={r}
              >
                <PlayerBubble name={r} player={byName(r)} />
                <span>{r}</span>
              </button>
            ))}
          </div>
          <button
            disabled={!validFormation}
            onClick={() => {
              setModal(null);
              onAction("Run Play", {
                ...optionsWithDefense(),
                runner: options.runner || runners[0],
              });
            }}
          >
            Execute Run
          </button>
        </ControlModal>
      )}
      {modal === "clock" && (
        <ControlModal onClose={() => setModal(null)}>
          <h3>Manage Clock</h3>
          <div className="clock-options">
            {["Normal", "Hurry Up", "Chew Clock"].map((c) => (
              <button
                className={options.clockMode === c ? "active" : ""}
                onClick={() =>
                  setOpt({ clockMode: c as PlayCallOptions["clockMode"] })
                }
                key={c}
              >
                {c}
              </button>
            ))}
            <button onClick={() => onAction("Spike", options)}>
              Spike Ball
            </button>
            <button onClick={() => onAction("Kneel", options)}>Kneel</button>
          </div>
        </ControlModal>
      )}
    </div>
  );
}
