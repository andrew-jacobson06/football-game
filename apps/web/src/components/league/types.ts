export type LeagueTab = "news" | "scores" | "standings" | "stats" | "draft";
export type GameTab = "gamecast" | "playbyplay" | "boxscore" | "teamstats";

export type LeagueGame = {
  GameId: string | number;
  Home: string;
  Away: string;
  HomeScore: string | number;
  AwayScore: string | number;
  Qtr: string | number;
  Time: string | number;
  Down: string | number;
  Distance: string | number;
  BallOn: string | number;
  Possession: "Home" | "Away" | string;
  HomeLogo?: string;
  AwayLogo?: string;
  Week?: string | number;
  Date?: string;
  StartTime?: string;
};

export type LeagueTeam = Record<string, string | number | undefined> & {
  Team?: string;
  Name?: string;
  Division?: string;
  Logo?: string;
  Wins?: string | number;
  Losses?: string | number;
  Ties?: string | number;
  PF?: string | number;
  PA?: string | number;
  Streak?: string;
};
