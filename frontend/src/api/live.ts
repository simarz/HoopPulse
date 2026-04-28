import client from "./client";

export async function fetchScoreboard() {
  const { data } = await client.get("/api/live/scoreboard");
  return data;
}

export async function fetchBoxscore(gameId: string) {
  const { data } = await client.get(`/api/live/boxscore/${gameId}`);
  return data;
}

// WebSocket goes through Vite proxy on same origin
export const WS_BASE = `ws://${window.location.host}`;
