export type PlayRow = Record<string, unknown>;

const normalize = (value: unknown) => String(value ?? "").trim().toLowerCase().replace(/[^a-z0-9]/g, "");
const number = (value: unknown) => Number(String(value ?? 0).replace(/,/g, "")) || 0;
const text = (play: PlayRow, ...fields: string[]) => {
  const wanted = new Set(fields.map(normalize));
  const entry = Object.entries(play).find(([field]) => wanted.has(normalize(field)));
  return String(entry?.[1] ?? "").trim();
};

type Totals = { games: Set<string>; [field: string]: number | Set<string> };

/** Builds the season totals used by team pages directly from PlayHistory. */
export function aggregatePlayStats(plays: PlayRow[]) {
  const players = new Map<string, Totals>();
  const get = (name: string) => {
    const playerKey = normalize(name);
    if (!players.has(playerKey)) players.set(playerKey, { games: new Set<string>() });
    const totals = players.get(playerKey)!;
    const game = text(currentPlay, "gameid", "game id");
    if (game) totals.games.add(game);
    return totals;
  };
  const value = (stats: Totals, field: string) => Number(stats[field]) || 0;
  const add = (stats: Totals, field: string, amount = 1) => { stats[field] = value(stats, field) + amount; };
  let currentPlay: PlayRow = {};

  plays.forEach((play) => {
    currentPlay = play;
    const type = text(play, "playtype", "play type").toLowerCase();
    const result = text(play, "result", "resultcategory").toLowerCase();
    const description = text(play, "description").toLowerCase();
    const defenseResult = text(play, "defenseresult", "defense result").toLowerCase();
    const yards = number(text(play, "yards", "yards gained"));
    const airYards = number(text(play, "airyards", "air yards"));
    const actor = text(play, "player", "passer", "rusher");
    const receiver = text(play, "receiver", "target");
    const tackler = text(play, "tackler");
    const recoveredBy = text(play, "recoveredby", "recovered by");
    const isTouchdown = /touchdown|\btd\b/.test(`${result} ${description}`);
    const isFumble = /fumble/.test(`${result} ${description} ${defenseResult}`);
    const isSack = /sack/.test(`${result} ${description} ${defenseResult}`);
    const isInterception = /interception/.test(`${result} ${description} ${defenseResult}`);
    const isIncomplete = /incomplete|incompletion/.test(`${result} ${description}`);
    const firstDown = number(text(play, "newdown", "new down")) === 1 || /first down/.test(description);

    if (/run|rush/.test(type) && actor) {
      const stats = get(actor);
      add(stats, "Carries"); add(stats, "Rushing Yards", yards);
      stats["Rushing Long"] = Math.max(value(stats, "Rushing Long"), yards);
      if (isTouchdown) add(stats, "Rushing TD");
      if (isFumble) { add(stats, "Rushing Fumbles"); if (normalize(recoveredBy) !== normalize(actor)) add(stats, "Rushing Fumbles Lost"); }
      if (firstDown) add(stats, "Rushing First Downs");
      if (yards < 0) add(stats, "Rush Loss");
      [5, 10, 20, 30, 50].forEach((mark) => { if (yards >= mark) add(stats, `Rush ${mark}+`); });
      add(stats, "Broken Tackles", number(text(play, "brokentackles", "broken tackles", "trucks")));
      add(stats, "Jukes", number(text(play, "jukes")));
    }

    if ((/pass/.test(type) || isSack) && actor) {
      const stats = get(actor);
      if (isSack) { add(stats, "Sacked"); add(stats, "Sack Yards Lost", Math.abs(yards)); }
      else {
        add(stats, "Passing Attempts");
        if (!isIncomplete && !isInterception) {
          add(stats, "Completions"); add(stats, "Passing Yards", yards);
          stats["Passing Long"] = Math.max(value(stats, "Passing Long"), yards);
          if (isTouchdown) add(stats, "Passing TD");
        }
        if (isInterception) add(stats, "Interceptions Thrown");
      }
    }

    if (/pass/.test(type) && receiver && !isSack) {
      const stats = get(receiver);
      add(stats, "Targets");
      if (!isIncomplete && !isInterception) {
        add(stats, "Receptions"); add(stats, "Receiving Yards", yards);
        stats["Receiving Long"] = Math.max(value(stats, "Receiving Long"), yards);
        if (yards >= 20) add(stats, "Big Receptions");
        if (isTouchdown) add(stats, "Receiving TD");
        if (firstDown) add(stats, "Receiving First Downs");
        add(stats, "Yards After Catch", Math.max(0, yards - airYards));
      }
      if (isFumble) { add(stats, "Receiving Fumbles"); if (normalize(recoveredBy) !== normalize(receiver)) add(stats, "Receiving Fumbles Lost"); }
    }

    if (tackler && normalize(tackler) !== "na") {
      const stats = get(tackler);
      add(stats, "Tackles"); add(stats, "Solo Tackles");
      if (yards < 0 || isSack || /tfl|tackle for loss/.test(defenseResult)) add(stats, "TFL");
      if (isSack) { add(stats, "Sacks"); add(stats, "Sack Yards", Math.abs(yards)); }
      if (isFumble) add(stats, "Forced Fumbles");
    }
    if (recoveredBy && isFumble) add(get(recoveredBy), "Fumble Recoveries");
    if ((recoveredBy || tackler) && isInterception) add(get(recoveredBy || tackler), "Interceptions");
  });

  return new Map<string, Record<string, number>>([...players].map(([name, totals]) => {
    const numericTotals = Object.fromEntries(Object.entries(totals).filter(([field]) => field !== "games")) as Record<string, number>;
    return [name, {
    ...numericTotals,
    GP: totals.games.size,
    "Completion Percentage": value(totals, "Passing Attempts") ? value(totals, "Completions") / value(totals, "Passing Attempts") * 100 : 0,
    "Passing Average": value(totals, "Passing Attempts") ? value(totals, "Passing Yards") / value(totals, "Passing Attempts") : 0,
    "Rushing Average": value(totals, "Carries") ? value(totals, "Rushing Yards") / value(totals, "Carries") : 0,
    "Receiving Average": value(totals, "Receptions") ? value(totals, "Receiving Yards") / value(totals, "Receptions") : 0,
    "Passing Yards Per Game": totals.games.size ? value(totals, "Passing Yards") / totals.games.size : 0,
    "Rushing Yards Per Game": totals.games.size ? value(totals, "Rushing Yards") / totals.games.size : 0,
    "Receiving Yards Per Game": totals.games.size ? value(totals, "Receiving Yards") / totals.games.size : 0,
  }];
  }));
}
