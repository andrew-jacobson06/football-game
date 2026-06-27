import { useMemo, useState } from "react";
import type { LeagueGame } from "./types";
import type { PlayCallOptions, FormationSlot } from "./gameplay/gameEngine";

const str = (v: unknown) => String(v ?? "");
const POSITIONS: FormationSlot[] = ["WR1", "TEOL1", "TEOL2", "TEOL3", "TEOL4", "TEOL5", "WR2", "WR3", "QB", "RB1", "RB2"];
const REQUIRED = new Set<FormationSlot>(["QB", "TEOL2", "TEOL3", "TEOL4"]);
const ROUTES = ["No Route", "Screen", "Short", "Medium", "Deep", "Bomb"];
const READS = ["1st", "2nd", "3rd", "4th", "5th"];

type Player = Record<string, unknown>;
type Props = {
  game: LeagueGame;
  players: Player[];
  options: PlayCallOptions;
  onOptionsChange: (next: PlayCallOptions) => void;
  onAction: (label: string, options?: PlayCallOptions) => void;
};

function nameOf(p: Player) { return str(p.name ?? p.Name); }
function posOf(p: Player) { return str(p.position ?? p.Pos).toUpperCase(); }
function teamOf(p: Player) { return str(p.team ?? p.Team); }
function canFill(slot: FormationSlot, p: Player) {
  const pos = posOf(p);
  if (slot === "QB") return pos.includes("QB");
  if (slot.startsWith("RB")) return pos.includes("RB") || pos.includes("HB") || pos.includes("FB") || pos.includes("WR");
  if (slot.startsWith("WR")) return pos.includes("WR") || pos.includes("TE");
  return pos.includes("TE") || pos.includes("OL") || pos.includes("C") || pos.includes("G") || pos.includes("T");
}

