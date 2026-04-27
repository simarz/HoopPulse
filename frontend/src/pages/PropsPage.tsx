import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  fetchTodayGames,
  fetchTodayProps,
  fetchRecommendations,
  type GameOdds,
  type PlayerProps,
  type PropLine,
  type Recommendation,
} from "../api/odds";
import { fetchPlayerSearch, fetchPlayerGamelog } from "../api/players";
import "./PropsPage.css";
import "./Page.css";

function fmtOdds(n: number): string {
  return n > 0 ? `+${n}` : String(n);
}

function fmtTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  });
}

function teamShort(name: string): string {
  const words = name.split(" ");
  return words[words.length - 1];
}

// ── Win Probability Bar ──────────────────────────────────────────────────────

function WinBar({
  homePct,
  awayPct,
  homeTeam,
  awayTeam,
}: {
  homePct: number;
  awayPct: number;
  homeTeam: string;
  awayTeam: string;
}) {
  return (
    <div className="win-bar-container">
      <div className="win-bar">
        <div
          className="win-bar-fill win-bar-fill--away"
          style={{ width: `${awayPct}%` }}
          title={`${awayTeam} ${awayPct}%`}
        />
        <div
          className="win-bar-fill win-bar-fill--home"
          style={{ width: `${homePct}%` }}
          title={`${homeTeam} ${homePct}%`}
        />
      </div>
      <div className="win-pct-row">
        <span className="win-pct">{awayPct}%</span>
        <span className="win-pct-label">Win Prob</span>
        <span className="win-pct">{homePct}%</span>
      </div>
    </div>
  );
}

// ── Game Card ────────────────────────────────────────────────────────────────

