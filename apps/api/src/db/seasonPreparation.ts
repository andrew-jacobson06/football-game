import { initializeDraft } from "./draftOrder.js";
import { randomInt, randomUUID } from "node:crypto";
import type { DatabaseConnection } from "./connection.js";
import { LeagueRepository } from "./leagueRepository.js";
export class SeasonSetupError extends Error {
  constructor(
    message: string,
    readonly status = 400,
  ) {
    super(message);
  }
}
function shuffled(ids: string[]) {
  const result = [...ids];
  for (let i = result.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}
export class SeasonPreparation {
  constructor(readonly repo: LeagueRepository) {}
  get db(): DatabaseConnection {
    return this.repo.db;
  }
  private setupSeason(expectedId: string) {
    const s = this.repo.season();
    if (s.id !== expectedId)
      throw new SeasonSetupError(
        "The active season changed. Reload before continuing.",
        409,
      );
    if (s.status !== "setup")
      throw new SeasonSetupError(
        "Season preparation is only available before the season starts.",
      );
    return s;
  }
  private prep(id: string) {
    return this.repo.one(
      "SELECT * FROM season_preparation WHERE season_id=?",
      id,
    );
  }
  private teams(id: string) {
    return this.repo.all(
      "SELECT * FROM team_seasons WHERE season_id=? ORDER BY abbreviation",
      id,
    );
  }
  private coaches(id: string) {
    return this.repo.all(
      "SELECT a.*,c.display_name,c.coach_type FROM coach_team_assignments a JOIN coaches c ON c.id=a.coach_id WHERE a.season_id=? AND a.status='active' AND a.effective_until IS NULL",
      id,
    );
  }
  canAdvance() {
    const s = this.repo.season();
    return Boolean(
      this.repo.one(
        `SELECT g.id FROM games g JOIN game_state st ON st.game_id=g.id WHERE g.season_id=? AND g.playoff_round='National Championship' AND g.status='final' AND st.phase='final' AND st.home_score<>st.away_score`,
        s.id,
      ),
    );
  }
  initializeFirstSeason(id: string) {
    if (this.prep(id)) return;
    const season = this.repo.one("SELECT * FROM seasons WHERE id=?", id)!;
    if (season.season_number !== 1 || season.status !== "setup") return;
    const league = this.repo.one(
      "SELECT * FROM leagues WHERE id=?",
      season.league_id,
    )!;
    const teams = this.teams(id),
      assigned = this.coaches(id);
    this.repo.insert("season_preparation", {
      season_id: id,
      keeper_count: league.keeper_count ?? 0,
      keepers_finalized: 1,
      coach_order_json: JSON.stringify(
        shuffled(
          teams
            .filter((t) => !assigned.some((c) => c.team_id === t.team_id))
            .map((t) => t.team_id),
        ),
      ),
    });
    for (const team of teams)
      this.repo.insert("season_team_decisions", {
        season_id: id,
        team_id: team.team_id,
        coach_action: "hire",
        keepers_locked: 1,
      });
  }
  state() {
    const season = this.repo.season(),
      league = this.repo.one(
        "SELECT * FROM leagues WHERE id=?",
        season.league_id,
      )!;
    if (
      season.status === "setup" &&
      season.season_number === 1 &&
      !this.prep(season.id)
    )
      this.db
        .transaction(() => {
          this.initializeFirstSeason(season.id);
        })
        .immediate();
    const prep = this.prep(season.id),
      assigned = this.coaches(season.id),
      order = JSON.parse(prep?.coach_order_json ?? "[]") as string[];
    const teams = this.teams(season.id).map((t) => {
      const decision = this.repo.one(
        "SELECT d.*,c.display_name AS previous_coach_name FROM season_team_decisions d LEFT JOIN coaches c ON c.id=d.previous_coach_id WHERE d.season_id=? AND d.team_id=?",
        season.id,
        t.team_id,
      );
      const roster = this.repo.all(
        `SELECT r.player_id AS id,p.display_name AS name,pr.offense_position AS position FROM season_roster_candidates r JOIN players p ON p.id=r.player_id LEFT JOIN player_season_ratings pr ON pr.player_id=p.id AND pr.season_id=r.season_id AND pr.version=(SELECT max(x.version) FROM player_season_ratings x WHERE x.season_id=r.season_id AND x.player_id=p.id) WHERE r.season_id=? AND r.previous_team_id=? ORDER BY p.display_name`,
        season.id,
        t.team_id,
      );
      const coach = assigned.find((c) => c.team_id === t.team_id);
      return {
        id: t.team_id,
        abbreviation: t.abbreviation,
        name: t.nickname,
        logoUrl: t.logo_url,
        roster,
        selectedPlayerIds: this.repo
          .all(
            "SELECT player_id FROM season_keeper_selections WHERE season_id=? AND team_id=?",
            season.id,
            t.team_id,
          )
          .map((r) => r.player_id),
        locked: Boolean(decision?.keepers_locked),
        coachAction: decision?.coach_action ?? null,
        previousCoach: decision?.previous_coach_id
          ? {
              id: decision.previous_coach_id,
              name: decision.previous_coach_name,
            }
          : null,
        coach: coach ? { id: coach.coach_id, name: coach.display_name } : null,
      };
    });
    const nextTeamId =
      order.find((id) => !assigned.some((a) => a.team_id === id)) ?? null;
    const availableCoaches = this.repo.all(
      `SELECT c.id,c.display_name AS name,c.coach_type AS type FROM coaches c WHERE c.league_id=? AND c.retired_at IS NULL AND NOT EXISTS(SELECT 1 FROM coach_team_assignments a WHERE a.coach_id=c.id AND a.season_id=? AND a.status='active' AND a.effective_until IS NULL) ORDER BY c.display_name`,
      season.league_id,
      season.id,
    );
    const phase =
      season.status !== "setup"
        ? this.canAdvance()
          ? "season_complete"
          : "in_progress"
        : !prep
          ? "not_initialized"
          : !prep.keepers_finalized
            ? teams.every((t) => t.locked)
              ? "finalize_keepers"
              : "keepers"
            : assigned.length < teams.length
              ? "coach_hiring"
              : "draft_ready";
    return {
      seasonId: season.id,
      seasonNumber: season.season_number,
      year: season.display_year,
      leagueKeeperCount: league.keeper_count,
      keeperCount: prep?.keeper_count ?? league.keeper_count,
      phase,
      draftReady: phase === "draft_ready",
      canAdvanceSeason: this.canAdvance(),
      teams,
      coachOrder: order,
      nextTeamId,
      availableCoaches,
    };
  }
  advance(fromSeasonId: string, keeperInput: unknown) {
    return this.db
      .transaction(() => {
        const current = this.repo.season(),
          from = this.repo.one(
            "SELECT * FROM seasons WHERE id=? AND league_id=?",
            fromSeasonId,
            current.league_id,
          );
        if (!from)
          throw new SeasonSetupError("Season not found in this league.");
        const prior = this.repo.one(
          "SELECT id FROM seasons WHERE previous_season_id=?",
          from.id,
        );
        if (prior) {
          if (prior.id !== current.id)
            throw new SeasonSetupError(
              "The league has already advanced further. Reload it.",
              409,
            );
          return this.state();
        }
        if (current.id !== from.id || !this.canAdvance())
          throw new SeasonSetupError(
            "The National Championship must be final with a winner before advancing the season.",
          );
        const league = this.repo.one(
          "SELECT * FROM leagues WHERE id=?",
          from.league_id,
        )!;
        const keeperCount =
          keeperInput === undefined ? league.keeper_count : keeperInput;
        if (
          !Number.isSafeInteger(keeperCount) ||
          keeperCount < 0 ||
          keeperCount > 100
        )
          throw new SeasonSetupError(
            "Enter the number of keepers per team (0–100).",
          );
        const roster = this.repo.all(
          `SELECT a.* FROM player_team_assignments a JOIN players p ON p.id=a.player_id WHERE a.season_id=? AND p.retired_at IS NULL AND a.status='active' AND julianday(a.effective_from)<=julianday('now') AND (a.effective_until IS NULL OR julianday(a.effective_until)>julianday('now'))`,
          from.id,
        );
        const teams = this.teams(from.id);
        for (const t of teams) {
          const count = roster.filter((p) => p.team_id === t.team_id).length;
          if (count < keeperCount)
            throw new SeasonSetupError(
              `${t.abbreviation} has ${count} players and cannot keep ${keeperCount}. Choose a lower league keeper limit.`,
            );
        }
        const id = randomUUID(),
          number = from.season_number + 1,
          now = new Date().toISOString();
        this.db
          .prepare("UPDATE leagues SET keeper_count=? WHERE id=?")
          .run(keeperCount, from.league_id);
        this.repo.insert("seasons", {
          id,
          league_id: from.league_id,
          season_number: number,
          display_name: `Season ${number}`,
          display_year: (from.display_year ?? new Date().getUTCFullYear()) + 1,
          status: "setup",
          current_stage: "regular",
          current_week: 1,
          settings_version_id:
            from.settings_version_id ?? this.repo.settingsVersion(),
          previous_season_id: from.id,
        });
        for (const team of teams)
          this.repo.insert("team_seasons", {
            ...team,
            id: randomUUID(),
            season_id: id,
          });
        for (const p of this.repo.all(
          "SELECT * FROM players WHERE league_id=? AND retired_at IS NULL",
          from.league_id,
        )) {
          const rating = this.repo.one(
            "SELECT * FROM player_season_ratings WHERE season_id=? AND player_id=? ORDER BY version DESC LIMIT 1",
            from.id,
            p.id,
          );
          if (rating)
            this.repo.insert("player_season_ratings", {
              ...rating,
              id: randomUUID(),
              season_id: id,
              version: 1,
            });
          const assignment = roster.find((a) => a.player_id === p.id);
          this.repo.insert("player_team_assignments", {
            id: randomUUID(),
            season_id: id,
            player_id: p.id,
            team_id: assignment?.team_id ?? null,
            effective_from: now,
            status: "active",
            source: "Season roster carryover pending keeper finalization",
          });
          if (assignment?.team_id)
            this.repo.insert("season_roster_candidates", {
              season_id: id,
              player_id: p.id,
              previous_team_id: assignment.team_id,
            });
        }
        const oldCoaches = this.coaches(from.id);
        for (const coach of this.repo.all(
          "SELECT * FROM coaches WHERE league_id=? AND retired_at IS NULL",
          from.league_id,
        )) {
          const rating = this.repo.one(
            "SELECT * FROM coach_season_ratings WHERE season_id=? AND coach_id=? ORDER BY version DESC LIMIT 1",
            from.id,
            coach.id,
          );
          if (rating)
            this.repo.insert("coach_season_ratings", {
              ...rating,
              id: randomUUID(),
              season_id: id,
              version: 1,
            });
        }
        for (const t of teams) {
          const coach = oldCoaches.find((c) => c.team_id === t.team_id);
          this.repo.insert("season_team_decisions", {
            season_id: id,
            team_id: t.team_id,
            previous_coach_id: coach?.coach_id ?? null,
            coach_action: coach ? null : "hire",
            keepers_locked: 0,
          });
          if (coach)
            this.repo.insert("coach_team_assignments", {
              id: randomUUID(),
              season_id: id,
              coach_id: coach.coach_id,
              team_id: t.team_id,
              role: "Head Coach",
              effective_from: now,
              status: "active",
            });
        }
        this.repo.insert("season_preparation", {
          season_id: id,
          keeper_count: keeperCount,
          keepers_finalized: 0,
        });
        initializeDraft(this.repo, id);
        this.db
          .prepare(
            "UPDATE seasons SET status='finalized',games_completed_at=coalesce(games_completed_at,?),finalized_at=?,updated_at=? WHERE id=?",
          )
          .run(now, now, now, from.id);
        this.repo.insert("audit_log", {
          id: randomUUID(),
          action: "season_advanced",
          entity_type: "season",
          entity_id: id,
          season_id: id,
          before_json: JSON.stringify({ seasonId: from.id }),
          after_json: JSON.stringify({ seasonNumber: number, keeperCount }),
          reason: "National Championship complete; empty next-season schedule",
        });
        return this.state();
      })
      .immediate();
  }
  lockTeam(
    seasonId: string,
    teamId: string,
    playerIds: unknown,
    coachAction: unknown,
  ) {
    return this.db
      .transaction(() => {
        this.setupSeason(seasonId);
        const prep = this.prep(seasonId),
          team = this.repo.one(
            "SELECT * FROM season_team_decisions WHERE season_id=? AND team_id=?",
            seasonId,
            teamId,
          );
        if (!prep || prep.keepers_finalized || !team)
          throw new SeasonSetupError(
            "Keeper selections are not open for this team.",
          );
        if (
          !Array.isArray(playerIds) ||
          playerIds.length !== prep.keeper_count ||
          new Set(playerIds).size !== playerIds.length ||
          playerIds.some((id) => typeof id !== "string")
        )
          throw new SeasonSetupError(
            `Select exactly ${prep.keeper_count} different players before locking keepers.`,
          );
        for (const id of playerIds)
          if (
            !this.repo.one(
              "SELECT 1 FROM season_roster_candidates WHERE season_id=? AND previous_team_id=? AND player_id=?",
              seasonId,
              teamId,
              id,
            )
          )
            throw new SeasonSetupError(
              "Keepers must belong to this team’s previous roster.",
            );
        if (
          team.previous_coach_id
            ? !["keep", "fire"].includes(String(coachAction))
            : coachAction !== "hire"
        )
          throw new SeasonSetupError(
            team.previous_coach_id
              ? "Choose whether to keep or fire the coach."
              : "This team needs to hire a coach.",
          );
        if (team.keepers_locked)
          throw new SeasonSetupError(
            "Unlock this team before changing its saved selections.",
          );
        this.db
          .prepare(
            "DELETE FROM season_keeper_selections WHERE season_id=? AND team_id=?",
          )
          .run(seasonId, teamId);
        for (const id of playerIds)
          this.repo.insert("season_keeper_selections", {
            season_id: seasonId,
            team_id: teamId,
            player_id: id,
          });
        this.db
          .prepare(
            "UPDATE season_team_decisions SET coach_action=?,keepers_locked=1,locked_at=datetime('now') WHERE season_id=? AND team_id=?",
          )
          .run(coachAction, seasonId, teamId);
        return this.state();
      })
      .immediate();
  }
  unlockTeam(seasonId: string, teamId: string) {
    return this.db
      .transaction(() => {
        this.setupSeason(seasonId);
        if (this.prep(seasonId)?.keepers_finalized)
          throw new SeasonSetupError("Keepers have already been finalized.");
        const r = this.db
          .prepare(
            "UPDATE season_team_decisions SET keepers_locked=0,locked_at=NULL WHERE season_id=? AND team_id=?",
          )
          .run(seasonId, teamId);
        if (!r.changes) throw new SeasonSetupError("Team not found.");
        return this.state();
      })
      .immediate();
  }
  finalize(seasonId: string) {
    return this.db
      .transaction(() => {
        this.setupSeason(seasonId);
        const prep = this.prep(seasonId);
        if (!prep)
          throw new SeasonSetupError("Season preparation not initialized.");
        if (prep.keepers_finalized) return this.state();
        const teams = this.teams(seasonId);
        for (const t of teams) {
          const d = this.repo.one(
            "SELECT * FROM season_team_decisions WHERE season_id=? AND team_id=?",
            seasonId,
            t.team_id,
          );
          const count = this.repo.one(
            "SELECT count(*) AS n FROM season_keeper_selections WHERE season_id=? AND team_id=?",
            seasonId,
            t.team_id,
          )!.n;
          if (
            !d?.keepers_locked ||
            count !== prep.keeper_count ||
            !d.coach_action
          )
            throw new SeasonSetupError(
              "Every team must lock the exact keeper count and its coaching decision before finalizing.",
            );
        }
        this.db
          .prepare(
            `UPDATE player_team_assignments SET team_id=(SELECT k.team_id FROM season_keeper_selections k WHERE k.season_id=player_team_assignments.season_id AND k.player_id=player_team_assignments.player_id),source='Finalized offseason keepers / free agents' WHERE season_id=? AND status='active' AND effective_until IS NULL`,
          )
          .run(seasonId);
        this.db
          .prepare(
            `UPDATE coach_team_assignments SET status='released' WHERE season_id=? AND status='active' AND team_id IN (SELECT team_id FROM season_team_decisions WHERE season_id=? AND coach_action='fire')`,
          )
          .run(seasonId, seasonId);
        const assigned = this.coaches(seasonId),
          needsCoach = teams
            .filter((t) => !assigned.some((c) => c.team_id === t.team_id))
            .map((t) => t.team_id);
        this.db
          .prepare(
            "UPDATE season_preparation SET keepers_finalized=1,keepers_finalized_at=datetime('now'),coach_order_json=? WHERE season_id=?",
          )
          .run(JSON.stringify(shuffled(needsCoach)), seasonId);
        this.repo.insert("audit_log", {
          id: randomUUID(),
          action: "keepers_finalized",
          entity_type: "season",
          entity_id: seasonId,
          season_id: seasonId,
          after_json: JSON.stringify({
            keeperCount: prep.keeper_count,
            teams: teams.length,
          }),
          reason:
            "Non-keepers released to draft pool; fired coaches released for rehiring",
        });
        return this.state();
      })
      .immediate();
  }
  hire(seasonId: string, teamId: string, coachId: string) {
    return this.db
      .transaction(() => {
        const season = this.setupSeason(seasonId);
        const prep = this.prep(seasonId);
        if (!prep?.keepers_finalized)
          throw new SeasonSetupError(
            "Finalize keepers and coaching decisions before hiring.",
          );
        const existing = this.coaches(seasonId).find(
          (c) => c.team_id === teamId,
        );
        if (existing) {
          if (existing.coach_id === coachId) return this.state();
          throw new SeasonSetupError("This team already has a coach.");
        }
        const state = this.state();
        if (state.nextTeamId !== teamId)
          throw new SeasonSetupError(
            "It is not this team’s turn to choose a coach.",
            409,
          );
        if (!state.availableCoaches.some((c) => c.id === coachId))
          throw new SeasonSetupError(
            "That coach is not available in this league.",
            409,
          );
        this.repo.insert("coach_team_assignments", {
          id: randomUUID(),
          season_id: seasonId,
          team_id: teamId,
          coach_id: coachId,
          role: "Head Coach",
          effective_from: new Date().toISOString(),
          status: "active",
        });
        if (this.coaches(seasonId).length === this.teams(seasonId).length)
          this.db
            .prepare(
              "UPDATE season_preparation SET ready_at=datetime('now') WHERE season_id=?",
            )
            .run(seasonId);
        this.repo.insert("audit_log", {
          id: randomUUID(),
          action: "coach_hired",
          entity_type: "coach",
          entity_id: coachId,
          season_id: season.id,
          after_json: JSON.stringify({ teamId }),
          reason: "Randomized offseason coach selection",
        });
        return this.state();
      })
      .immediate();
  }
}
