import { useEffect, useRef, useState } from "react";
import { getGames, getStandings, getTeams } from "../../api/client";
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
  const [selectedGame, setSelectedGame] = useState<LeagueGame | null>(null);
  const [selectedTeam, setSelectedTeam] = useState<LeagueTeam | null>(null);
  const [loadingGame, setLoadingGame] = useState<LeagueGame | null>(null);
  const [isExitingGameLoad, setIsExitingGameLoad] = useState(false);
  const gameLoadTimeout = useRef<number | null>(null);
  useEffect(() => {
    Promise.all([getGames(), getStandings(), getTeams()])
      .then(([gamesResponse, standingsResponse, teamsResponse]) => {
        const sheetTeams = teamsResponse.teams as LeagueTeam[];
        setTeams(sheetTeams);
        setGames(normalizeGames(gamesResponse.games, sheetTeams));
        setStandings(
          mergeStandingsWithTeams(
            standingsResponse.standings as LeagueTeam[],
            sheetTeams,
          ),
        );
      })
      .catch(() => {
        setGames(normalizeGames(mockGames, mockTeams));
        setTeams(mockTeams);
        setStandings(mockTeams);
      });
  }, []);

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

  if (selectedGame)
    return (
      <section className="league-app">
        <GamesBanner games={games} />
        <GameCenter game={selectedGame} onBack={() => setSelectedGame(null)} />
      </section>
    );
  if (selectedTeam)
    return (
      <section className="league-app">
        <GamesBanner games={games} />
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
          <GamesBanner games={games} />
          <LeagueHeader activeTab={activeTab} onTabChange={setActiveTab} />
          <div id="tabContents">
            {activeTab === "news" && (
              <div className="league-tab-content active">
                <LeagueNews />
              </div>
            )}
            {activeTab === "scores" && (
              <div className="league-tab-content active">
                <LeagueSchedule games={games} onSelectGame={openGame} />
              </div>
            )}
            {activeTab === "schedules" && (
              <div className="league-tab-content active">
                <LeagueSchedules games={games} teams={teams} onSelectGame={openGame} onSelectTeam={setSelectedTeam} />
              </div>
            )}
            {activeTab === "standings" && (
              <div className="league-tab-content active">
                <LeagueStandings teams={standings} onSelectTeam={setSelectedTeam} />
              </div>
            )}
            {activeTab === "stats" && (
              <div className="league-tab-content active">
                <LeagueStats teams={teams} />
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
