import type { LeagueTab } from "./types";
import { LEAGUE_TABS } from "./leagueConstants";
import { LeagueSearch } from "./LeagueSearch";
import type { Player } from "../players/types";
import type { LeagueTeam } from "./types";

export function LeagueHeader({
  activeTab,
  onTabChange,
  teams,
  players,
  onTeam,
  onPlayer,
}: {
  activeTab: LeagueTab;
  onTabChange: (tab: LeagueTab) => void;
  teams: LeagueTeam[];
  players: Player[];
  onTeam: (team: LeagueTeam) => void;
  onPlayer: (player: Player) => void;
}) {
  return (
    <div className="league-header">
      <LeagueSearch teams={teams} players={players} onTeam={onTeam} onPlayer={onPlayer} onArticle={(index) => { onTabChange("news"); window.setTimeout(() => document.getElementById(`article-${index}`)?.scrollIntoView({ behavior: "smooth", block: "center" }), 0); }} />
      <nav className="nav-tabs" aria-label="League tabs">
        {LEAGUE_TABS.map((tab) => (
          <button
            key={tab.id}
            className={`nav-tab ${activeTab === tab.id ? "active" : ""}`}
            type="button"
            onClick={() => onTabChange(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </nav>
    </div>
  );
}
