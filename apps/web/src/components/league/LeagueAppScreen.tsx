import { useEffect, useState } from "react";
import { getGames, getTeams } from "../../api/client";
import type { LeagueGame, LeagueTab, LeagueTeam } from "./types";
import { mockGames, mockTeams } from "./leagueMockData";
import { normalizeGames } from "./leagueMappers";
import { LeagueHeader } from "./LeagueHeader";
import { LeagueNews } from "./LeagueNews";
import { LeagueSchedule } from "./LeagueSchedule";
import { LeagueStandings } from "./LeagueStandings";
import { LeagueStats } from "./LeagueStats";
import { GameCenter } from "./GameCenter";
import "./league.css";
export function LeagueAppScreen() {
  const [activeTab, setActiveTab] = useState<LeagueTab>("scores");
  const [games, setGames] = useState<LeagueGame[]>(mockGames);
  const [teams, setTeams] = useState<LeagueTeam[]>(mockTeams);
  const [selectedGame, setSelectedGame] = useState<LeagueGame | null>(null);
  useEffect(() => {
    getGames()
      .then(({ games }) => setGames(normalizeGames(games)))
      .catch(() => setGames(mockGames));
    getTeams()
      .then(({ teams }) => setTeams(teams as LeagueTeam[]))
      .catch(() => setTeams(mockTeams));
  }, []);
  if (selectedGame)
    return (
      <section className="league-app">
        <GameCenter game={selectedGame} onBack={() => setSelectedGame(null)} />
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
      <LeagueHeader activeTab={activeTab} onTabChange={setActiveTab} />
      <div id="tabContents">
        {activeTab === "news" && (
          <div className="league-tab-content active">
            <LeagueNews />
          </div>
        )}
        {activeTab === "scores" && (
          <div className="league-tab-content active">
            <LeagueSchedule games={games} onSelectGame={setSelectedGame} />
          </div>
        )}
        {activeTab === "standings" && (
          <div className="league-tab-content active">
            <LeagueStandings teams={teams} />
          </div>
        )}
        {activeTab === "stats" && (
          <div className="league-tab-content active">
            <LeagueStats />
          </div>
        )}
        {activeTab === "draft" && (
          <div className="league-tab-content active">
            <div className="coming-soon">Draft coming soon...</div>
          </div>
        )}
      </div>
    </section>
  );
}
