const normHeader = (value: unknown) => String(value ?? "").toLowerCase().replace(/[^a-z0-9]/g, "");

export function playValueForHeader(play: Record<string, unknown>, header: string) {
  const direct = play[header];
  if (direct !== undefined) return direct;

  const normalized = normHeader(header);
  const aliases: Record<string, string[]> = {
    gameid: ["gameid"],
    playid: ["playid"],
    time: ["time"],
    qtr: ["qtr", "quarter"],
    quarter: ["qtr", "quarter"],
    possession: ["possession"],
    down: ["down"],
    distance: ["distance"],
    ballon: ["ballon"],
    playtype: ["playtype"],
    player: ["player"],
    receiver: ["receiver"],
    yards: ["yards"],
    defensepredicted: ["defensepredicted"],
    predictioncorrect: ["predictioncorrect"],
    tackler: ["tackler"],
    result: ["result"],
    issack: ["isSack", "issack"],
    iscomplete: ["isComplete", "iscomplete"],
    yac: ["yac", "YAC"],
    defenseresult: ["defenseresult"],
    turnover: ["turnover"],
    turnoverflag: ["turnover"],
    description: ["description", "desc"],
    recoveredby: ["recoveredby"],
    airyards: ["airyards"],
    newdown: ["newdown"],
    newdist: ["newdist"],
    newdistance: ["newdist"],
    newballon: ["newballon"],
    drivestart: ["drivestart"],
    homescore: ["homescore"],
    awayscore: ["awayscore"],
    lineMatchups: ["lineMatchups", "linematchups"],
    linematchups: ["lineMatchups", "linematchups"],
    olwins: ["olWins", "olwins"],
    ollosses: ["olLosses", "ollosses"],
    dlwins: ["dlWins", "dlwins"],
    dllosses: ["dlLosses", "dllosses"],
    leadblocker: ["leadblocker", "leadBlocker"],
    jukes: ["jukes"],
    trucks: ["trucks"],
    brokentackles: ["brokenTackles", "brokentackles"],
    stopreason: ["stopReason", "stopreason"],
    runlog: ["runLog", "runlog"],
    fatiguerecovery: ["fatigueRecovery", "fatiguerecovery"],
  };

  for (const key of aliases[normalized] ?? [normalized]) {
    if (play[key] !== undefined) return play[key];
  }

  const matching = Object.entries(play).find(([field]) => normHeader(field) === normalized);
  return matching?.[1] ?? "";
}
export function sheetSafe(value: unknown) {
  if (Array.isArray(value) || (value && typeof value === "object")) return JSON.stringify(value);
  if (typeof value === "boolean") return value;
  return value ?? "";
}
