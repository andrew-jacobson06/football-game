import type { LeagueTab } from "./types";

export const LEAGUE_TABS: Array<{ id: LeagueTab; label: string }> = [
  { id: "news", label: "Home" },
  { id: "scores", label: "Scores" },
  { id: "schedules", label: "Schedule" },
  { id: "standings", label: "Standings" },
  { id: "stats", label: "Stats" },
  { id: "draft", label: "Draft" },
];

export const PLACEHOLDER_LOGOS = {
  home: "https://via.placeholder.com/96/1e1e1e/F5F5F5?text=HOME",
  away: "https://via.placeholder.com/96/1e1e1e/F5F5F5?text=AWAY",
  team: "https://via.placeholder.com/24",
};
