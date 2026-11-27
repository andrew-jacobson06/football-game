import {
  canAdvanceSeasonWeek,
  seasonWeekLabel,
  type SeasonWeek,
} from "./seasonWeeks";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  advanceSeason,
  getLeagueSlots,
  getSeasonPreparation,
  getGames,
  getPlayers,
  getSeason,
  getStandings,
  getTeams,
} from "../../api/client";
import type { LeagueSummary } from "../../api/client";
import type { Player } from "../players/types";
import type { LeagueGame, LeagueTab, LeagueTeam } from "./types";
import { mergeStandingsWithTeams, normalizeGames } from "./leagueMappers";
import { LeagueHeader } from "./LeagueHeader";
import { LeagueNews } from "./LeagueNews";
import { LeagueSchedule } from "./LeagueSchedule";
import { LeagueSchedules } from "./LeagueSchedules";
import { LeagueStandings } from "./LeagueStandings";
import { LeaguePlayoffs } from "./LeaguePlayoffs";
import { LeagueAwards } from "./LeagueAwards";
import { LeagueStats } from "./LeagueStats";
import { GameCenter } from "./GameCenter";
import { GamesBanner } from "./GamesBanner";
import { TeamDetail } from "./TeamDetail";
import { SeasonPreparation } from "./SeasonPreparation";
import { AdvanceYear } from "./AdvanceYear";
import "./league.css";
type LeagueAppScreenProps = {
  onBack?: () => void;
  league: LeagueSummary;
};

