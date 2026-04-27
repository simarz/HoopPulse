import { useEffect, useRef, useState } from "react";
import { WS_BASE } from "../api/live";

interface PlayByPlayAction {
  actionNumber: number;
  clock: string;
  period: number;
  teamTricode: string;
  playerNameI: string;
  actionType: string;
  subType: string;
  description: string;
  scoreHome: string;
  scoreAway: string;
}

interface LiveGameState {
  actions: PlayByPlayAction[];
  connected: boolean;
  error: string | null;
}

export function useLiveGame(gameId: string | null): LiveGameState {
  const [actions, setActions] = useState<PlayByPlayAction[]>([]);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    if (!gameId) {
      setActions([]);
      setConnected(false);
      return;
    }

    const ws = new WebSocket(`${WS_BASE}/api/live/ws/${gameId}`);
    wsRef.current = ws;

    ws.onopen = () => {
      setConnected(true);
      setError(null);
    };

    ws.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        if (payload.error) {
          setError(payload.error);
          return;
        }
        const gameActions: PlayByPlayAction[] =
          payload?.game?.actions ?? [];
        setActions([...gameActions].reverse());
      } catch {
        setError("Failed to parse play-by-play data");
      }
    };

    ws.onerror = () => setError("WebSocket connection error");
    ws.onclose = () => setConnected(false);

    return () => {
      ws.close();
    };
  }, [gameId]);

  return { actions, connected, error };
}