function ControlModal({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return <div className="game-modal open"><div className="game-modal-panel"><button className="close-button" onClick={onClose} type="button">×</button>{children}</div></div>;
}

function eligibleReceivers(formation: Partial<Record<FormationSlot, string>>) {
  const teols = (["TEOL1", "TEOL2", "TEOL3", "TEOL4", "TEOL5"] as FormationSlot[]).filter((s) => formation[s]);
  const edgeTe = teols.length > 1 ? [teols[0], teols[teols.length - 1]] : teols;
  return (["WR1", "WR2", "WR3", "RB1", "RB2", ...edgeTe] as FormationSlot[]).map((slot) => ({ slot, player: formation[slot] })).filter((x): x is { slot: FormationSlot; player: string } => Boolean(x.player));
}

export function GameControls({ game, players, options, onOptionsChange, onAction }: Props) {
  const [collapsed, setCollapsed] = useState(false);
  const [modal, setModal] = useState<"formation" | "los" | "routes" | "run" | "clock" | null>(null);
  const offenseTeam = game.Possession === "Home" ? game.Home : game.Away;
  const roster = useMemo(() => players.filter((p) => teamOf(p) === offenseTeam), [players, offenseTeam]);
  const formation = options.formation ?? {};
  const routes = options.routes ?? {};
  const reads = options.reads ?? {};
  const receivers = eligibleReceivers(formation);
  const runners = (["QB", "RB1", "RB2", "WR1", "WR2", "WR3"] as FormationSlot[]).map((s) => formation[s]).filter((runner): runner is string => Boolean(runner));
  const validFormation = [...REQUIRED].every((slot) => formation[slot]);
  const canPass = receivers.some((r) => routes[r.player] && routes[r.player] !== "No Route");
  const setOpt = (patch: Partial<PlayCallOptions>) => onOptionsChange({ ...options, ...patch });
  const setFormation = (slot: FormationSlot, player: string) => setOpt({ formation: { ...formation, [slot]: player } });
  const setRoute = (player: string, route: string) => setOpt({ routes: { ...routes, [player]: route } });
  const setRead = (player: string, read: string) => setOpt({ reads: Object.fromEntries(Object.entries({ ...reads, [player]: read }).filter(([, v]) => v)) });
  return <div className={`control-panel play-caller ${collapsed ? "collapsed" : ""}`}>
    <button className="control-panel-toggle" type="button" onClick={() => setCollapsed(!collapsed)}>{collapsed ? "Open Play Caller" : "Collapse Play Caller"}</button>
    {!collapsed && <>
      <h3>{offenseTeam} Play Caller</h3>
      <div className="game-controls"><button onClick={() => setModal("formation")}>Formation</button><button onClick={() => setModal("los")}>View LOS</button><button onClick={() => setModal("routes")}>Routes</button><button onClick={() => setModal("run")}>Run Modal</button><button onClick={() => setModal("clock")}>Clock</button></div>
      <div className="play-call-summary"><span>{validFormation ? "Formation ready" : "Set required formation"}</span><span>Runner: {options.runner || "Auto"}</span><span>Clock: {options.clockMode || "Normal"}</span></div>
      <div className="game-controls primary"><button disabled={!validFormation} onClick={() => onAction("Run Play", options)}>Run Play</button><button disabled={!validFormation || !canPass} onClick={() => onAction("Pass Play", options)}>Pass Play</button><button onClick={() => onAction("Field Goal", options)}>FG</button><button onClick={() => onAction("Punt", options)}>Punt</button><button onClick={() => onAction("Two Point", options)}>2PT</button><button onClick={() => onAction("Timeout", options)}>Timeout</button></div>
    </>}
    {modal === "formation" && <ControlModal onClose={() => setModal(null)}><h3>Formation</h3><div className="formation-grid">{POSITIONS.map((slot) => <label className={`formation-picker ${REQUIRED.has(slot) ? "required" : ""}`} key={slot}><span>{slot}</span><select value={formation[slot] || ""} onChange={(e) => setFormation(slot, e.target.value)}><option value="">Empty</option>{roster.filter((p) => canFill(slot, p)).map((p) => <option key={nameOf(p)} value={nameOf(p)}>{nameOf(p)} ({posOf(p)})</option>)}</select></label>)}</div></ControlModal>}
    {modal === "los" && <ControlModal onClose={() => setModal(null)}><h3>Line of Scrimmage</h3><div className="los-preview"><div className="los-defense">Defense auto-matches your eligible receivers and line.</div><div className="los-line-react" />{(["WR1", "TEOL1", "TEOL2", "TEOL3", "TEOL4", "TEOL5", "WR2", "WR3"] as FormationSlot[]).map((s) => <div className="los-token" key={s}><strong>{s}</strong><span>{formation[s] || "—"}</span></div>)}<div className="los-backfield"><span>QB: {formation.QB || "—"}</span><span>RB1: {formation.RB1 || "—"}</span><span>RB2: {formation.RB2 || "—"}</span></div></div></ControlModal>}
    {modal === "routes" && <ControlModal onClose={() => setModal(null)}><h3>Route Modal</h3><div className="route-list">{receivers.map(({ player }, i) => <div className="route-row" key={player}><strong>{player}</strong><select value={routes[player] || "Short"} onChange={(e) => setRoute(player, e.target.value)}>{ROUTES.map((r) => <option key={r}>{r}</option>)}</select><select value={reads[player] || READS[i] || ""} onChange={(e) => setRead(player, e.target.value)}><option value="">No read</option>{READS.map((r) => <option key={r}>{r}</option>)}</select></div>)}</div></ControlModal>}
    {modal === "run" && <ControlModal onClose={() => setModal(null)}><h3>Run Play</h3><div className="rusher-options">{runners.map((r) => <button className={`rusher-option ${options.runner === r ? "selected" : ""}`} onClick={() => setOpt({ runner: r })} type="button" key={r}>👤<span>{r}</span></button>)}</div><button disabled={!validFormation} onClick={() => { setModal(null); onAction("Run Play", options); }}>Execute Run</button></ControlModal>}
    {modal === "clock" && <ControlModal onClose={() => setModal(null)}><h3>Manage Clock</h3><div className="clock-options">{["Normal", "Hurry Up", "Chew Clock"].map((c) => <button className={options.clockMode === c ? "active" : ""} onClick={() => setOpt({ clockMode: c as PlayCallOptions["clockMode"] })} key={c}>{c}</button>)}<button onClick={() => onAction("Spike", options)}>Spike Ball</button><button onClick={() => onAction("Kneel", options)}>Kneel</button></div></ControlModal>}
  </div>;
}
