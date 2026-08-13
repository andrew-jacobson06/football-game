import { useEffect, useMemo, useRef, useState } from "react";
import { advanceSeason, getGames, getPlayers, getSeason, getStandings, getTeams } from "../../api/client";
import type { Player } from "../players/types";
import type { LeagueGame, LeagueTab, LeagueTeam } from "./types";
import { mockGames, mockTeams } from "./leagueMockData";
import { mergeStandingsWithTeams, normalizeGames } from "./leagueMappers";
import { LeagueHeader } from "./LeagueHeader";
import { LeagueNews } from "./LeagueNews";
import { LeagueSchedule } from "./LeagueSchedule";
import { LeagueSchedules } from "./LeagueSchedules";
import { LeagueStandings } from "./LeagueStandings";
import { LeagueStats } from "./LeagueStats";
import { GameCenter } from "./GameCenter";
import { GamesBanner } from "./GamesBanner";
import { TeamDetail } from "./TeamDetail";
import "./league.css";
type LeagueAppScreenProps = {
  onBack?: () => void;
};

export function LeagueAppScreen({ onBack }: LeagueAppScreenProps) {
  const [activeTab, setActiveTab] = useState<LeagueTab>("scores");
  const [games, setGames] = useState<LeagueGame[]>(mockGames);
  const [teams, setTeams] = useState<LeagueTeam[]>(mockTeams);
  const [standings, setStandings] = useState<LeagueTeam[]>(mockTeams);
  const [players, setPlayers] = useState<Player[]>([]);
  const [seasonWeek, setSeasonWeek] = useState<number | null>(null);
  const [isAdvancingWeek, setIsAdvancingWeek] = useState(false);
  const [advanceWeekError, setAdvanceWeekError] = useState("");
  const [searchedPlayer, setSearchedPlayer] = useState<Player | null>(null);
  const [selectedGame, setSelectedGame] = useState<LeagueGame | null>(null);
  const [selectedTeam, setSelectedTeam] = useState<LeagueTeam | null>(null);
  const [loadingGame, setLoadingGame] = useState<LeagueGame | null>(null);
  const [isExitingGameLoad, setIsExitingGameLoad] = useState(false);
  const gameLoadTimeout = useRef<number | null>(null);
  const refreshGames = () =>
    getGames().then((response) => {
      setGames((current) => normalizeGames(response.games, teams.length ? teams : mockTeams).map((game) => ({
        ...current.find((item) => String(item.GameId) === String(game.GameId)),
        ...game,
      })));
    });
  const refreshLeagueData = () =>
    Promise.all([getGames(), getStandings(), getTeams(), getPlayers(), getSeason()])
      .then(([gamesResponse, standingsResponse, teamsResponse, playersResponse, seasonResponse]) => {
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
      });

  useEffect(() => {
    refreshLeagueData()
      .catch(() => {
        setGames(normalizeGames(mockGames, mockTeams));
        setTeams(mockTeams);
        setStandings(mockTeams);
      })
  }, []);

  const currentWeekGames = seasonWeek === null ? [] : games.filter((game) => Number(game.Week) === seasonWeek);
  const canAdvanceWeek = currentWeekGames.length > 0 && currentWeekGames.every((game) => String(game.Qtr).trim().toUpperCase() === "FINAL");
  const handleAdvanceWeek = async () => {
    setIsAdvancingWeek(true);
    setAdvanceWeekError("");
    try {
      await advanceSeason();
      await refreshLeagueData();
    } catch (error) {
      setAdvanceWeekError(error instanceof Error ? error.message : "Failed to advance the season week");
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
    void refreshGames().catch(() => undefined);
  };

  const updateLiveGame = (updatedGame: LeagueGame) => {
    setGames((current) => current.map((item) =>
      String(item.GameId) === String(updatedGame.GameId) ? { ...item, ...updatedGame } : item,
    ));
  };

  const closeGame = () => {
    setSelectedGame(null);
    void refreshGames().catch(() => undefined);
  };

  const searchablePlayers = useMemo(() => players.map((player) => {
    const team = teams.find((candidate) => [candidate.Abbrev, candidate.Team, candidate.Name]
      .some((value) => String(value || "").trim().toLocaleLowerCase() === String(player.Team || "").trim().toLocaleLowerCase()));
    return { ...player, jersey: String(team?.["Away Jersey Crop"] || player.jersey || "") };
  }), [players, teams]);

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
        <GameCenter game={selectedGame} onBack={closeGame} onGameUpdate={updateLiveGame} />
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
        <TeamDetail team={selectedTeam} standings={standings} games={games} onBack={() => setSelectedTeam(null)} onGame={openGame} />
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
          {onBack && (
            <button
              className="back-button league-app__back"
              type="button"
              onClick={onBack}
            >
              ← Back
            </button>
          )}
          <GamesBanner
            games={games}
            currentWeek={seasonWeek}
            onHome={returnToLeagueHome}
            onSelectGame={openGame}
          />
          <LeagueHeader activeTab={activeTab} onTabChange={setActiveTab} teams={teams} players={searchablePlayers} onTeam={setSelectedTeam} onPlayer={openSearchedPlayer} />
          <div id="tabContents">
            {activeTab === "news" && (
              <div className="league-tab-content active">
                <LeagueNews />
              </div>
            )}
            {activeTab === "scores" && (
              <div className="league-tab-content active">
                {canAdvanceWeek && (
                  <section className="advance-week" aria-labelledby="advance-week-title">
                    <div><span>WEEK {seasonWeek} COMPLETE</span><h2 id="advance-week-title">Ready for the next week?</h2></div>
                    <button type="button" onClick={handleAdvanceWeek} disabled={isAdvancingWeek}>{isAdvancingWeek ? "Advancing…" : "Advance Week"}</button>
                  </section>
                )}
                {advanceWeekError && <p className="advance-week__error" role="alert">{advanceWeekError}</p>}
                <LeagueSchedule games={games} currentWeek={seasonWeek} onSelectGame={openGame} />
              </div>
            )}
            {activeTab === "schedules" && (
              <div className="league-tab-content active">
                <LeagueSchedules games={games} teams={teams} currentWeek={seasonWeek} onSelectGame={openGame} onSelectTeam={setSelectedTeam} />
              </div>
            )}
            {activeTab === "standings" && (
              <div className="league-tab-content active">
                <LeagueStandings teams={standings} onSelectTeam={setSelectedTeam} />
              </div>
            )}
            {activeTab === "stats" && (
              <div className="league-tab-content active">
                <LeagueStats key={`${searchedPlayer?.Name || "leaders"}-${searchedPlayer?.Team || ""}`} teams={teams} games={games} onTeam={setSelectedTeam} requestedPlayer={searchedPlayer} onPlayerClose={() => setSearchedPlayer(null)} />
              </div>
            )}
            {activeTab === "draft" && (
              <div className="league-tab-content active">
                <div className="coming-soon">Draft coming soon...</div>
              </div>
            )}
          </div>
        </>
      )}
    </section>
  );
}
