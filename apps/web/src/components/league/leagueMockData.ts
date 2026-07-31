import type { LeagueGame, LeagueTeam } from "./types";

// TODO: Replace fallback games with the read-only Games sheet API when local Sheets credentials are unavailable.
export const mockGames: LeagueGame[] = [
  {
    GameId: 1,
    Week: 1,
    Date: "Sunday, September 6",
    Kickoff: "1:00 PM",
    Network: "AFL Network",
    Home: "LV",
    Away: "DEN",
    HomeScore: 14,
    AwayScore: 17,
    Qtr: 3,
    Time: "5:42",
    Down: 2,
    Distance: 7,
    BallOn: 64,
    Possession: "Home",
  },
  {
    GameId: 2,
    Week: 2,
    Date: "Sunday, September 13",
    Kickoff: "4:25 PM",
    Network: "AFL Network",
    Home: "CHI",
    Away: "GB",
    HomeScore: 24,
    AwayScore: 21,
    Qtr: "FINAL",
    Time: "0:00",
    Down: 1,
    Distance: 10,
    BallOn: 50,
    Possession: "Away",
  },
];

// TODO: Replace fallback standings with the Teams sheet through /api/teams in production-like local runs.
export const mockTeams: LeagueTeam[] = [
  {
    Team: "Denver",
    Division: "West",
    Wins: 5,
    Losses: 3,
    Ties: 0,
    PF: 188,
    PA: 144,
    Streak: "W2",
  },
  {
    Team: "Las Vegas",
    Division: "West",
    Wins: 2,
    Losses: 6,
    Ties: 0,
    PF: 132,
    PA: 201,
    Streak: "L1",
  },
  {
    Team: "Green Bay",
    Division: "North",
    Wins: 4,
    Losses: 4,
    Ties: 0,
    PF: 171,
    PA: 170,
    Streak: "L1",
  },
];
