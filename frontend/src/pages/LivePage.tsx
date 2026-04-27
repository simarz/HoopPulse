import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchScoreboard } from "../api/live";
import { useLiveGame } from "../hooks/useLiveGame";
import "./Page.css";
import "./LivePage.css";

interface GameSummary {
  gameId: string;
  gameStatus: number;
  gameStatusText: string;
  homeTeam: { teamTricode: string; score: number };
  awayTeam: { teamTricode: string; score: number };
  period: number;
  gameClock: string;
}

export default function LivePage() {
  const [selectedGameId, setSelectedGameId] = useState<string | null>(null);

  const { data: scoreboard, isLoading, isError } = useQuery({
    queryKey: ["scoreboard"],
    queryFn: fetchScoreboard,
    refetchInterval: 30_000,
  });

  const { actions, connected, error: wsError } = useLiveGame(selectedGameId);

  const games: GameSummary[] = scoreboard?.scoreboard?.games ?? [];

  return (
    <div className="page">
      <h1 className="page-title">Live Games</h1>

      {isLoading && <p className="status">Loading scoreboard...</p>}
      {isError && <p className="status error">Failed to load scoreboard.</p>}

      {!isLoading && games.length === 0 && (
        <p className="status">No games scheduled today.</p>
      )}

      <div className="game-grid">
        {games.map((game) => (
          <button
            key={game.gameId}
            className={`game-card ${selectedGameId === game.gameId ? "selected" : ""}`}
            onClick={() => setSelectedGameId(game.gameId === selectedGameId ? null : game.gameId)}
          >
            <div className="game-teams">
              <span>{game.awayTeam.teamTricode}</span>
              <span className="game-score">{game.awayTeam.score ?? "-"}</span>
              <span className="game-vs">@</span>
              <span className="game-score">{game.homeTeam.score ?? "-"}</span>
              <span>{game.homeTeam.teamTricode}</span>
            </div>
            <div className="game-status">{game.gameStatusText}</div>
          </button>
        ))}
      </div>

      {selectedGameId && (
        <div className="pbp-panel">
          <div className="pbp-header">
            <h2>Play-by-Play</h2>
            <span className={`ws-badge ${connected ? "connected" : "disconnected"}`}>
              {connected ? "Live" : "Connecting..."}
            </span>
          </div>

          {wsError && <p className="status error">{wsError}</p>}

          <div className="pbp-feed">
            {actions.length === 0 && !wsError && (
              <p className="status">Waiting for plays...</p>
            )}
            {actions.map((action) => (
              <div key={action.actionNumber} className="pbp-row">
                <span className="pbp-clock">Q{action.period} {action.clock}</span>
                <span className="pbp-team">{action.teamTricode || ""}</span>
                <span className="pbp-desc">{action.description}</span>
                <span className="pbp-score">
                  {action.scoreAway && action.scoreHome
                    ? `${action.scoreAway} - ${action.scoreHome}`
                    : ""}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
