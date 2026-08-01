import type { LeagueTab } from "./types";
import { LEAGUE_TABS } from "./leagueConstants";

export function LeagueHeader({
  activeTab,
  onTabChange,
}: {
  activeTab: LeagueTab;
  onTabChange: (tab: LeagueTab) => void;
}) {
  return (
    <div className="league-header">
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
