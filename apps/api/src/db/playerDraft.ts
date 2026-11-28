import { randomUUID } from "node:crypto";
import { LeagueRepository } from "./leagueRepository.js";
import { initializeDraft, snakeSlots } from "./draftOrder.js";
import { SeasonPreparation, SeasonSetupError } from "./seasonPreparation.js";

export class PlayerDraft {
  constructor(readonly repo: LeagueRepository) {}
  private draft() {
    const season = this.repo.season();
    const row = this.repo.one(
      "SELECT * FROM drafts WHERE season_id=? ORDER BY rowid LIMIT 1",
      season.id,
    );
    if (!row && season.status !== "setup")
      throw new SeasonSetupError("No player draft exists for this season.");
    if (
      row?.order_rules_json &&
      Array.isArray(JSON.parse(row.order_rules_json).teamOrder)
    )
      return row;
    return this.repo.db
      .transaction(() => initializeDraft(this.repo, season.id))
      .immediate();
  }
  private expectSeason(id: string) {
    const season = this.repo.season();
    if (season.id !== id)
      throw new SeasonSetupError(
        "The active season changed. Reload the draft.",
        409,
      );
    if (season.status !== "setup")
      throw new SeasonSetupError(
        "The player draft is only available before the season starts.",
      );
    return season;
  }
  state() {
    const season = this.repo.season(),
      draft = this.draft(),
      preparation = new SeasonPreparation(this.repo).state();
    const order = JSON.parse(draft.order_rules_json).teamOrder as string[];
    const owned = this.repo.all(
      "SELECT player_id,team_id FROM player_team_assignments WHERE season_id=? AND status='active' AND julianday(effective_from)<=julianday('now') AND (effective_until IS NULL OR julianday(effective_until)>julianday('now'))",
      season.id,
    );
    const active = new Set(
      this.repo
        .all(
          "SELECT id FROM players WHERE league_id=? AND retired_at IS NULL",
          season.league_id,
        )
        .map((p) => p.id),
    );
    const players = this.repo
      .players()
      .filter((p) => active.has(p.id))
      .map((p) => ({
        ...p,
        id: String(p.id),
        teamId: owned.find((a) => a.player_id === p.id)?.team_id ?? null,
      }));
    const teams = order.map((id) =>
      this.repo.one(
        "SELECT team_id AS id,abbreviation,nickname AS name,logo_url AS logoUrl,primary_color AS primaryColor,away_jersey_url AS awayJerseyUrl FROM team_seasons WHERE season_id=? AND team_id=?",
        season.id,
        id,
      )!,
    );
    const picks = this.repo.all(
      "SELECT id,round,pick_in_round AS pickInRound,overall_pick AS overallPick,selecting_team_id AS teamId,player_id AS playerId FROM draft_picks WHERE draft_id=? ORDER BY overall_pick",
      draft.id,
    );
    const current = picks.find((p) => p.playerId === null) ?? null;
    return {
      seasonId: season.id,
      draftId: draft.id,
      status: draft.status,
      ready: preparation.draftReady,
      orderMethod: JSON.parse(draft.order_rules_json).method,
      teams,
      players,
      picks,
      currentPick: current,
      rounds: draft.round_count ?? 0,
      rosterTarget: draft.roster_target ?? null,
      suggestedRosterTarget: 10,
    };
  }
  start(seasonId: string, target: unknown) {
    return this.repo.db
      .transaction(() => {
        const season = this.expectSeason(seasonId),
          draft = this.draft();
        if (draft.status !== "planned") {
          if (draft.roster_target !== target)
            throw new SeasonSetupError(
              "This draft has already started with a different roster target.",
              409,
            );
          return this.state();
        }
        if (!new SeasonPreparation(this.repo).state().draftReady)
          throw new SeasonSetupError(
            "Complete keepers and coach selection before starting the draft.",
          );
        if (
          typeof target !== "number" ||
          !Number.isSafeInteger(target) ||
          target < 1 ||
          target > 100
        )
          throw new SeasonSetupError(
            "Choose a whole-number roster target from 1 to 100.",
          );
        const state = this.state(),
          sizes = state.teams.map(
            (t) => state.players.filter((p) => p.teamId === t.id).length,
          );
        if (new Set(sizes).size !== 1)
          throw new SeasonSetupError(
            "All teams must have the same keeper count before a snake draft can start.",
          );
        const rounds = target - (sizes[0] ?? 0);
        if (rounds < 0)
          throw new SeasonSetupError(
            "The roster target cannot be smaller than the keeper count.",
          );
        if (
          rounds * state.teams.length >
          state.players.filter((p) => !p.teamId).length
        )
          throw new SeasonSetupError(
            "There are not enough available players to fill every team to this roster target.",
          );
        for (const slot of snakeSlots(
          state.teams.map((t) => t.id),
          rounds,
        ))
          this.repo.insert("draft_picks", {
            id: randomUUID(),
            draft_id: draft.id,
            round: slot.round,
            pick_in_round: slot.pickInRound,
            overall_pick: slot.overallPick,
            original_team_id: slot.teamId,
            selecting_team_id: slot.teamId,
          });
        this.repo.db
          .prepare(
            "UPDATE drafts SET status=?,round_count=?,roster_target=?,started_at=datetime('now'),completed_at=CASE WHEN ?=0 THEN datetime('now') END WHERE id=?",
          )
          .run(
            rounds ? "running" : "completed",
            rounds || null,
            target,
            rounds,
            draft.id,
          );
        this.repo.insert("audit_log", {
          id: randomUUID(),
          season_id: season.id,
          action: "draft_started",
          entity_type: "draft",
          entity_id: draft.id,
          after_json: JSON.stringify({
            rosterTarget: target,
            rounds,
            teamOrder: state.teams.map((t) => t.id),
          }),
        });
        return this.state();
      })
      .immediate();
  }
  pick(seasonId: string, pickId: string, playerId: string) {
    return this.repo.db
      .transaction(() => {
        this.expectSeason(seasonId);
        const draft = this.draft();
        const requested = this.repo.one(
          "SELECT * FROM draft_picks WHERE id=? AND draft_id=?",
          pickId,
          draft.id,
        );
        if (!requested)
          throw new SeasonSetupError("Pick not found in this draft.", 409);
        // A network retry returns the same result; it never advances a second pick.
        if (requested.player_id) {
          if (requested.player_id === playerId) return this.state();
          throw new SeasonSetupError(
            "This pick has already been made. Reload the board.",
            409,
          );
        }
        if (draft.status !== "running")
          throw new SeasonSetupError(
            "Start the draft before selecting a player.",
          );
        if (!new SeasonPreparation(this.repo).state().draftReady)
          throw new SeasonSetupError("Season preparation is not complete.");
        const next = this.repo.one(
          "SELECT * FROM draft_picks WHERE draft_id=? AND player_id IS NULL ORDER BY overall_pick LIMIT 1",
          draft.id,
        )!;
        if (next.id !== pickId)
          throw new SeasonSetupError(
            "It is not this pick’s turn. Reload the board.",
            409,
          );
        const season = this.repo.season(),
          player = this.repo.one(
            "SELECT * FROM players WHERE id=? AND league_id=? AND retired_at IS NULL",
            playerId,
            season.league_id,
          );
        if (!player)
          throw new SeasonSetupError("Player not available in this league.");
        const now = new Date().toISOString();
        const assignment = this.repo.one(
          "SELECT * FROM player_team_assignments WHERE season_id=? AND player_id=? AND status='active' AND julianday(effective_from)<=julianday('now') AND (effective_until IS NULL OR julianday(effective_until)>julianday('now'))",
          seasonId,
          playerId,
        );
        if (assignment?.team_id)
          throw new SeasonSetupError(
            "This player is already assigned to a team.",
            409,
          );
        if (assignment)
          this.repo.db
            .prepare(
              "UPDATE player_team_assignments SET team_id=?,source='Snake draft' WHERE id=?",
            )
            .run(next.selecting_team_id, assignment.id);
        else
          this.repo.insert("player_team_assignments", {
            id: randomUUID(),
            season_id: seasonId,
            player_id: playerId,
            team_id: next.selecting_team_id,
            status: "active",
            effective_from: now,
            source: "Snake draft",
          });
        this.repo.db
          .prepare("UPDATE draft_picks SET player_id=?,picked_at=? WHERE id=?")
          .run(playerId, now, pickId);
        if (
          !this.repo.one(
            "SELECT id FROM draft_picks WHERE draft_id=? AND player_id IS NULL",
            draft.id,
          )
        )
          this.repo.db
            .prepare(
              "UPDATE drafts SET status='completed',completed_at=? WHERE id=?",
            )
            .run(now, draft.id);
        this.repo.insert("audit_log", {
          id: randomUUID(),
          season_id: seasonId,
          action: "player_drafted",
          entity_type: "draft_pick",
          entity_id: pickId,
          after_json: JSON.stringify({
            playerId,
            teamId: next.selecting_team_id,
            overallPick: next.overall_pick,
          }),
        });
        return this.state();
      })
      .immediate();
  }
}
