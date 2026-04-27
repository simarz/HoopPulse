import client from "./client";

export interface TeamStatRow {
  TEAM_ID: number;
  TEAM_NAME: string;
  TEAM_ABBREVIATION: string;
  GP: number;
  W: number;
  L: number;
  W_PCT: number;
  MIN: number;
  // Base
  FGM?: number;
  FGA?: number;
  FG_PCT?: number;
  FG3M?: number;
  FG3A?: number;
  FG3_PCT?: number;
  FTM?: number;
  FTA?: number;
  FT_PCT?: number;
  OREB?: number;
  DREB?: number;
  REB?: number;
  AST?: number;
  TOV?: number;
  STL?: number;
  BLK?: number;
  PF?: number;
  PTS?: number;
  PLUS_MINUS?: number;
  // Advanced
  OFF_RATING?: number;
  DEF_RATING?: number;
  NET_RATING?: number;
  AST_PCT?: number;
  AST_TO?: number;
  AST_RATIO?: number;
  OREB_PCT?: number;
  DREB_PCT?: number;
  REB_PCT?: number;
  USG_PCT?: number;
  EFG_PCT?: number;
  TS_PCT?: number;
  PIE?: number;
  PACE?: number;
  [key: string]: unknown;
}

export async function fetchTeamStats(params: {
  season?: string;
  season_type?: string;
  measure_type?: string;
  per_mode?: string;
}): Promise<TeamStatRow[]> {
  const { data } = await client.get("/api/teams/stats", { params });
  return data;
}

export async function fetchAllTeams() {
  const { data } = await client.get("/api/teams");
  return data;
}
