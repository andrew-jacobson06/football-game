import { randomInt, randomUUID } from "node:crypto";
import { LeagueRepository } from "./leagueRepository.js";
import { SeasonSetupError } from "./seasonPreparation.js";
import { seasonSchedule } from "./seasonSchedule.js";
export type LaunchStage = "rosters" | "schedule" | "headlines";
export class SeasonLaunch {
  constructor(readonly repo: LeagueRepository) {}
  run(seasonId: string, stage: unknown) {
    return this.repo.db
      .transaction(() => {
        const season = this.repo.season();
        if (season.id !== seasonId)
          throw new SeasonSetupError(
            "The active season changed. Reload before finalizing.",
            409,
          );
        if (!["rosters", "schedule", "headlines"].includes(String(stage)))
          throw new SeasonSetupError("Unknown season finalization step.");
        const draft = this.repo.one(
          "SELECT * FROM drafts WHERE season_id=? AND status='completed' ORDER BY rowid LIMIT 1",
          seasonId,
        );
        if (!draft)
          throw new SeasonSetupError(
            "Complete the player draft before finalizing the season.",
          );
        const saved = this.repo.one(
          "SELECT * FROM season_launch WHERE season_id=?",
          seasonId,
        );
        if (saved?.completed_at) return;
        if (season.status !== "setup")
          throw new SeasonSetupError("Season preparation is already closed.");
        this.repo.db
          .prepare(
            "INSERT INTO season_launch(season_id) VALUES(?) ON CONFLICT DO NOTHING",
          )
          .run(seasonId);
        const progress = this.repo.one(
          "SELECT * FROM season_launch WHERE season_id=?",
          seasonId,
        )!;
        if (
          (stage === "rosters" && progress.rosters_finalized_at) ||
          (stage === "schedule" && progress.schedule_set_at) ||
          (stage === "headlines" && progress.headlines_stubbed_at)
        )
          return;
        const teams = this.repo.all(
          "SELECT ts.*,d.name AS division_name FROM team_seasons ts JOIN divisions d ON d.id=ts.division_id WHERE ts.season_id=? ORDER BY d.name COLLATE NOCASE,ts.abbreviation COLLATE NOCASE",
          seasonId,
        );
        if (stage === "rosters" && !progress.rosters_finalized_at) {
          const expected = new Map<string, string>();
          for (const p of this.repo.all(
            `SELECT player_id,team_id FROM season_keeper_selections WHERE season_id=? UNION ALL SELECT player_id,selecting_team_id AS team_id FROM draft_picks WHERE draft_id=? AND player_id IS NOT NULL`,
            seasonId,
            draft.id,
          )) {
            if (
              expected.has(p.player_id) ||
              !teams.some((t) => t.team_id === p.team_id) ||
              !this.repo.one(
                "SELECT id FROM players WHERE id=? AND league_id=? AND retired_at IS NULL",
                p.player_id,
                season.league_id,
              )
            )
              throw new SeasonSetupError(
                "Draft and keeper ownership is inconsistent. Review the saved roster.",
              );
            expected.set(p.player_id, p.team_id);
          }
          for (const team of teams)
            if (
              [...expected.values()].filter((id) => id === team.team_id)
                .length !== draft.roster_target
            )
              throw new SeasonSetupError(
                `${team.abbreviation} does not have the completed draft roster size.`,
              );
          const coaches = this.repo.all(
            `SELECT a.* FROM coach_team_assignments a JOIN coaches c ON c.id=a.coach_id WHERE a.season_id=? AND a.status='active' AND a.effective_until IS NULL AND c.league_id=? AND c.retired_at IS NULL`,
            seasonId,
            season.league_id,
          );
          if (
            coaches.length !== teams.length ||
            new Set(coaches.map((c) => c.coach_id)).size !== teams.length ||
            teams.some(
              (t) =>
                coaches.filter((c) => c.team_id === t.team_id).length !== 1,
            )
          )
            throw new SeasonSetupError(
              "Every team must have exactly one assigned coach before finalization.",
            );
          for (const decision of this.repo.all(
            "SELECT * FROM season_team_decisions WHERE season_id=? AND coach_action='keep'",
            seasonId,
          ))
            if (
              !coaches.some(
                (c) =>
                  c.team_id === decision.team_id &&
                  c.coach_id === decision.previous_coach_id,
              )
            )
              throw new SeasonSetupError(
                "A retained coach does not match the saved coaching decision.",
              );
          for (const player of this.repo.all(
            "SELECT id FROM players WHERE league_id=?",
            season.league_id,
          )) {
            const assignment = this.repo.one(
              "SELECT * FROM player_team_assignments WHERE season_id=? AND player_id=? AND status='active' AND julianday(effective_from)<=julianday('now') AND (effective_until IS NULL OR julianday(effective_until)>julianday('now'))",
              seasonId,
              player.id,
            );
            if (assignment)
              this.repo.db
                .prepare(
                  "UPDATE player_team_assignments SET team_id=?,source='Finalized draft and keepers' WHERE id=?",
                )
                .run(expected.get(player.id) ?? null, assignment.id);
            else
              this.repo.insert("player_team_assignments", {
                id: randomUUID(),
                season_id: seasonId,
                player_id: player.id,
                team_id: expected.get(player.id) ?? null,
                status: "active",
                effective_from: new Date().toISOString(),
                source: "Finalized draft and keepers",
              });
          }
          this.repo.db
            .prepare(
              "UPDATE season_launch SET rosters_finalized_at=datetime('now') WHERE season_id=?",
            )
            .run(seasonId);
        }
        if (stage === "schedule" && !progress.schedule_set_at) {
          if (!progress.rosters_finalized_at)
            throw new SeasonSetupError(
              "Finalize rosters before setting the schedule.",
            );
          const divisions = [...new Set(teams.map((t) => t.division_id))];
          if (
            divisions.length !== 2 ||
            divisions.some(
              (id) => teams.filter((t) => t.division_id === id).length !== 5,
            )
          )
            throw new SeasonSetupError(
              "Scheduling requires exactly two divisions with five teams in each.",
            );
          if (
            this.repo.one(
              "SELECT id FROM games WHERE season_id=? LIMIT 1",
              seasonId,
            )
          )
            throw new SeasonSetupError(
              "This season already has games. Existing games will not be replaced.",
              409,
            );
          const firstSlot = randomInt(2) === 1 ? 1 : 2,
            aliases = new Map<string, string>();
          for (const [i, division] of divisions.entries()) {
            const slot = i === 0 ? firstSlot : 3 - firstSlot,
              available = [1, 2, 3, 4, 5];
            for (const team of teams.filter(
              (t) => t.division_id === division,
            )) {
              const [index] = available.splice(randomInt(available.length), 1),
                alias = `div${slot}-${index}`;
              this.repo.insert("season_schedule_teams", {
                season_id: seasonId,
                team_id: team.team_id,
                schedule_alias: alias,
                division_slot: slot,
                team_index: index,
              });
              aliases.set(alias, team.team_id);
            }
          }
          for (const [index, [week, home, away]] of seasonSchedule.entries()) {
            const id = randomUUID();
            this.repo.insert("games", {
              id,
              season_id: seasonId,
              legacy_game_number: index + 1,
              stage: "regular",
              regular_week: week,
              home_team_id: aliases.get(home),
              away_team_id: aliases.get(away),
              status: "scheduled",
              settings_version_id: season.settings_version_id,
              is_neutral_site: 0,
            });
            this.repo.insert("game_state", {
              game_id: id,
              phase: "awaiting_toss",
              period: 1,
              seconds_remaining: 900,
              home_score: 0,
              away_score: 0,
              home_timeouts: 3,
              away_timeouts: 3,
            });
          }
          this.repo.db
            .prepare(
              "UPDATE season_launch SET schedule_set_at=datetime('now') WHERE season_id=?",
            )
            .run(seasonId);
        }
        if (stage === "headlines" && !progress.headlines_stubbed_at) {
          if (!progress.schedule_set_at)
            throw new SeasonSetupError(
              "Set the schedule before preparing headline drafts.",
            );
          const headlines = [
            ["draft-recap", "Draft recap and draft grades"],
            ["coaching-carousel", "Coaching carousel"],
            [
              "early-predictions",
              `A way too early prediction for all ${teams.length} teams in the AFL this season`,
            ],
            ["preseason-awards", "Preseason Awards"],
            ["week-1-predictions", "Week 1 matchup predictions"],
            ["game-of-the-week", "Game of the week"],
            ["player-spotlight", "Player spotlight"],
          ];
          for (const [key, title] of headlines) {
            const id = randomUUID();
            this.repo.insert("articles", {
              id,
              season_id: seasonId,
              stage: "regular",
              regular_week: 1,
              article_type: key,
              status: "draft",
              title,
              summary: "Awaiting future AI generation.",
              markdown: "",
              published_at: null,
              is_featured: 0,
            });
            this.repo.insert("season_headline_stubs", {
              season_id: seasonId,
              headline_key: key,
              article_id: id,
            });
          }
          this.repo.db
            .prepare(
              "UPDATE season_launch SET headlines_stubbed_at=datetime('now'),completed_at=datetime('now') WHERE season_id=?",
            )
            .run(seasonId);
          this.repo.db
            .prepare(
              "UPDATE seasons SET status='regular',current_stage='regular',current_week=1,started_at=coalesce(started_at,datetime('now')),updated_at=datetime('now') WHERE id=?",
            )
            .run(seasonId);
        }
        this.repo.insert("audit_log", {
          id: randomUUID(),
          season_id: seasonId,
          action: `season_launch_${stage}`,
          entity_type: "season",
          entity_id: seasonId,
        });
      })
      .immediate();
  }
}