export function LeagueAppScreen({
  onBack,
  league: initialLeague,
}: LeagueAppScreenProps) {
  const [league, setLeague] = useState(initialLeague);
  const [canAdvanceYear, setCanAdvanceYear] = useState(false);
  const [showAdvanceYear, setShowAdvanceYear] = useState(false);
  const [activeTab, setActiveTab] = useState<LeagueTab>(
    league.status === "setup" ? "news" : "scores",
  );
  const [games, setGames] = useState<LeagueGame[]>([]);
  const [teams, setTeams] = useState<LeagueTeam[]>([]);
  const [standings, setStandings] = useState<LeagueTeam[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [seasonWeek, setSeasonWeek] = useState<SeasonWeek | null>(null);
  const [loadError, setLoadError] = useState("");
  const [isAdvancingWeek, setIsAdvancingWeek] = useState(false);
  const [advanceWeekError, setAdvanceWeekError] = useState("");
  const [searchedPlayer, setSearchedPlayer] = useState<Player | null>(null);
  const [selectedGame, setSelectedGame] = useState<LeagueGame | null>(null);
  const [selectedTeam, setSelectedTeam] = useState<LeagueTeam | null>(null);
  const [loadingGame, setLoadingGame] = useState<LeagueGame | null>(null);
  const [isExitingGameLoad, setIsExitingGameLoad] = useState(false);
  const gameLoadTimeout = useRef<number | null>(null);
  const refreshLeagueData = useCallback(
    () =>
      Promise.all([
        getGames(),
        getStandings(),
        getTeams(),
        getPlayers(),
        getSeason(),
        getLeagueSlots(),
        getSeasonPreparation(),
      ]).then(
        ([
          gamesResponse,
          standingsResponse,
          teamsResponse,
          playersResponse,
          seasonResponse,
          slotsResponse,
          preparation,
        ]) => {
          const sheetTeams = teamsResponse.teams as LeagueTeam[];
          setTeams(sheetTeams);
          setGames(normalizeGames(gamesResponse.games, sheetTeams));
          setStandings(
            mergeStandingsWithTeams(
              standingsResponse.standings as LeagueTeam[],
              sheetTeams,
            ),
          );
          setPlayers(playersResponse.players);
          setSeasonWeek(seasonResponse.week);
          setLeague(
            slotsResponse.leagues.find((l) => l.id === initialLeague.id) ??
              initialLeague,
          );
          setCanAdvanceYear(preparation.canAdvanceSeason);
        },
      ),
    [initialLeague],
  );

  useEffect(() => {
    refreshLeagueData().catch((error: unknown) => {
      setLoadError(
        error instanceof Error ? error.message : "Unable to load this league.",
      );
    });
  }, [refreshLeagueData]);

  const canAdvanceWeek =
    league.status !== "setup" && canAdvanceSeasonWeek(seasonWeek, games);
  const handleAdvanceWeek = async () => {
    setIsAdvancingWeek(true);
    setAdvanceWeekError("");
    try {
      await advanceSeason();
      await refreshLeagueData();
    } catch (error) {
      setAdvanceWeekError(
        error instanceof Error
          ? error.message
          : "Failed to advance the season week",
      );
    } finally {
      setIsAdvancingWeek(false);
    }
  };

  useEffect(() => {
    return () => {
      if (gameLoadTimeout.current !== null) {
        window.clearTimeout(gameLoadTimeout.current);
      }
    };
  }, []);

  const openGame = (game: LeagueGame) => {
    if (gameLoadTimeout.current !== null) {
      window.clearTimeout(gameLoadTimeout.current);
    }

    setSelectedGame(null);
    setIsExitingGameLoad(false);
    setLoadingGame(game);

    gameLoadTimeout.current = window.setTimeout(() => {
      setIsExitingGameLoad(true);
      gameLoadTimeout.current = window.setTimeout(() => {
        setSelectedGame(game);
        setLoadingGame(null);
        setIsExitingGameLoad(false);
      }, 1800);
    }, 850);
  };

  const completeGameLoad = () => {
    if (!loadingGame) return;

    if (gameLoadTimeout.current !== null) {
      window.clearTimeout(gameLoadTimeout.current);
      gameLoadTimeout.current = null;
    }

    setSelectedGame(loadingGame);
    setLoadingGame(null);
    setIsExitingGameLoad(false);
  };

  const returnToLeagueHome = () => {
    if (gameLoadTimeout.current !== null) {
      window.clearTimeout(gameLoadTimeout.current);
      gameLoadTimeout.current = null;
    }
    setSelectedGame(null);
    setSelectedTeam(null);
    setLoadingGame(null);
    setIsExitingGameLoad(false);
    setActiveTab("scores");
    void refreshLeagueData().catch((e) =>
      setLoadError(
        e instanceof Error ? e.message : "Unable to refresh league data.",
      ),
    );
  };

  const updateLiveGame = (updatedGame: LeagueGame) => {
    setGames((current) =>
      current.map((item) =>
        String(item.GameId) === String(updatedGame.GameId)
          ? { ...item, ...updatedGame }
          : item,
      ),
    );
  };

  const closeGame = () => {
    setSelectedGame(null);
    void refreshLeagueData().catch((e) =>
      setLoadError(
        e instanceof Error ? e.message : "Unable to refresh league data.",
      ),
    );
  };

  const searchablePlayers = useMemo(
    () =>
      players.map((player) => {
        const team = teams.find((candidate) =>
          [candidate.Abbrev, candidate.Team, candidate.Name].some(
            (value) =>
              String(value || "")
                .trim()
                .toLocaleLowerCase() ===
              String(player.Team || "")
                .trim()
                .toLocaleLowerCase(),
          ),
        );
        return {
          ...player,
          jersey: String(team?.["Away Jersey Crop"] || player.jersey || ""),
        };
      }),
    [players, teams],
  );

  const openSearchedPlayer = (player: Player) => {
    setSearchedPlayer(player);
    setActiveTab("stats");
  };

  if (selectedGame)
    return (
      <section className="league-app">
        <GamesBanner
          games={games}
          currentWeek={seasonWeek}
          onHome={returnToLeagueHome}
          onSelectGame={openGame}
        />
        <GameCenter
          game={selectedGame}
          onBack={closeGame}
          onGameUpdate={updateLiveGame}
        />
      </section>
    );
  if (selectedTeam)
    return (
      <section className="league-app">
        <GamesBanner
          games={games}
          currentWeek={seasonWeek}
          onHome={returnToLeagueHome}
          onSelectGame={openGame}
        />
        <TeamDetail
          team={selectedTeam}
          standings={standings}
          games={games}
          onBack={() => setSelectedTeam(null)}
          onGame={openGame}
        />
      </section>
    );
  return (
    <section className="league-app">
      <div className="app-loading hidden">
        <div className="app-spinner">
          <span className="app-football">🏈</span>
        </div>
        <div className="loading-text">Loading Games...</div>
      </div>
      {loadingGame && (
        <div
          id="loadingScreen"
          className={`loading-screen ${isExitingGameLoad ? "exit-zoom" : ""}`}
          onAnimationEnd={(event) => {
            if (
              event.currentTarget === event.target &&
              event.animationName === "zoom-in"
            ) {
              completeGameLoad();
            }
          }}
        >
          <div className="logo-container">
            <img
              id="loadingHomeLogo"
              className={`loading-logo ${
                isExitingGameLoad ? "unclash-left" : "animate-left"
              }`}
              src={loadingGame.HomeLogo || "https://via.placeholder.com/150"}
              alt={`${loadingGame.Home} Logo`}
            />
            <img
              id="loadingAwayLogo"
              className={`loading-logo ${
                isExitingGameLoad ? "unclash-right" : "animate-right"
              }`}
              src={loadingGame.AwayLogo || "https://via.placeholder.com/150"}
              alt={`${loadingGame.Away} Logo`}
            />
          </div>
          <img
            src="https://andrew-jacobson06.github.io/public-audio/loading-football.gif"
            alt="Loading"
            className="loading-football"
          />
        </div>
      )}
      {!loadingGame && (
        <>
          <div className="league-context-bar">
            {onBack && (
              <button
                className="league-context-bar__back"
                type="button"
                onClick={onBack}
              >
                ← Back
              </button>
            )}
            <span>
              <strong>{league.name}</strong>
              <small>
                Season {league.seasonNumber}
                {league.status === "setup" ? " · Draft setup" : ""}
              </small>
            </span>
          </div>
          <GamesBanner
            games={games}
            currentWeek={seasonWeek}
            onHome={returnToLeagueHome}
            onSelectGame={openGame}
          />
          <LeagueHeader
            activeTab={activeTab}
            onTabChange={setActiveTab}
            teams={teams}
            players={searchablePlayers}
            onTeam={setSelectedTeam}
            onPlayer={openSearchedPlayer}
          />
          {showAdvanceYear && (
            <AdvanceYear
              league={league}
              onClose={() => setShowAdvanceYear(false)}
              onAdvanced={async () => {
                await refreshLeagueData();
                setSelectedGame(null);
                setSelectedTeam(null);
                setSearchedPlayer(null);
                setActiveTab("draft");
              }}
            />
          )}
          <div id="tabContents">
            {canAdvanceYear && (
              <section className="advance-week">
                <div>
                  <span>NATIONAL CHAMPIONSHIP COMPLETE</span>
                  <h2>Start a new year</h2>
                </div>
                <button type="button" onClick={() => setShowAdvanceYear(true)}>
                  Advance Season
                </button>
              </section>
            )}
            {loadError && (
              <section className="league-setup-home" role="alert">
                <h2>Unable to load this league</h2>
                <p>{loadError}</p>
                <button
                  type="button"
                  onClick={() => {
                    setLoadError("");
                    void refreshLeagueData().catch((e) =>
                      setLoadError(e.message),
                    );
                  }}
                >
                  Try again
                </button>
              </section>
            )}
            {league.status === "setup" &&
              (activeTab === "scores" || activeTab === "news") && (
                <section
                  className="league-setup-home"
                  aria-labelledby="new-league-title"
                >
                  <span className="league-setup-home__eyebrow">
                    Season {league.seasonNumber} / Season setup
                  </span>
                  <h1 id="new-league-title">{league.name}</h1>
                  <p>
                    {teams.length || league.teamCount} teams. A fresh start.
                    Prepare your teams for the draft.
                  </p>
                  <p>
                    {league.seasonNumber === 1
                      ? "Assign coaches before drafting from the free-agent pool."
                      : "Choose keepers and coaching decisions, then hire any replacement coaches."}{" "}
                    The schedule is empty.
                  </p>
                  <button type="button" onClick={() => setActiveTab("draft")}>
                    Go to Draft →
                  </button>
                </section>
              )}
            {activeTab === "news" && league.status !== "setup" && (
              <div className="league-tab-content active">
                <LeagueNews />
              </div>
            )}
            {activeTab === "scores" && (
              <div className="league-tab-content active">
                {canAdvanceWeek && (
                  <section
                    className="advance-week"
                    aria-labelledby="advance-week-title"
                  >
                    <div>
                      <span>
                        {seasonWeekLabel(seasonWeek).toUpperCase()} COMPLETE
                      </span>
                      <h2 id="advance-week-title">Ready for the next week?</h2>
                    </div>
                    <button
                      type="button"
                      onClick={handleAdvanceWeek}
                      disabled={isAdvancingWeek}
                    >
                      {isAdvancingWeek ? "Advancing…" : "Advance Week"}
                    </button>
                  </section>
                )}
                {advanceWeekError && (
                  <p className="advance-week__error" role="alert">
                    {advanceWeekError}
                  </p>
                )}
                {league.status !== "setup" && (
                  <LeagueSchedule
                    games={games}
                    currentWeek={seasonWeek}
                    onSelectGame={openGame}
                  />
                )}
              </div>
            )}
            {activeTab === "schedules" && (
              <div className="league-tab-content active">
                <LeagueSchedules
                  games={games}
                  teams={teams}
                  currentWeek={seasonWeek}
                  onSelectGame={openGame}
                  onSelectTeam={setSelectedTeam}
                />
              </div>
            )}
            {activeTab === "standings" && (
              <div className="league-tab-content active">
                <LeagueStandings
                  teams={standings}
                  games={games}
                  onSelectTeam={setSelectedTeam}
                />
              </div>
            )}
            {activeTab === "playoffs" && (
              <div className="league-tab-content active">
                <LeaguePlayoffs
                  postseason={typeof seasonWeek === "string"}
                  teams={teams}
                  games={games}
                  onTeam={setSelectedTeam}
                  onGame={openGame}
                />
              </div>
            )}
            {activeTab === "awards" && (
              <div className="league-tab-content active">
                <LeagueAwards postseason={typeof seasonWeek === "string"} />
              </div>
            )}
            {activeTab === "stats" && (
              <div className="league-tab-content active">
                <LeagueStats
                  key={`${searchedPlayer?.Name || "leaders"}-${searchedPlayer?.Team || ""}`}
                  teams={teams}
                  games={games}
                  onTeam={setSelectedTeam}
                  requestedPlayer={searchedPlayer}
                  onPlayerClose={() => setSearchedPlayer(null)}
                />
              </div>
            )}
            {activeTab === "draft" && (
              <div className="league-tab-content active">
                <SeasonPreparation
                  key={league.seasonId}
                  onUpdated={refreshLeagueData}
                />
              </div>
            )}
          </div>
        </>
      )}
    </section>
  );
}
