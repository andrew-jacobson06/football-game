import type { LeagueGame, LeagueTeam } from "./types";

// TODO: Replace fallback games with the read-only Games sheet API when local Sheets credentials are unavailable.
export const mockGames: LeagueGame[] = [
  {
    GameId: 1,
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
    Week: 1,
    Date: "Sun, Sep 13",
  },
  {
    GameId: 2,
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
    Week: 1,
    Date: "Sun, Sep 13",
  },
  {
    GameId: 3, Home: "Denver", Away: "Green Bay", HomeScore: 0, AwayScore: 0,
    Qtr: 1, Time: "4:25 PM", Down: 1, Distance: 10, BallOn: 50, Possession: "Home",
    Week: 2, Date: "Sun, Sep 20",
  },
  {
    GameId: 4, Home: "Las Vegas", Away: "Chicago", HomeScore: 0, AwayScore: 0,
    Qtr: 1, Time: "8:20 PM", Down: 1, Distance: 10, BallOn: 50, Possession: "Away",
    Week: 2, Date: "Sun, Sep 20",
  },
  {
    GameId: 5, Home: "Chicago", Away: "Denver", HomeScore: 20, AwayScore: 27,
    Qtr: "FINAL", Time: "0:00", Down: 1, Distance: 10, BallOn: 50, Possession: "Home",
    Week: 3, Date: "Sun, Sep 27",
  },
  {
    GameId: 6, Home: "Green Bay", Away: "Las Vegas", HomeScore: 31, AwayScore: 16,
    Qtr: "FINAL", Time: "0:00", Down: 1, Distance: 10, BallOn: 50, Possession: "Home",
    Week: 4, Date: "Sun, Oct 4",
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