function GameCard({
  game,
  selected,
  onClick,
}: {
  game: GameOdds;
  selected: boolean;
  onClick: () => void;
}) {
  const awayShort = teamShort(game.away_team);
  const homeShort = teamShort(game.home_team);

  return (
    <div
      className={`game-card ${selected ? "game-card--selected" : ""}`}
      onClick={onClick}
    >
      <div className="game-card-header">
        <span className="game-team">{awayShort}</span>
        <span className="game-at">@</span>
        <span className="game-team">{homeShort}</span>
      </div>
      <div className="game-time">{fmtTime(game.commence_time)}</div>

      {game.h2h && (
        <>
          <WinBar
            awayPct={game.h2h.away_win_pct}
            homePct={game.h2h.home_win_pct}
            awayTeam={game.away_team}
            homeTeam={game.home_team}
          />
          <div className="game-odds-grid">
            <span className="odds-label">ML</span>
            <span className="odds-val">{fmtOdds(game.h2h.away_odds)}</span>
            <span className="odds-val">{fmtOdds(game.h2h.home_odds)}</span>

            {game.spread && (
              <>
                <span className="odds-label">SPD</span>
                <span className="odds-val">
                  {game.spread.away_spread > 0 ? "+" : ""}
                  {game.spread.away_spread}
                  <span className="odds-juice">
                    {" "}
                    ({fmtOdds(game.spread.away_odds)})
                  </span>
                </span>
                <span className="odds-val">
                  {game.spread.home_spread > 0 ? "+" : ""}
                  {game.spread.home_spread}
                  <span className="odds-juice">
                    {" "}
                    ({fmtOdds(game.spread.home_odds)})
                  </span>
                </span>
              </>
            )}

            {game.total && (
              <>
                <span className="odds-label">O/U</span>
                <span className="odds-val" style={{ gridColumn: "2 / 4" }}>
                  {game.total.line}
                  <span className="odds-juice">
                    {" "}(O {fmtOdds(game.total.over_odds)} / U{" "}
                    {fmtOdds(game.total.under_odds)})
                  </span>
                </span>
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}

// ── Hit Tracker Table ────────────────────────────────────────────────────────

function StatCell({ value, line }: { value: number; line: number }) {
  const hit = value > line;
  return (
    <td className={hit ? "stat-hit" : "stat-miss"}>
      {value}&nbsp;{hit ? "✓" : "✗"}
    </td>
  );
}

function TrackerTable({
  gamelog,
  props,
}: {
  gamelog: Record<string, unknown>[];
  props: PlayerProps["props"];
}) {
  const hasPts = !!props.points;
  const hasReb = !!props.rebounds;
  const hasAst = !!props.assists;

  return (
    <table className="tracker-table">
      <thead>
        <tr>
          <th>Date</th>
          <th>Matchup</th>
          {hasPts && <th>PTS / O&nbsp;{props.points!.line}</th>}
          {hasReb && <th>REB / O&nbsp;{props.rebounds!.line}</th>}
          {hasAst && <th>AST / O&nbsp;{props.assists!.line}</th>}
        </tr>
      </thead>
      <tbody>
        {gamelog.map((g, i) => (
          <tr key={i}>
            <td>{String(g.GAME_DATE ?? "")}</td>
            <td>{String(g.MATCHUP ?? "")}</td>
            {hasPts && (
              <StatCell value={Number(g.PTS ?? 0)} line={props.points!.line} />
            )}
            {hasReb && (
              <StatCell
                value={Number(g.REB ?? 0)}
                line={props.rebounds!.line}
              />
            )}
            {hasAst && (
              <StatCell
                value={Number(g.AST ?? 0)}
                line={props.assists!.line}
              />
            )}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

// ── Hit Dots ─────────────────────────────────────────────────────────────────

function HitDots({
  gamelog,
  line,
  statKey,
}: {
  gamelog: Record<string, unknown>[];
  line: number;
  statKey: string;
}) {
  return (
    <div className="hit-dots">
      {gamelog.slice(0, 5).map((g, i) => {
        const val = Number(g[statKey] ?? 0);
        return (
          <span
            key={i}
            className={`hit-dot ${val > line ? "hit-dot--hit" : "hit-dot--miss"}`}
            title={`${val} (line: ${line})`}
          />
        );
      })}
    </div>
  );
}

// ── Prop Line Cell ───────────────────────────────────────────────────────────

function PropLineCell({ prop }: { prop?: PropLine }) {
  if (!prop) return <span className="no-prop">—</span>;
  return (
    <span className="prop-line">
      <span className="prop-line-num">{prop.line}</span>
      <span className="prop-line-odds">
        &nbsp;{fmtOdds(prop.over_odds)}/{fmtOdds(prop.under_odds)}
      </span>
    </span>
  );
}

// ── Prop Row (with embedded hit tracker) ─────────────────────────────────────

function PropRow({ row }: { row: PlayerProps }) {
  const [expanded, setExpanded] = useState(false);

  const { data: searchResults } = useQuery({
    queryKey: ["playerSearch", row.player],
    queryFn: () => fetchPlayerSearch(row.player),
    enabled: expanded,
    staleTime: Infinity,
  });

  const playerId = searchResults?.[0]?.id;

  const { data: gamelog, isLoading: loadingLog } = useQuery({
    queryKey: ["playerGamelog", playerId, "2025-26"],
    queryFn: () => fetchPlayerGamelog(playerId!, "2025-26", 5),
    enabled: !!playerId,
    staleTime: 5 * 60 * 1000,
  });

  return (
    <>
      <tr
        className={`prop-row ${expanded ? "prop-row--open" : ""}`}
        onClick={() => setExpanded((e) => !e)}
      >
        <td className="prop-player-cell">
          <span className="prop-chevron">{expanded ? "▾" : "▸"}</span>
          {row.player}
        </td>
        <td>
          <PropLineCell prop={row.props.points} />
        </td>
        <td>
          <PropLineCell prop={row.props.rebounds} />
        </td>
        <td>
          <PropLineCell prop={row.props.assists} />
        </td>
        <td className="dots-cell">
          {gamelog && row.props.points ? (
            <HitDots
              gamelog={gamelog}
              line={row.props.points.line}
              statKey="PTS"
            />
          ) : (
            <span className="no-prop track-hint">
              {expanded && loadingLog ? "⋯" : "▸ expand"}
            </span>
          )}
        </td>
      </tr>
      {expanded && (
        <tr className="tracker-row">
          <td colSpan={5}>
            <div className="tracker-content">
              {loadingLog ? (
                <span className="tracker-loading">
                  Loading last 5 games...
                </span>
              ) : gamelog ? (
                <TrackerTable gamelog={gamelog} props={row.props} />
              ) : (
                <span className="tracker-loading">
                  Player not found in NBA database.
                </span>
              )}
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

// ── Recommended Pick Card ─────────────────────────────────────────────────────

const STAT_LABEL: Record<string, string> = {
  points: "PTS",
  rebounds: "REB",
  assists: "AST",
};

function RecCard({ rec }: { rec: Recommendation }) {
  const label = STAT_LABEL[rec.best_stat] ?? rec.best_stat.toUpperCase();
  const pct = Math.round((rec.best_hits / rec.games_checked) * 100);
  const tier =
    rec.best_hits === 5 ? "rec-card--fire" : rec.best_hits === 4 ? "rec-card--hot" : "";

  return (
    <div className={`rec-card ${tier}`}>
      <div className="rec-top">
        <span className="rec-player">{rec.player}</span>
        <span className={`rec-badge ${tier}`}>
          {rec.best_hits}/{rec.games_checked}
        </span>
      </div>
      <div className="rec-prop">
        O&nbsp;{rec.best_line}&nbsp;{label}
      </div>
      <div className="rec-dots">
        {rec.best_results.map((r, i) => (
          <span
            key={i}
            className={`hit-dot ${r.hit ? "hit-dot--hit" : "hit-dot--miss"}`}
            title={String(r.value)}
          />
        ))}
        <span className="rec-pct">{pct}%</span>
      </div>
      <div className="rec-game">
        {teamShort(rec.away_team)}&nbsp;@&nbsp;{teamShort(rec.home_team)}
      </div>
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function PropsPage() {
  const [selectedGameId, setSelectedGameId] = useState<string | null>(null);

  const gamesQuery = useQuery({
    queryKey: ["todayGames"],
    queryFn: fetchTodayGames,
    staleTime: 5 * 60 * 1000,
  });

  const propsQuery = useQuery({
    queryKey: ["todayProps"],
    queryFn: fetchTodayProps,
    staleTime: 5 * 60 * 1000,
  });

  const recsQuery = useQuery({
    queryKey: ["recommendations"],
    queryFn: () => fetchRecommendations(),
    staleTime: 5 * 60 * 1000,
  });

  const games = gamesQuery.data ?? [];
  const allProps = propsQuery.data ?? [];
  const recs = recsQuery.data ?? [];

  const filteredProps = useMemo(
    () =>
      selectedGameId
        ? allProps.filter((p) => p.game_id === selectedGameId)
        : allProps,
    [allProps, selectedGameId],
  );

  const isLoading = gamesQuery.isLoading || propsQuery.isLoading;
  const isError = gamesQuery.isError || propsQuery.isError;
  const error = gamesQuery.error ?? propsQuery.error;

  return (
    <div className="page">
      <h1 className="page-title">Betting Lines &amp; Props</h1>

      {isLoading && <p className="status">Loading today's odds...</p>}
      {isError && (
        <p className="status error">
          {(error as Error)?.message ??
            "Failed to load odds. Ensure THE_ODDS_API_KEY is set in backend/.env"}
        </p>
      )}

      {/* Recommended picks */}
      {recs.length > 0 && (
        <section className="rec-section">
          <h2 className="section-title">Recommended Picks</h2>
          <p className="rec-subtitle">
            Players hitting over their line most often in their last 5 games
          </p>
          <div className="rec-grid">
            {recs.map((rec, i) => (
              <RecCard key={`${rec.player}-${i}`} rec={rec} />
            ))}
          </div>
        </section>
      )}
      {recsQuery.isLoading && (
        <p className="status">Analyzing player trends...</p>
      )}

      {/* Game cards */}
      {games.length > 0 && (
        <section className="games-section">
          <h2 className="section-title">Today's Games</h2>
          <div className="games-row">
            {games.map((game) => (
              <GameCard
                key={game.id}
                game={game}
                selected={selectedGameId === game.id}
                onClick={() =>
                  setSelectedGameId((id) =>
                    id === game.id ? null : game.id,
                  )
                }
              />
            ))}
          </div>
        </section>
      )}

      {!isLoading && !isError && games.length === 0 && (
        <p className="status">No NBA games scheduled today.</p>
      )}

      {/* Player Props table */}
      {allProps.length > 0 && (
        <section className="props-section">
          <h2 className="section-title">Player Props</h2>

          <div className="game-tabs">
            <button
              className={`game-tab ${!selectedGameId ? "game-tab--active" : ""}`}
              onClick={() => setSelectedGameId(null)}
            >
              All Games
            </button>
            {games
              .filter((g) => allProps.some((p) => p.game_id === g.id))
              .map((g) => (
                <button
                  key={g.id}
                  className={`game-tab ${selectedGameId === g.id ? "game-tab--active" : ""}`}
                  onClick={() =>
                    setSelectedGameId((id) =>
                      id === g.id ? null : g.id,
                    )
                  }
                >
                  {teamShort(g.away_team)} @ {teamShort(g.home_team)}
                </button>
              ))}
          </div>

          <div className="props-table-wrapper">
            <table className="props-table">
              <thead>
                <tr>
                  <th className="col-player">Player</th>
                  <th>PTS O/U</th>
                  <th>REB O/U</th>
                  <th>AST O/U</th>
                  <th>Last 5 (PTS)</th>
                </tr>
              </thead>
              <tbody>
                {filteredProps.map((row, i) => (
                  <PropRow key={`${row.player}-${i}`} row={row} />
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
