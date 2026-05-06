import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchScoreboard } from "../api/live";
import { useLiveGame } from "../hooks/useLiveGame";
import { useApp } from "../context/AppContext";
import TeamDot from "../components/TeamDot";
import WinBar from "../components/WinBar";

interface ScoreboardGame {
  gameId: string;
  gameStatus: number;
  gameStatusText: string;
  period: number;
  gameClock: string;
  homeTeam: {
    teamTricode: string;
    score: number;
    wins?: number;
    losses?: number;
  };
  awayTeam: {
    teamTricode: string;
    score: number;
    wins?: number;
    losses?: number;
  };
}

interface PbpAction {
  actionNumber: number;
  clock: string;
  period: number;
  teamTricode: string;
  description: string;
  scoreHome: string;
  scoreAway: string;
  actionType?: string;
}

function formatClock(clock: string): string {
  if (!clock) return "";
  const m = clock.match(/PT(\d+)M([\d.]+)S/);
  if (!m) return clock;
  return `${parseInt(m[1], 10)}:${String(Math.floor(parseFloat(m[2]))).padStart(2, "0")}`;
}

const BIG_TYPES = new Set([
  "3pt",
  "made3pt",
  "dunk",
  "block",
  "steal",
  "turnover",
]);

function isBigPlay(a: PbpAction): boolean {
  const desc = (a.description || "").toLowerCase();
  if (BIG_TYPES.has((a.actionType || "").toLowerCase())) return true;
  return /3pt|dunk|block|steal/.test(desc);
}

