import client from "./client";

export interface PlayerStatRow {
  PLAYER_ID: number;
  PLAYER_NAME: string;
  POSITION: string;
  TEAM_ID: number;
  TEAM_ABBREVIATION: string;
  AGE: number;
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

export interface PlayerListItem {
  id: number;
  full_name: string;
  first_name: string;
  last_name: string;
  is_active: boolean;
}

export async function fetchPlayerStats(params: {
  season?: string;
  season_type?: string;
  measure_type?: string;
  per_mode?: string;
}): Promise<PlayerStatRow[]> {
  const { data } = await client.get("/api/players/stats", { params });
  return data;
}

export async function fetchAllPlayers(): Promise<PlayerListItem[]> {
  const { data } = await client.get("/api/players");
  return data;
}

export async function fetchPlayerCareer(playerId: number) {
  const { data } = await client.get(`/api/players/${playerId}/career`);
  return data;
}

export async function fetchPlayerSearch(name: string): Promise<PlayerListItem[]> {
  const { data } = await client.get("/api/players/search", { params: { q: name } });
  return data;
}

export async function fetchPlayerGamelog(
  playerId: number,
  season = "2025-26",
  lastN = 5,
): Promise<Record<string, unknown>[]> {
  const { data } = await client.get(`/api/players/${playerId}/gamelog`, {
    params: { season, last_n: lastN },
  });
  return data;
}
