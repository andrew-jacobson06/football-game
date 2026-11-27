import { randomInt, randomUUID } from "node:crypto";
import type { LeagueRepository, RecordRow } from "./leagueRepository.js";
import { sortStandings } from "../../../web/src/components/league/standings.js";
import type {
  LeagueGame,
  LeagueTeam,
} from "../../../web/src/components/league/types.js";

/** Lock the first-round order once. Later rounds reverse it to form the snake. */
export function initializeDraft(
  repo: LeagueRepository,
  seasonId: string,
): RecordRow {
  const season = repo.one("SELECT * FROM seasons WHERE id=?", seasonId)!;
  const existing = repo.one(
    "SELECT * FROM drafts WHERE season_id=? ORDER BY rowid LIMIT 1",
    seasonId,
  );
  if (
    existing?.order_rules_json &&
    Array.isArray(JSON.parse(existing.order_rules_json).teamOrder)
  )
    return existing;
  const teams = repo.all(
    "SELECT * FROM team_seasons WHERE season_id=? ORDER BY abbreviation",
    seasonId,
  );
  let order = teams.map((t) => t.team_id as string),
    method = "random_at_league_creation";
  if (season.season_number === 1) {
    for (let i = order.length - 1; i > 0; i--) {
      const j = randomInt(i + 1);
      [order[i], order[j]] = [order[j], order[i]];
    }
  } else {
    method = "reverse_finish_then_regular_season_rank";
    const previousId =
      season.previous_season_id ??
      repo.one(
        "SELECT id FROM seasons WHERE league_id=? AND season_number=?",
        season.league_id,
        season.season_number - 1,
      )?.id;
    if (!previousId)
      throw new Error(
        "Previous season is required to determine the draft order.",
      );
    const rows = repo.all(
      "SELECT ts.*,coalesce(s.wins,0) AS W,coalesce(s.losses,0) AS L,coalesce(s.ties,0) AS T,coalesce(s.point_differential,0) AS DIFF,coalesce(s.division_win_percentage,0) AS div_pct FROM team_seasons ts LEFT JOIN season_standings s ON s.team_id=ts.team_id AND s.season_id=ts.season_id AND s.scope='regular' WHERE ts.season_id=? ORDER BY ts.abbreviation",
      previousId,
    );
    const games = repo.all(
      "SELECT g.*,st.home_score,st.away_score FROM games g JOIN game_state st ON st.game_id=g.id WHERE g.season_id=? AND g.status='final' AND st.phase='final'",
      previousId,
    );
    const regularGames = games
      .filter((g) => g.stage === "regular")
      .map((g) => ({
        GameId: g.id,
        Home: g.home_team_id,
        Away: g.away_team_id,
        HomeScore: g.home_score,
        AwayScore: g.away_score,
        Qtr: "FINAL",
      })) as LeagueGame[];
    const regular = sortStandings(
      rows.map((t) => ({
        ID: t.team_id,
        Abbrev: t.team_id,
        W: t.W,
        L: t.L,
        T: t.T,
        DIFF: t.DIFF,
        "Div Win%": t.div_pct,
      })) as LeagueTeam[],
      regularGames,
    );
    const rank = new Map(regular.map((t, i) => [String(t.ID), i]));
    // Final finish: champion, runner-up, championship losers, divisional losers,
    // then non-playoff teams. Equal finishes use regular-season standings.
    const finish = new Map(order.map((id) => [id, 0]));
    for (const game of games.filter((g) => g.stage === "playoffs")) {
      const stage =
        game.playoff_round === "National Championship"
          ? 3
          : game.playoff_round === "Divisional Championships"
            ? 2
            : 1;
      for (const team of [game.home_team_id, game.away_team_id])
        finish.set(team, Math.max(finish.get(team) ?? 0, stage));
      if (stage === 3 && game.home_score !== game.away_score)
        finish.set(
          game.home_score > game.away_score
            ? game.home_team_id
            : game.away_team_id,
          4,
        );
    }
    order.sort(
      (a, b) =>
        (finish.get(a) ?? 0) - (finish.get(b) ?? 0) ||
        (rank.get(b) ?? rows.length) - (rank.get(a) ?? rows.length) ||
        a.localeCompare(b),
    );
  }
  const rules = JSON.stringify({ format: "snake", teamOrder: order, method });
  if (existing) {
    repo.db
      .prepare("UPDATE drafts SET order_rules_json=? WHERE id=?")
      .run(rules, existing.id);
    return { ...existing, order_rules_json: rules };
  }
  const row = {
    id: randomUUID(),
    season_id: seasonId,
    status: "planned",
    order_rules_json: rules,
  };
  repo.insert("drafts", row);
  return row;
}
export function snakeSlots(order: string[], rounds: number) {
  return Array.from({ length: rounds }, (_, round) =>
    (round % 2 ? [...order].reverse() : order).map((teamId, index) => ({
      round: round + 1,
      pickInRound: index + 1,
      overallPick: round * order.length + index + 1,
      teamId,
    })),
  ).flat();
}
