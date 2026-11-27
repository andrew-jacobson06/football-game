import { initializeDraft } from "./draftOrder.js";
import { randomUUID } from "node:crypto";
import type { DatabaseConnection } from "./connection.js";
import { LeagueRepository, type RecordRow } from "./leagueRepository.js";
import { SeasonPreparation } from "./seasonPreparation.js";
export class LeagueSetupError extends Error {
  constructor(
    message: string,
    readonly status = 400,
  ) {
    super(message);
  }
}
export type TeamChoice = {
  catalogId?: string;
  division: string;
  custom?: {
    abbreviation: string;
    nickname: string;
    location?: string;
    logoUrl?: string;
    primaryColor?: string;
  };
};
export type NewLeagueInput = {
  name: string;
  keeperCount: number;
  requestId: string;
  divisions: string[];
  teams: TeamChoice[];
};
const key = (v: unknown) =>
  String(v ?? "")
    .trim()
    .toLowerCase();
export class LeagueManagement {
  readonly repo: LeagueRepository;
  constructor(readonly db: DatabaseConnection) {
    this.repo = new LeagueRepository(db);
  }
  leagues() {
    return this.repo
      .all(`SELECT l.id,l.name,l.keeper_count AS keeperCount,l.save_slot AS slot,s.id AS seasonId,s.season_number AS seasonNumber,s.status,s.current_stage AS stage,s.current_week AS week,
      (SELECT count(*) FROM team_seasons ts WHERE ts.season_id=s.id) AS teamCount
      FROM leagues l LEFT JOIN seasons s ON s.league_id=l.id AND s.season_number=(SELECT max(x.season_number) FROM seasons x WHERE x.league_id=l.id)
      WHERE l.save_slot IS NOT NULL ORDER BY l.save_slot`);
  }
  source() {
    const stored = this.repo.one(
      "SELECT json_extract(value_json,'$') AS id FROM app_preferences WHERE key='league_template_source_id'",
    )?.id;
    const leagueId =
      stored ??
      this.repo.one(
        "SELECT l.id FROM leagues l JOIN seasons s ON s.league_id=l.id ORDER BY l.created_at,l.id,s.season_number LIMIT 1",
      )?.id;
    if (!leagueId)
      throw new LeagueSetupError(
        "Import the initial league before creating a new league.",
      );
    const source = new LeagueRepository(this.db, leagueId);
    source.season();
    return source;
  }
  catalog() {
    const source = this.source();
    const divisions = this.repo
      .all(
        "SELECT name FROM divisions WHERE league_id=? ORDER BY display_order,name",
        source.season().league_id,
      )
      .map((d) => d.name as string);
    const teams = this.repo
      .all("SELECT * FROM team_catalog ORDER BY location,nickname")
      .map((r) => ({
        id: r.id,
        abbreviation: r.abbreviation,
        location: r.location,
        nickname: r.nickname,
        logoUrl: r.logo_url,
        primaryColor: r.primary_color,
        defaultDivision: r.default_division,
      }));
    return {
      divisions: [
        ...new Set([...divisions, ...teams.map((t) => t.defaultDivision)]),
      ],
      teams,
    };
  }
  create(input: NewLeagueInput) {
    if (!input || typeof input !== "object")
      throw new LeagueSetupError("League details are required.");
    const name = typeof input.name === "string" ? input.name.trim() : "";
    if (!name || name.length > 80)
      throw new LeagueSetupError(
        "Enter a league name between 1 and 80 characters.",
      );
    if (
      typeof input.requestId !== "string" ||
      !/^[0-9a-f-]{36}$/i.test(input.requestId)
    )
      throw new LeagueSetupError("A valid creation request ID is required.");
    if (
      !Array.isArray(input.divisions) ||
      input.divisions.length < 1 ||
      input.divisions.length > 8 ||
      input.divisions.some(
        (d) => typeof d !== "string" || !d.trim() || d.trim().length > 40,
      )
    )
      throw new LeagueSetupError("Choose between 1 and 8 named divisions.");
    const divisions = input.divisions.map((d) => d.trim());
    if (new Set(divisions.map(key)).size !== divisions.length)
      throw new LeagueSetupError("Division names must be distinct.");
    if (
      !Array.isArray(input.teams) ||
      input.teams.length < 2 ||
      input.teams.length > 32
    )
      throw new LeagueSetupError("Choose between 2 and 32 teams.");
    if (
      !Number.isSafeInteger(input.keeperCount) ||
      input.keeperCount < 0 ||
      input.keeperCount > 100
    )
      throw new LeagueSetupError("Enter a keeper count between 0 and 100.");
    const config = JSON.stringify({
      name,
      keeperCount: input.keeperCount,
      divisions,
      teams: input.teams,
    });
    return this.db
      .transaction(() => {
        const prior = this.repo.one(
          "SELECT id,creation_config_json FROM leagues WHERE creation_request_id=?",
          input.requestId,
        );
        if (prior) {
          if (prior.creation_config_json !== config)
            throw new LeagueSetupError(
              "This creation request was already used with different league details.",
              409,
            );
          return this.leagues().find((l) => l.id === prior.id)!;
        }
        const used = this.leagues().map((l) => l.slot),
          slot = [1, 2, 3].find((s) => !used.includes(s));
        if (!slot)
          throw new LeagueSetupError(
            "All three league slots are occupied.",
            409,
          );
        const source = this.source(),
          sourceSeason = source.season(),
          sourceVersion = source.settingsVersion();
        const teamRows: RecordRow[] = input.teams.map((choice) => {
          if (!choice || typeof choice.division !== "string")
            throw new LeagueSetupError("Assign every team to a division.");
          const division = divisions.find(
            (d) => key(d) === key(choice.division),
          );
          if (!division)
            throw new LeagueSetupError(
              "Every team must use one of the selected divisions.",
            );
          if (Boolean(choice.catalogId) === Boolean(choice.custom))
            throw new LeagueSetupError(
              "Choose an available team or provide one new team.",
            );
          if (choice.catalogId) {
            if (typeof choice.catalogId !== "string")
              throw new LeagueSetupError("Choose a valid available team.");
            const r = this.repo.one(
              "SELECT * FROM team_catalog WHERE id=?",
              choice.catalogId,
            );
            if (!r)
              throw new LeagueSetupError(
                "An available team was not found. Reload the team list.",
              );
            return { ...r, division };
          }
          const custom = choice.custom!;
          const abbreviation = String(custom.abbreviation ?? "")
              .trim()
              .toUpperCase(),
            nickname = String(custom.nickname ?? "").trim(),
            location = String(custom.location ?? "").trim(),
            logo = String(custom.logoUrl ?? "").trim(),
            color = String(custom.primaryColor ?? "").trim();
          if (
            !/^[A-Z0-9]{2,5}$/.test(abbreviation) ||
            !nickname ||
            nickname.length > 40 ||
            location.length > 60
          )
            throw new LeagueSetupError(
              "New teams need a 2–5 character abbreviation and a nickname (up to 40 characters).",
            );
          if (logo) {
            try {
              const url = new URL(logo);
              if (!["https:", "http:"].includes(url.protocol)) throw Error();
            } catch {
              throw new LeagueSetupError(
                "Team logos must use an HTTP or HTTPS URL.",
              );
            }
          }
          if (color && !/^#[0-9a-f]{6}$/i.test(color))
            throw new LeagueSetupError(
              "Use a six-digit hex team color, such as #c10206.",
            );
          if (
            this.repo.one(
              "SELECT id FROM team_catalog WHERE abbreviation=? COLLATE NOCASE",
              abbreviation,
            )
          )
            throw new LeagueSetupError(
              `The abbreviation ${abbreviation} is already available in the team list.`,
            );
          const r = {
            id: randomUUID(),
            abbreviation,
            nickname,
            location,
            logo_url: logo || null,
            primary_color: color || null,
            default_division: division,
          };
          this.repo.insert("team_catalog", r);
          return { ...r, division };
        });
        if (
          new Set(teamRows.map((t) => t.id)).size !== teamRows.length ||
          new Set(teamRows.map((t) => key(t.abbreviation))).size !==
            teamRows.length
        )
          throw new LeagueSetupError("Each team can only be included once.");
        const leagueId = randomUUID(),
          seasonId = randomUUID(),
          settingsId = randomUUID();
        this.repo.insert("leagues", {
          id: leagueId,
          name,
          keeper_count: input.keeperCount,
          save_slot: slot,
          creation_request_id: input.requestId,
          creation_config_json: config,
        });
        const divIds = new Map(
          divisions.map((d, i) => {
            const id = randomUUID();
            this.repo.insert("divisions", {
              id,
              league_id: leagueId,
              name: d,
              display_order: i,
            });
            return [d, id];
          }),
        );
        const version = this.repo.one(
          "SELECT * FROM settings_versions WHERE id=?",
          sourceVersion,
        )!;
        this.repo.insert("settings_versions", {
          id: settingsId,
          league_id: leagueId,
          version: 1,
          label: `${name} initial settings`,
          status: "active",
          content_hash: version.content_hash,
          activated_at: new Date().toISOString(),
        });
        this.repo.insert("seasons", {
          id: seasonId,
          league_id: leagueId,
          season_number: 1,
          display_name: "Season 1",
          display_year:
            sourceSeason.display_year ?? new Date().getUTCFullYear(),
          status: "setup",
          current_stage: "regular",
          current_week: 1,
          settings_version_id: settingsId,
        });
        for (const t of teamRows) {
          const id = randomUUID();
          this.repo.insert("teams", {
            id,
            league_id: leagueId,
            default_division: t.default_division,
            catalog_team_id: t.id,
          });
          const values: RecordRow = {
            id: randomUUID(),
            season_id: seasonId,
            team_id: id,
            division_id: divIds.get(t.division),
            abbreviation: t.abbreviation,
            nickname: t.nickname,
            location: t.location,
          };
          for (const field of [
            "logo_url",
            "home_jersey_url",
            "away_jersey_url",
            "home_uniform_url",
            "away_uniform_url",
            "primary_color",
            "secondary_color",
            "third_color",
          ])
            values[field] = t[field] ?? null;
          this.repo.insert("team_seasons", values);
        }
        // Clone independent settings so tuning a new league cannot alter the old one.
        for (const row of this.repo.all(
          "SELECT * FROM configuration_tables WHERE settings_version_id=?",
          sourceVersion,
        ))
          this.repo.insert("configuration_tables", {
            ...row,
            id: randomUUID(),
            settings_version_id: settingsId,
          });
        const routeIds = new Map<string, string>(),
          depthIds = new Map<string, string>();
        for (const row of this.repo.all(
          "SELECT * FROM routes WHERE settings_version_id=? ORDER BY rowid",
          sourceVersion,
        )) {
          const id = randomUUID();
          routeIds.set(row.id, id);
          this.repo.insert("routes", {
            ...row,
            id,
            settings_version_id: settingsId,
          });
        }
        for (const row of this.repo.all(
          "SELECT * FROM route_depths WHERE settings_version_id=?",
          sourceVersion,
        )) {
          const id = randomUUID();
          depthIds.set(row.id, id);
          this.repo.insert("route_depths", {
            ...row,
            id,
            settings_version_id: settingsId,
          });
        }
        for (const row of this.repo.all(
          "SELECT * FROM route_depth_eligibility WHERE settings_version_id=?",
          sourceVersion,
        ))
          this.repo.insert("route_depth_eligibility", {
            ...row,
            settings_version_id: settingsId,
            route_id: routeIds.get(row.route_id),
            route_depth_id: depthIds.get(row.route_depth_id),
          });
        for (const table of ["openness_curve_points", "award_weights"])
          for (const row of this.repo.all(
            `SELECT * FROM ${table} WHERE settings_version_id=?`,
            sourceVersion,
          ))
            this.repo.insert(table, {
              ...row,
              settings_version_id: settingsId,
            });
        // A fresh draft pool: identities and latest traits, but no roster ownership or past stats.
        for (const player of this.repo.all(
          "SELECT * FROM players WHERE league_id=? AND retired_at IS NULL",
          sourceSeason.league_id,
        )) {
          const id = randomUUID();
          this.repo.insert("players", {
            id,
            league_id: leagueId,
            display_name: player.display_name,
          });
          const ratings = this.repo.one(
            "SELECT * FROM player_season_ratings WHERE season_id=? AND player_id=? ORDER BY version DESC LIMIT 1",
            sourceSeason.id,
            player.id,
          );
          if (ratings)
            this.repo.insert("player_season_ratings", {
              ...ratings,
              id: randomUUID(),
              season_id: seasonId,
              player_id: id,
              version: 1,
            });
          for (const alias of this.repo.all(
            "SELECT * FROM player_aliases WHERE player_id=?",
            player.id,
          ))
            this.repo.insert("player_aliases", {
              ...alias,
              id: randomUUID(),
              player_id: id,
            });
          this.repo.insert("player_team_assignments", {
            id: randomUUID(),
            season_id: seasonId,
            player_id: id,
            team_id: null,
            effective_from: new Date().toISOString(),
            status: "active",
            source: "New league draft pool",
          });
        }
        // New teams hire from an independent, league-owned coach pool.
        for (const coach of this.repo.all(
          "SELECT * FROM coaches WHERE league_id=? AND retired_at IS NULL",
          sourceSeason.league_id,
        )) {
          const id = randomUUID();
          this.repo.insert("coaches", {
            id,
            league_id: leagueId,
            display_name: coach.display_name,
            coach_type: coach.coach_type,
            image_url: coach.image_url,
          });
          const rating = this.repo.one(
            "SELECT * FROM coach_season_ratings WHERE season_id=? AND coach_id=? ORDER BY version DESC LIMIT 1",
            sourceSeason.id,
            coach.id,
          );
          if (rating)
            this.repo.insert("coach_season_ratings", {
              ...rating,
              id: randomUUID(),
              season_id: seasonId,
              coach_id: id,
              version: 1,
            });
        }
        new SeasonPreparation(
          new LeagueRepository(this.db, leagueId),
        ).initializeFirstSeason(seasonId);
        initializeDraft(this.repo, seasonId);
        for (const pref of ["default_league_id", "league_template_source_id"])
          this.db
            .prepare(
              "INSERT INTO app_preferences(key,value_json) VALUES(?,?) ON CONFLICT(key) DO NOTHING",
            )
            .run(pref, JSON.stringify(sourceSeason.league_id));
        this.repo.insert("audit_log", {
          id: randomUUID(),
          action: "league_created",
          entity_type: "league",
          entity_id: leagueId,
          season_id: seasonId,
          after_json: JSON.stringify({
            name,
            slot,
            teamCount: teamRows.length,
            divisions,
          }),
          reason: "Created from home-screen league setup",
        });
        return this.leagues().find((l) => l.id === leagueId)!;
      })
      .immediate();
  }
}
