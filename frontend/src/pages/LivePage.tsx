import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchScoreboard, fetchBoxscore } from "../api/live";
import { useLiveGame } from "../hooks/useLiveGame";
import "./Page.css";
import "./LivePage.css";

function fmtClock(iso: string): string {
  const m = iso.match(/PT(\d+)M(?:([\d.]+)S)?/);
  if (!m) return iso;
  const mins = m[1];
  if (!m[2]) return mins;
  const secs = Math.floor(parseFloat(m[2])).toString().padStart(2, "0");
  return `${mins}:${secs}`;
}

const TEAM_COLORS: Record<string, string> = {
  ATL: "#E03A3E", BOS: "#007A33", BKN: "#AAAAAA", CHA: "#00788C",
  CHI: "#CE1141", CLE: "#FDBB30", DAL: "#00538C", DEN: "#FEC524",
  DET: "#C8102E", GSW: "#FFC72C", HOU: "#CE1141", IND: "#FDBB30",
  LAC: "#C8102E", LAL: "#FDB927", MEM: "#5D76A9", MIA: "#98002E",
  MIL: "#00471B", MIN: "#78BE20", NOP: "#85714D", NYK: "#F58426",
  OKC: "#007AC1", ORL: "#0077C0", PHI: "#006BB6", PHX: "#E56020",
  POR: "#E03A3E", SAC: "#5A2D81", SAS: "#C4CED4", TOR: "#CE1141",
  UTA: "#F9A01B", WAS: "#E31837",
};

const TEAM_ACTION_TYPES = new Set(["timeout", "violation", "challenge", "jumpball"]);

function TeamActionBadge({ actionType, teamTricode }: { actionType: string; teamTricode: string }) {
  const color = TEAM_COLORS[teamTricode] ?? "#4a7cff";
  return (
    <span
      className="pbp-team-action-badge"
      style={{ color, backgroundColor: `${color}22`, borderColor: `${color}66` }}
    >
      {actionType.toUpperCase()}
    </span>
  );
}

function fmtDesc(actionType: string, subType: string, description: string): string {
  if (actionType === "freethrow") {
    const ft = subType.match(/(\d+)\s+of\s+(\d+)/i);
    if (ft) {
      return description.replace(/\s*\(\d+\s+PTS\)$/, ` (${ft[1]}/${ft[2]})`);
    }
  }
  return description;
}

function renderDesc(
  actionType: string,
  subType: string,
  description: string,
  playerNameI: string,
  onPlayerClick: (name: string) => void,
) {
  const text = fmtDesc(actionType, subType, description);
  if (!playerNameI) return <>{text}</>;

  // Strip the name from the description start if present, to avoid duplication
  const body = text.startsWith(playerNameI)
    ? text.slice(playerNameI.length).trimStart()
    : text;

  return (
    <>
      <button className="pbp-player-btn" onClick={() => onPlayerClick(playerNameI)}>
        {playerNameI}
      </button>
      {body ? ` ${body}` : ""}
    </>
  );
}

interface GameSummary {
  gameId: string;
  gameStatus: number;
  gameStatusText: string;
  homeTeam: { teamId: number; teamTricode: string; score: number };
  awayTeam: { teamId: number; teamTricode: string; score: number };
  period: number;
  gameClock: string;
}

interface BoxscoreStats {
  points: number;
  reboundsTotal: number;
  assists: number;
  steals: number;
  blocks: number;
  turnovers: number;
  fieldGoalsMade: number;
  fieldGoalsAttempted: number;
  threePointersMade: number;
  threePointersAttempted: number;
  freeThrowsMade: number;
  freeThrowsAttempted: number;
  foulsPersonal: number;
  minutesCalculated: string;
}

interface BoxscorePlayer {
  name: string;
  nameI: string;
  statistics: BoxscoreStats;
}

