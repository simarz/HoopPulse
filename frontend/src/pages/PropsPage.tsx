import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  fetchRecommendations,
  fetchTodayProps,
  type Recommendation,
  type PlayerProps,
} from "../api/odds";
import { useApp } from "../context/AppContext";
import PlayerAvatar from "../components/PlayerAvatar";
import Sparkline from "../components/Sparkline";
import HitDots from "../components/HitDots";

type StatFilter = "All" | "PTS" | "REB" | "AST";

const STAT_LABEL: Record<string, "PTS" | "REB" | "AST"> = {
  points: "PTS",
  rebounds: "REB",
  assists: "AST",
};

// Map team full names to NBA tricodes for the TeamDot mark.
const TEAM_ABBR: Record<string, string> = {
  "Atlanta Hawks": "ATL", "Boston Celtics": "BOS", "Brooklyn Nets": "BKN",
  "Charlotte Hornets": "CHA", "Chicago Bulls": "CHI", "Cleveland Cavaliers": "CLE",
  "Dallas Mavericks": "DAL", "Denver Nuggets": "DEN", "Detroit Pistons": "DET",
  "Golden State Warriors": "GSW", "Houston Rockets": "HOU", "Indiana Pacers": "IND",
  "Los Angeles Clippers": "LAC", "LA Clippers": "LAC", "Los Angeles Lakers": "LAL",
  "Memphis Grizzlies": "MEM", "Miami Heat": "MIA", "Milwaukee Bucks": "MIL",
  "Minnesota Timberwolves": "MIN", "New Orleans Pelicans": "NOP", "New York Knicks": "NYK",
  "Oklahoma City Thunder": "OKC", "Orlando Magic": "ORL", "Philadelphia 76ers": "PHI",
  "Phoenix Suns": "PHX", "Portland Trail Blazers": "POR", "Sacramento Kings": "SAC",
  "San Antonio Spurs": "SAS", "Toronto Raptors": "TOR", "Utah Jazz": "UTA",
  "Washington Wizards": "WAS",
};

function abbr(name: string): string {
  if (!name) return "";
  return TEAM_ABBR[name] ?? name.split(" ").pop()?.slice(0, 3).toUpperCase() ?? "";
}

interface BetLeg {
  id: string;
  player: string;
  stat: "PTS" | "REB" | "AST";
  line: number;
  hits: number;
  games: number;
  odds: number;
}

function americanToDecimal(odds: number): number {
  if (odds > 0) return 1 + odds / 100;
  return 1 + 100 / Math.abs(odds);
}

function fmtOdds(n: number | undefined): string {
  if (n == null || !Number.isFinite(n)) return "—";
  return n > 0 ? `+${n}` : String(n);
}