export default function LivePage() {
  const { myTeam } = useApp();
  const [selectedGameId, setSelectedGameId] = useState<string | null>(null);

  const { data: scoreboard, isLoading, isError } = useQuery({
    queryKey: ["scoreboard"],
    queryFn: fetchScoreboard,
    refetchInterval: 30_000,
  });

  const games: ScoreboardGame[] = scoreboard?.scoreboard?.games ?? [];

  // Auto-select the first live game on first load.
  useEffect(() => {
    if (!selectedGameId && games.length) {
      const first = games.find((g) => g.gameStatus === 2) ?? games[0];
      if (first) setSelectedGameId(first.gameId);
    }
  }, [games, selectedGameId]);

  const game = games.find((g) => g.gameId === selectedGameId);
  const { actions, connected, error: wsError } = useLiveGame(selectedGameId);

  // Track which actions are "fresh" (newly arrived) for the slide-in animation.
  const seenRef = useRef<Set<number>>(new Set());
  const [freshSet, setFreshSet] = useState<Set<number>>(new Set());
  const [updateCount, setUpdateCount] = useState(0);

  useEffect(() => {
    if (!actions.length) {
      seenRef.current.clear();
      setFreshSet(new Set());
      setUpdateCount(0);
      return;
    }
    const fresh = new Set<number>();
    for (const a of actions) {
      if (!seenRef.current.has(a.actionNumber)) {
        fresh.add(a.actionNumber);
        seenRef.current.add(a.actionNumber);
      }
    }
    if (fresh.size > 0) {
      setFreshSet(fresh);
      setUpdateCount((c) => c + 1);
      const t = setTimeout(() => setFreshSet(new Set()), 500);
      return () => clearTimeout(t);
    }
  }, [actions]);

  // Reset tracking when switching games.
  useEffect(() => {
    seenRef.current.clear();
    setFreshSet(new Set());
    setUpdateCount(0);
  }, [selectedGameId]);

  const liveCount = games.filter((g) => g.gameStatus === 2).length;

  return (
    <div className="live-grid">
      <section className="card scoreboard-card">
        <header className="card-hd">
          <h2>Today's Games</h2>
          <span className="muted">
            {games.length} game{games.length === 1 ? "" : "s"}
            {liveCount > 0 ? ` · ${liveCount} live` : ""}
          </span>
        </header>

        {isLoading && <p className="status-msg">Loading scoreboard…</p>}
        {isError && <p className="status-msg error">Failed to load scoreboard.</p>}
        {!isLoading && games.length === 0 && (
          <p className="status-msg">No games scheduled today.</p>
        )}

        {games.length > 0 && (
          <div className="games-row">
            {games.map((g) => {
              const live = g.gameStatus === 2;
              return (
                <button
                  key={g.gameId}
                  className={`game-tile ${selectedGameId === g.gameId ? "on" : ""} ${live ? "live" : ""}`}
                  onClick={() => setSelectedGameId(g.gameId)}
                >
                  {live && (
                    <span className="live-flag">
                      <span className="live-dot" /> LIVE
                    </span>
                  )}
                  <div className="gt-row">
                    <TeamDot abbr={g.awayTeam.teamTricode} size={26} myTeam={myTeam} />
                    <span className="gt-abbr">{g.awayTeam.teamTricode}</span>
                    <span className="gt-score">
                      {live || g.gameStatus === 3 ? g.awayTeam.score : "—"}
                    </span>
                  </div>
                  <div className="gt-row">
                    <TeamDot abbr={g.homeTeam.teamTricode} size={26} myTeam={myTeam} />
                    <span className="gt-abbr">{g.homeTeam.teamTricode}</span>
                    <span className="gt-score">
                      {live || g.gameStatus === 3 ? g.homeTeam.score : "—"}
                    </span>
                  </div>
                  <div className="gt-status">{g.gameStatusText}</div>
                  {(live || g.gameStatus === 3) && (
                    <ScoreWinBar
                      away={g.awayTeam.teamTricode}
                      home={g.homeTeam.teamTricode}
                      awayScore={g.awayTeam.score}
                      homeScore={g.homeTeam.score}
                    />
                  )}
                </button>
              );
            })}
          </div>
        )}
      </section>

      {selectedGameId && game && (
        <section className="card pbp-card">
          <header className="card-hd pbp-hd">
            <h2>
              <TeamDot abbr={game.awayTeam.teamTricode} size={28} myTeam={myTeam} /> {game.awayTeam.teamTricode}{" "}
              <span className="muted">@</span> {game.homeTeam.teamTricode}{" "}
              <TeamDot abbr={game.homeTeam.teamTricode} size={28} myTeam={myTeam} />
            </h2>
            <span className="ws-badge">
              {connected && <span className="live-dot" />}
              {connected ? `Streaming · ${updateCount} updates` : "Connecting…"}
            </span>
          </header>

          {wsError && <p className="status-msg error">{wsError}</p>}

          <div className="pbp-feed">
            {actions.length === 0 && !wsError && (
              <p className="status-msg">Waiting for plays…</p>
            )}
            {actions.map((a) => (
              <div
                key={a.actionNumber}
                className={`pbp-row ${isBigPlay(a as PbpAction) ? "big" : ""} ${
                  freshSet.has(a.actionNumber) ? "fresh" : ""
                } ${a.teamTricode === myTeam ? "team-mine" : ""}`}
              >
                <span className="pbp-clock">
                  Q{a.period} {formatClock(a.clock)}
                </span>
                <span className="pbp-team">
                  {a.teamTricode ? <TeamDot abbr={a.teamTricode} size={20} myTeam={myTeam} /> : null}
                </span>
                <span className="pbp-desc">{a.description}</span>
                <span className="pbp-score">
                  {a.scoreAway && a.scoreHome ? `${a.scoreAway}–${a.scoreHome}` : ""}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function ScoreWinBar({
  away,
  home,
  awayScore,
  homeScore,
}: {
  away: string;
  home: string;
  awayScore: number;
  homeScore: number;
}) {
  const total = (awayScore || 0) + (homeScore || 0);
  if (!total) return null;
  const awayPct = (awayScore / total) * 100;
  const homePct = (homeScore / total) * 100;
  return <WinBar away={away} home={home} awayPct={awayPct} homePct={homePct} />;
}
