import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { fetchScoreboard } from "../api/live";
import { fetchRecommendations } from "../api/odds";
import { fetchPlayerStats } from "../api/players";
import TeamDot from "./TeamDot";
import HitDots from "./HitDots";

interface ScoreboardGame {
  gameId: string;
  gameStatus: number;
  gameStatusText: string;
  period: number;
  gameClock: string;
  homeTeam: { teamTricode: string; teamCity?: string; teamName?: string; score: number; wins?: number; losses?: number };
  awayTeam: { teamTricode: string; teamCity?: string; teamName?: string; score: number; wins?: number; losses?: number };
}

const STAT_LABEL: Record<string, string> = {
  points: "PTS",
  rebounds: "REB",
  assists: "AST",
};

function formatClock(period: number, clock: string): string {
  if (!clock) return `Q${period}`;
  // NBA clock arrives as "PT04M21.00S"
  const m = clock.match(/PT(\d+)M([\d.]+)S/);
  if (!m) return `Q${period} ${clock}`;
  const min = parseInt(m[1], 10);
  const sec = Math.floor(parseFloat(m[2]));
  return `Q${period} ${min}:${String(sec).padStart(2, "0")}`;
}

export default function HeroStrip() {
  const navigate = useNavigate();

  const { data: scoreboard } = useQuery({
    queryKey: ["scoreboard"],
    queryFn: fetchScoreboard,
    refetchInterval: 30_000,
    staleTime: 25_000,
  });

  const { data: recs } = useQuery({
    queryKey: ["recommendations"],
    queryFn: () => fetchRecommendations(),
    staleTime: 5 * 60 * 1000,
  });

  const { data: players } = useQuery({
    queryKey: ["playerStats", "2025-26", "Regular Season", "Base", "PerGame"],
    queryFn: () =>
      fetchPlayerStats({
        season: "2025-26",
        season_type: "Regular Season",
        measure_type: "Base",
        per_mode: "PerGame",
      }),
    staleTime: 5 * 60 * 1000,
  });

  const games: ScoreboardGame[] = scoreboard?.scoreboard?.games ?? [];
  const liveGame = games.find((g) => g.gameStatus === 2) ?? games.find((g) => g.gameStatus === 1) ?? games[0];

  const topPick = recs?.[0];

  const leaders = (() => {
    if (!players?.length) return null;
    const minGp = Math.max(15, Math.floor((players[0].GP ?? 30) * 0.4));
    const eligible = players.filter((p) => (p.GP ?? 0) >= minGp);
    const top = (key: string) =>
      [...eligible].sort((a, b) => Number(b[key] ?? 0) - Number(a[key] ?? 0))[0];
    const ptsLeader = top("PTS");
    const astLeader = top("AST");
    const rebLeader = top("REB");
    const pmLeader = top("PLUS_MINUS");
    return { ptsLeader, astLeader, rebLeader, pmLeader };
  })();

  return (
    <div className="hero">
      {/* Live / featured game */}
      <button className="hero-card hero-live" onClick={() => navigate("/live")}>
        {liveGame ? (
          <>
            <div className="hero-tag">
              {liveGame.gameStatus === 2 && <span className="live-dot" />}
              {liveGame.gameStatus === 2
                ? `LIVE · ${formatClock(liveGame.period, liveGame.gameClock)}`
                : liveGame.gameStatusText.toUpperCase()}
            </div>
            <div className="hero-score">
              <div className="hs-team">
                <TeamDot abbr={liveGame.awayTeam.teamTricode} size={36} />
                <div>
                  <div className="hs-name">{liveGame.awayTeam.teamCity ?? liveGame.awayTeam.teamName ?? liveGame.awayTeam.teamTricode}</div>
                  {liveGame.awayTeam.wins != null && (
                    <div className="hs-rec">{liveGame.awayTeam.wins}–{liveGame.awayTeam.losses}</div>
                  )}
                </div>
                <div className="hs-num">{liveGame.gameStatus === 2 ? liveGame.awayTeam.score : "—"}</div>
              </div>
              <div className="hs-vs">@</div>
              <div className="hs-team">
                <div className="hs-num">{liveGame.gameStatus === 2 ? liveGame.homeTeam.score : "—"}</div>
                <div>
                  <div className="hs-name">{liveGame.homeTeam.teamCity ?? liveGame.homeTeam.teamName ?? liveGame.homeTeam.teamTricode}</div>
                  {liveGame.homeTeam.wins != null && (
                    <div className="hs-rec">{liveGame.homeTeam.wins}–{liveGame.homeTeam.losses}</div>
                  )}
                </div>
                <TeamDot abbr={liveGame.homeTeam.teamTricode} size={36} />
              </div>
            </div>
            <div className="hero-foot">Tap to follow play-by-play →</div>
          </>
        ) : (
          <>
            <div className="hero-tag muted">SCOREBOARD</div>
            <div className="hero-foot" style={{ marginTop: 14 }}>No games on the slate right now.</div>
          </>
        )}
      </button>

      {/* Top pick */}
      <div className="hero-card hero-stat">
        <div className="hero-tag muted">TONIGHT'S HOTTEST PICK</div>
        {topPick ? (
          <>
            <div className="pick-line">
              <span className="pick-name">{topPick.player}</span>
              <span className="pick-prop">
                O {topPick.best_line} {STAT_LABEL[topPick.best_stat] ?? topPick.best_stat.toUpperCase()}
              </span>
            </div>
            <div className="pick-streak">
              <HitDots
                values={topPick.best_results.map((r) => r.value)}
                line={topPick.best_line}
              />
              <span className="pick-rate">
                {topPick.best_hits}/{topPick.games_checked} last {topPick.games_checked}
              </span>
            </div>
          </>
        ) : (
          <div className="pick-streak" style={{ marginTop: 12 }}>
            <span className="pick-rate">No picks yet — check back at tip-off.</span>
          </div>
        )}
        <button className="hero-btn" onClick={() => navigate("/props")}>
          See all picks →
        </button>
      </div>

      {/* League leaders */}
      <div className="hero-card hero-leader">
        <div className="hero-tag muted">LEAGUE LEADERS</div>
        <ul className="leader-list">
          {leaders?.ptsLeader && (
            <li>
              <span className="ll-stat">PTS</span>
              <span className="ll-val">{Number(leaders.ptsLeader.PTS ?? 0).toFixed(1)}</span>
              <span className="ll-name">{shortName(leaders.ptsLeader.PLAYER_NAME)}</span>
            </li>
          )}
          {leaders?.astLeader && (
            <li>
              <span className="ll-stat">AST</span>
              <span className="ll-val">{Number(leaders.astLeader.AST ?? 0).toFixed(1)}</span>
              <span className="ll-name">{shortName(leaders.astLeader.PLAYER_NAME)}</span>
            </li>
          )}
          {leaders?.rebLeader && (
            <li>
              <span className="ll-stat">REB</span>
              <span className="ll-val">{Number(leaders.rebLeader.REB ?? 0).toFixed(1)}</span>
              <span className="ll-name">{shortName(leaders.rebLeader.PLAYER_NAME)}</span>
            </li>
          )}
          {leaders?.pmLeader && (
            <li>
              <span className="ll-stat">+/-</span>
              <span className="ll-val">
                {(leaders.pmLeader.PLUS_MINUS ?? 0) >= 0 ? "+" : ""}
                {Number(leaders.pmLeader.PLUS_MINUS ?? 0).toFixed(1)}
              </span>
              <span className="ll-name">{shortName(leaders.pmLeader.PLAYER_NAME)}</span>
            </li>
          )}
          {!leaders && <li><span className="ll-name">Loading…</span></li>}
        </ul>
      </div>
    </div>
  );
}

function shortName(full: string): string {
  if (!full) return "";
  const parts = full.split(" ");
  if (parts.length < 2) return full;
  return `${parts[0][0]}. ${parts.slice(1).join(" ")}`;
}
