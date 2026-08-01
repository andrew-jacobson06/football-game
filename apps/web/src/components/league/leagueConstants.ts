import type { LeagueTab } from "./types";

export const LEAGUE_TABS: Array<{ id: LeagueTab; label: string }> = [
  { id: "news", label: "NEWS" },
  { id: "scores", label: "SCORES" },
  { id: "schedules", label: "SCHEDULES" },
  { id: "standings", label: "STANDINGS" },
  { id: "stats", label: "STATS" },
  { id: "draft", label: "DRAFT" },
];

export const PLACEHOLDER_LOGOS = {
  home: "https://via.placeholder.com/96/1e1e1e/F5F5F5?text=HOME",
  away: "https://via.placeholder.com/96/1e1e1e/F5F5F5?text=AWAY",
  team: "https://via.placeholder.com/24",
};
