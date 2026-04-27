import client from "./client";

export async function fetchScoreboard() {
  const { data } = await client.get("/api/live/scoreboard");
  return data;
}

// WebSocket goes through Vite proxy on same origin
export const WS_BASE = `ws://${window.location.host}`;