export default function PropsPage() {
  const { scope, myTeam } = useApp();
  const [filter, setFilter] = useState<StatFilter>("All");
  const [slip, setSlip] = useState<BetLeg[]>([]);
  const [stake, setStake] = useState(25);

  const recsQuery = useQuery({
    queryKey: ["recommendations"],
    queryFn: () => fetchRecommendations(),
    staleTime: 5 * 60 * 1000,
  });

  const propsQuery = useQuery({
    queryKey: ["todayProps"],
    queryFn: fetchTodayProps,
    staleTime: 5 * 60 * 1000,
  });

  // Build a lookup from (player, stat) -> over_odds so each pick card can show real book odds.
  const oddsLookup = useMemo(() => {
    const map = new Map<string, number>();
    for (const row of propsQuery.data ?? []) {
      const p = row as PlayerProps;
      for (const [stat, line] of Object.entries(p.props)) {
        if (line) map.set(`${p.player}|${stat}`, line.over_odds);
      }
    }
    return map;
  }, [propsQuery.data]);

  const picks = useMemo(() => {
    const recs = recsQuery.data ?? [];
    let filtered = recs;
    if (filter !== "All") {
      filtered = filtered.filter(
        (r) => STAT_LABEL[r.best_stat] === filter,
      );
    }
    if (scope === "My Team") {
      filtered = filtered.filter(
        (r) => abbr(r.home_team) === myTeam || abbr(r.away_team) === myTeam,
      );
    }
    return filtered;
  }, [recsQuery.data, filter, scope, myTeam]);

  const addLeg = (rec: Recommendation) => {
    const stat = STAT_LABEL[rec.best_stat];
    if (!stat) return;
    const id = `${rec.player}|${stat}`;
    if (slip.some((l) => l.id === id)) return;
    const odds = oddsLookup.get(`${rec.player}|${rec.best_stat}`) ?? -110;
    setSlip((s) => [
      ...s,
      {
        id,
        player: rec.player,
        stat,
        line: rec.best_line,
        hits: rec.best_hits,
        games: rec.games_checked,
        odds,
      },
    ]);
  };

  const removeLeg = (id: string) =>
    setSlip((s) => s.filter((l) => l.id !== id));

  const parlayDecimal = slip.reduce(
    (acc, leg) => acc * americanToDecimal(leg.odds),
    1,
  );
  const toWin = slip.length > 0 ? stake * parlayDecimal - stake : 0;

  return (
    <div className="picks-grid">
      <section className="card picks-hero-card">
        <header className="card-hd">
          <h2>Top Picks Tonight</h2>
          <div className="seg">
            {(["All", "PTS", "REB", "AST"] as const).map((f) => (
              <button key={f} className={filter === f ? "on" : ""} onClick={() => setFilter(f)}>
                {f}
              </button>
            ))}
          </div>
        </header>

        {recsQuery.isLoading && (
          <p className="status-msg">Analyzing player trends — this can take ~30 seconds…</p>
        )}
        {recsQuery.isError && (
          <p className="status-msg error">
            {(recsQuery.error as Error)?.message ??
              "Failed to load picks. Set THE_ODDS_API_KEY in backend/.env."}
          </p>
        )}
        {!recsQuery.isLoading && !recsQuery.isError && picks.length === 0 && (
          <p className="status-msg">No qualifying picks for this filter right now.</p>
        )}

        {picks.length > 0 && (
          <div className="picks-cards">
            {picks.map((rec) => {
              const stat = STAT_LABEL[rec.best_stat];
              const tier =
                rec.best_hits === rec.games_checked
                  ? "fire"
                  : rec.best_hits >= rec.games_checked - 1
                    ? "hot"
                    : "";
              const pct = Math.round((rec.best_hits / Math.max(rec.games_checked, 1)) * 100);
              const odds = oddsLookup.get(`${rec.player}|${rec.best_stat}`);
              const teamAbbr = abbr(rec.home_team) === myTeam ? abbr(rec.home_team) : abbr(rec.away_team);
              const values = rec.best_results.map((r) => r.value);
              const inSlip = slip.some((l) => l.id === `${rec.player}|${stat}`);
              return (
                <div key={`${rec.player}-${stat}`} className={`pick-card ${tier}`}>
                  <div className="pick-top">
                    <PlayerAvatar
                      playerId={rec.player_id}
                      teamAbbr={teamAbbr}
                      size={36}
                      myTeam={myTeam}
                    />
                    <div className="pick-who">
                      <div className="pick-player">{rec.player}</div>
                      <div className="pick-game">
                        {abbr(rec.away_team)} <span className="muted">@</span> {abbr(rec.home_team)}
                      </div>
                    </div>
                    <span className={`tier-badge ${tier}`}>
                      {rec.best_hits}/{rec.games_checked}
                    </span>
                  </div>
                  <div className="pick-prop-block">
                    <span className="pick-ou">OVER</span>
                    <span className="pick-line-num">{rec.best_line}</span>
                    <span className="pick-stat">{stat}</span>
                  </div>
                  <Sparkline values={values} line={rec.best_line} w={220} h={42} />
                  <div className="pick-foot">
                    <HitDots values={values} line={rec.best_line} />
                    <span className="pick-rate-val">{pct}% hit rate</span>
                    <span className="pick-odds">{fmtOdds(odds)}</span>
                  </div>
                  <button
                    className="add-slip"
                    onClick={() => addLeg(rec)}
                    disabled={inSlip}
                  >
                    {inSlip ? "✓ Added" : "+ Add to slip"}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <aside className="card slip-card">
        <header className="card-hd">
          <h2>My Slip</h2>
          <span className="muted">
            {slip.length} {slip.length === 1 ? "leg" : "legs"}
          </span>
        </header>

        {slip.length === 0 ? (
          <p className="slip-empty">Add picks from the left to build your slip.</p>
        ) : (
          <ul className="slip-list">
            {slip.map((l) => (
              <li key={l.id}>
                <div>
                  <strong>{l.player}</strong> O {l.line} {l.stat}
                </div>
                <button
                  className="slip-remove"
                  onClick={() => removeLeg(l.id)}
                  aria-label="Remove leg"
                  title="Remove"
                >
                  ✕
                </button>
                <div className="slip-meta">
                  {l.hits}/{l.games} last {l.games} · {fmtOdds(l.odds)}
                </div>
              </li>
            ))}
          </ul>
        )}

        <div className="slip-foot">
          <div className="slip-row">
            <span>Stake</span>
            <span>
              <span style={{ color: "var(--ink-3)", marginRight: 4 }}>$</span>
              <input
                type="number"
                min={1}
                value={stake}
                onChange={(e) => setStake(Math.max(1, Number(e.target.value) || 0))}
                style={{
                  width: 64,
                  border: "1px solid var(--line)",
                  borderRadius: 6,
                  padding: "2px 6px",
                  textAlign: "right",
                  background: "white",
                  color: "inherit",
                }}
              />
            </span>
          </div>
          <div className="slip-row total">
            <span>To win</span>
            <span className="big">
              ${toWin.toLocaleString("en-US", { maximumFractionDigits: 2 })}
            </span>
          </div>
          <button className="place" disabled={slip.length === 0}>
            Place pick
          </button>
          <p className="disclaimer">Demo only — no real wagers placed.</p>
        </div>
      </aside>
    </div>
  );
}
