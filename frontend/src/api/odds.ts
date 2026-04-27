import client from "./client";

export interface H2H {
  home_odds: number;
  away_odds: number;
  home_win_pct: number;
  away_win_pct: number;
}

export interface Spread {
  home_spread: number;
  away_spread: number;
  home_odds: number;
  away_odds: number;
}

export interface Total {
  line: number;
  over_odds: number;
  under_odds: number;
}

export interface GameOdds {
  id: string;
  home_team: string;
  away_team: string;
  commence_time: string;
  h2h: H2H | null;
  spread: Spread | null;
  total: Total | null;
}

export interface PropLine {
  line: number;
  over_odds: number;
  under_odds: number;
}

export interface PlayerProps {
  player: string;
  game_id: string;
  home_team: string;
  away_team: string;
  commence_time: string;
  props: {
    points?: PropLine;
    rebounds?: PropLine;
    assists?: PropLine;
  };
}

export interface StatResult {
  value: number;
  hit: boolean;
}

export interface StatSummary {
  line: number;
  hits: number;
  games: number;
  results: StatResult[];
}

export interface Recommendation {
  player: string;
  away_team: string;
  home_team: string;
  best_stat: "points" | "rebounds" | "assists";
  best_line: number;
  best_hits: number;
  games_checked: number;
  best_results: StatResult[];
  all_stats: {
    points?: StatSummary;
    rebounds?: StatSummary;
    assists?: StatSummary;
  };
}

export async function fetchTodayGames(): Promise<GameOdds[]> {
  const { data } = await client.get("/api/odds/games");
  return data;
}

export async function fetchTodayProps(): Promise<PlayerProps[]> {
  const { data } = await client.get("/api/odds/props");
  return data;
}

export async function fetchRecommendations(season = "2025-26"): Promise<Recommendation[]> {
  const { data } = await client.get("/api/odds/recommendations", { params: { season } });
  return data;
}