export default function LivePage() {
  const [selectedGameId, setSelectedGameId] = useState<string | null>(null);
  const [selectedPlayerNameI, setSelectedPlayerNameI] = useState<string | null>(null);

  const { data: scoreboard, isLoading, isError } = useQuery({
    queryKey: ["scoreboard"],
    queryFn: fetchScoreboard,
    refetchInterval: 30_000,
  });

  const { data: boxscoreData, isLoading: boxscoreLoading, isError: boxscoreError } = useQuery({
    queryKey: ["boxscore", selectedGameId],
    queryFn: () => fetchBoxscore(selectedGameId!),
    enabled: !!selectedGameId,
    refetchInterval: 30_000,
  });

  const { actions, connected, error: wsError } = useLiveGame(selectedGameId);

  const games: GameSummary[] = scoreboard?.scoreboard?.games ?? [];
  const selectedGame = games.find((g) => g.gameId === selectedGameId) ?? null;

  const allPlayers: (BoxscorePlayer & { teamTricode: string })[] = [];
  if (boxscoreData?.game) {
    const { homeTeam, awayTeam } = boxscoreData.game;
    for (const p of homeTeam?.players ?? [])
      allPlayers.push({ ...p, teamTricode: homeTeam.teamTricode });
    for (const p of awayTeam?.players ?? [])
      allPlayers.push({ ...p, teamTricode: awayTeam.teamTricode });
  }

  const selectedPlayer = selectedPlayerNameI
    ? allPlayers.find((p) => p.nameI === selectedPlayerNameI) ?? null
    : null;

  function handlePlayerClick(nameI: string) {
    setSelectedPlayerNameI((prev) => (prev === nameI ? null : nameI));
  }

  function handleGameSelect(gameId: string) {
    setSelectedGameId((prev) => (prev === gameId ? null : gameId));
    setSelectedPlayerNameI(null);
  }

  const playerTeamId = selectedPlayer
    ? selectedGame?.homeTeam.teamTricode === selectedPlayer.teamTricode
      ? selectedGame?.homeTeam.teamId
      : selectedGame?.awayTeam.teamId
    : null;

  const statRows: { label: string; value: string }[] = selectedPlayer
    ? [
        { label: "MIN", value: fmtClock(selectedPlayer.statistics.minutesCalculated) },
        { label: "PTS", value: String(selectedPlayer.statistics.points) },
        { label: "REB", value: String(selectedPlayer.statistics.reboundsTotal) },
        { label: "AST", value: String(selectedPlayer.statistics.assists) },
        { label: "STL", value: String(selectedPlayer.statistics.steals) },
        { label: "BLK", value: String(selectedPlayer.statistics.blocks) },
        {
          label: "FG",
          value: `${selectedPlayer.statistics.fieldGoalsMade}/${selectedPlayer.statistics.fieldGoalsAttempted}`,
        },
        {
          label: "3PT",
          value: `${selectedPlayer.statistics.threePointersMade}/${selectedPlayer.statistics.threePointersAttempted}`,
        },
        {
          label: "FT",
          value: `${selectedPlayer.statistics.freeThrowsMade}/${selectedPlayer.statistics.freeThrowsAttempted}`,
        },
        { label: "TO",  value: String(selectedPlayer.statistics.turnovers) },
        { label: "PF",  value: String(selectedPlayer.statistics.foulsPersonal) },
      ]
    : [];

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
            onClick={() => handleGameSelect(game.gameId)}
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
        <div className="pbp-and-player">
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
                  <span className="pbp-clock">Q{action.period} {fmtClock(action.clock)}</span>
                  <span className="pbp-team">{action.teamTricode || ""}</span>
                  <span className="pbp-desc">
                    {action.actionType === "substitution" && (
                      <span className={`pbp-sub-badge pbp-sub-badge--${action.subType}`}>
                        {action.subType === "in" ? "SUB IN" : "SUB OUT"}
                      </span>
                    )}
                    {TEAM_ACTION_TYPES.has(action.actionType) && action.teamTricode && (
                      <TeamActionBadge actionType={action.actionType} teamTricode={action.teamTricode} />
                    )}
                    {renderDesc(
                      action.actionType,
                      action.subType,
                      action.description,
                      action.playerNameI,
                      handlePlayerClick,
                    )}
                  </span>
                  <div className="pbp-score-cell">
                    {selectedGame && (
                      <div className="pbp-score-logos">
                        <img
                          src={`https://cdn.nba.com/logos/nba/${selectedGame.awayTeam.teamId}/global/L/logo.svg`}
                          className="pbp-team-logo"
                          alt={selectedGame.awayTeam.teamTricode}
                        />
                        <img
                          src={`https://cdn.nba.com/logos/nba/${selectedGame.homeTeam.teamId}/global/L/logo.svg`}
                          className="pbp-team-logo"
                          alt={selectedGame.homeTeam.teamTricode}
                        />
                      </div>
                    )}
                    {action.scoreAway && action.scoreHome && (
                      <div className="pbp-score-numbers">
                        {action.scoreAway} – {action.scoreHome}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {selectedPlayerNameI && (
            <div className="player-panel">
              <div className="player-panel-header">
                {selectedPlayer && (
                  <img
                    src={`https://cdn.nba.com/logos/nba/${playerTeamId}/global/L/logo.svg`}
                    className="player-panel-logo"
                    alt={selectedPlayer.teamTricode}
                  />
                )}
                <div>
                  <div className="player-panel-name">
                    {selectedPlayer ? selectedPlayer.name : selectedPlayerNameI}
                  </div>
                  {selectedPlayer && (
                    <div className="player-panel-team" style={{ color: TEAM_COLORS[selectedPlayer.teamTricode] ?? "#8892b0" }}>
                      {selectedPlayer.teamTricode}
                    </div>
                  )}
                </div>
                <button className="player-panel-close" onClick={() => setSelectedPlayerNameI(null)}>✕</button>
              </div>

              {boxscoreLoading && <p className="player-panel-status">Loading stats...</p>}
              {boxscoreError && <p className="player-panel-status error">Could not load stats.</p>}
              {!boxscoreLoading && !boxscoreError && !selectedPlayer && (
                <p className="player-panel-status">No stats found for this player.</p>
              )}

              {selectedPlayer && (
                <div className="player-stat-grid">
                  {statRows.map(({ label, value }) => (
                    <div key={label} className="player-stat-cell">
                      <span className="player-stat-value">{value}</span>
                      <span className="player-stat-label">{label}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
