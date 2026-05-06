import { useCallback, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchPlayerStats, type PlayerStatRow } from "../api/players";
import { useApp } from "../context/AppContext";
import PlayerAvatar from "../components/PlayerAvatar";

type Measure = "Traditional" | "Advanced";
type SortDir = "asc" | "desc";
type SeasonType = "Regular Season" | "Playoffs" | "Pre Season";

const SEASON_TYPES: SeasonType[] = ["Regular Season", "Playoffs", "Pre Season"];
const SEASON_LABEL: Record<SeasonType, string> = {
  "Regular Season": "Regular",
  "Playoffs": "Playoffs",
  "Pre Season": "Pre Season",
};

interface ColDef {
  key: string;
  label: string;
  fmt: (v: unknown) => string;
}

const num1 = (v: unknown) => {
  const n = Number(v);
  return Number.isFinite(n) ? n.toFixed(1) : "—";
};
const numInt = (v: unknown) => {
  const n = Number(v);
  return Number.isFinite(n) ? String(Math.round(n)) : "—";
};
const pct1 = (v: unknown) => {
  const n = Number(v);
  if (!Number.isFinite(n) || n === 0) return "—";
  return (n * 100).toFixed(1) + "%";
};
const plusMinus = (v: unknown) => {
  const n = Number(v);
  if (!Number.isFinite(n)) return "—";
  return (n >= 0 ? "+" : "") + n.toFixed(1);
};
const text = (v: unknown) => (v == null || v === "" ? "—" : String(v));

const TRADITIONAL_COLS: ColDef[] = [
  { key: "POSITION", label: "POS", fmt: text },
  { key: "GP", label: "GP", fmt: numInt },
  { key: "MIN", label: "MIN", fmt: num1 },
  { key: "PTS", label: "PTS", fmt: num1 },
  { key: "REB", label: "REB", fmt: num1 },
  { key: "AST", label: "AST", fmt: num1 },
  { key: "FG_PCT", label: "FG%", fmt: pct1 },
  { key: "FG3_PCT", label: "3P%", fmt: pct1 },
  { key: "PLUS_MINUS", label: "+/-", fmt: plusMinus },
];

const ADVANCED_COLS: ColDef[] = [
  { key: "POSITION", label: "POS", fmt: text },
  { key: "GP", label: "GP", fmt: numInt },
  { key: "MIN", label: "MIN", fmt: num1 },
  { key: "OFF_RATING", label: "ORTG", fmt: num1 },
  { key: "DEF_RATING", label: "DRTG", fmt: num1 },
  { key: "USG_PCT", label: "USG%", fmt: pct1 },
  { key: "TS_PCT", label: "TS%", fmt: pct1 },
  { key: "PLUS_MINUS", label: "+/-", fmt: plusMinus },
];

interface DetailMerged extends PlayerStatRow {
  TS_PCT?: number;
  USG_PCT?: number;
  OFF_RATING?: number;
  DEF_RATING?: number;
}

export default function PlayersPage() {
  const { query, scope, myTeam } = useApp();
  const [measure, setMeasure] = useState<Measure>("Traditional");
  const [seasonType, setSeasonType] = useState<SeasonType>("Regular Season");
  const [sortKey, setSortKey] = useState<string>("PTS");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [openId, setOpenId] = useState<number | null>(null);
  const [followedIds, setFollowedIds] = useState<number[]>(() => {
    if (typeof window === "undefined") return [];
    const raw = localStorage.getItem("hp.followedIds");
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          return parsed.map((x) => Number(x)).filter((n) => Number.isFinite(n));
        }
      } catch { /* fall through to legacy migration */ }
    }
    // One-time migration from the old single-follow key.
    const legacy = localStorage.getItem("hp.followedId");
    if (legacy) {
      localStorage.removeItem("hp.followedId");
      const n = Number(legacy);
      if (Number.isFinite(n)) return [n];
    }
    return [];
  });

  const toggleFollow = useCallback((id: number) => {
    setFollowedIds((cur) => {
      const next = cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id];
      try {
        localStorage.setItem("hp.followedIds", JSON.stringify(next));
      } catch { /* ignore */ }
      return next;
    });
  }, []);

  const baseQuery = useQuery({
    queryKey: ["playerStats", "2025-26", seasonType, "Base", "PerGame"],
    queryFn: () =>
      fetchPlayerStats({
        season: "2025-26",
        season_type: seasonType,
        measure_type: "Base",
        per_mode: "PerGame",
      }),
    staleTime: 5 * 60 * 1000,
  });

  // Advanced is only needed when the user picks the Advanced tab — the detail
  // card's USG/ORTG/DRTG/TS panels show "—" until then. Saves one slow NBA call
  // on every cold visit to /players.
  const advancedQuery = useQuery({
    queryKey: ["playerStats", "2025-26", seasonType, "Advanced", "PerGame"],
    queryFn: () =>
      fetchPlayerStats({
        season: "2025-26",
        season_type: seasonType,
        measure_type: "Advanced",
        per_mode: "PerGame",
      }),
    staleTime: 5 * 60 * 1000,
    enabled: measure === "Advanced",
  });

  const cols = measure === "Advanced" ? ADVANCED_COLS : TRADITIONAL_COLS;
  const tableData = measure === "Advanced" ? advancedQuery.data : baseQuery.data;
  const isLoading = measure === "Advanced" ? advancedQuery.isLoading : baseQuery.isLoading;
  const isError = measure === "Advanced" ? advancedQuery.isError : baseQuery.isError;

  // Merge Base + Advanced by PLAYER_ID for the detail card.
  const detailById = useMemo(() => {
    const map = new Map<number, DetailMerged>();
    for (const row of baseQuery.data ?? []) map.set(row.PLAYER_ID, { ...row });
    for (const row of advancedQuery.data ?? []) {
      const existing = map.get(row.PLAYER_ID) ?? ({ ...row } as DetailMerged);
      map.set(row.PLAYER_ID, {
        ...existing,
        TS_PCT: row.TS_PCT,
        USG_PCT: row.USG_PCT,
        OFF_RATING: row.OFF_RATING,
        DEF_RATING: row.DEF_RATING,
      });
    }
    return map;
  }, [baseQuery.data, advancedQuery.data]);

  const players = useMemo(() => {
    let rows = (tableData ?? []) as PlayerStatRow[];
    if (scope === "My Team") rows = rows.filter((p) => p.TEAM_ABBREVIATION === myTeam);
    if (query) {
      const q = query.toLowerCase();
      rows = rows.filter(
        (p) =>
          p.PLAYER_NAME?.toLowerCase().includes(q) ||
          p.TEAM_ABBREVIATION?.toLowerCase().includes(q),
      );
    }
    rows = [...rows].sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      if (typeof av === "string" || typeof bv === "string") {
        const as = String(av ?? "");
        const bs = String(bv ?? "");
        return sortDir === "asc" ? as.localeCompare(bs) : bs.localeCompare(as);
      }
      const an = Number(av ?? 0);
      const bn = Number(bv ?? 0);
      return sortDir === "asc" ? an - bn : bn - an;
    });
    return rows;
  }, [tableData, scope, myTeam, query, sortKey, sortDir]);

  const open: DetailMerged | undefined = useMemo(() => {
    if (!players.length) return undefined;
    const id = openId ?? players[0]?.PLAYER_ID;
    return id != null ? detailById.get(id) ?? (players[0] as DetailMerged) : undefined;
  }, [openId, players, detailById]);

  // Followed players come from anywhere in the league — pull from the merged
  // detail map directly so they survive filters/search that hide them from the table.
  const pinnedBelow: DetailMerged[] = useMemo(
    () =>
      followedIds
        .filter((id) => id !== open?.PLAYER_ID)
        .map((id) => detailById.get(id))
        .filter((p): p is DetailMerged => !!p),
    [followedIds, open?.PLAYER_ID, detailById],
  );
  const followedSet = useMemo(() => new Set(followedIds), [followedIds]);

  const onSort = (key: string) => {
    if (sortKey === key) setSortDir((d) => (d === "desc" ? "asc" : "desc"));
    else {
      setSortKey(key);
      setSortDir("desc");
    }
  };

  return (
    <div className="players-grid">
      <section className="card players-table-card">
        <header className="card-hd">
          <h2>Player Stats</h2>
          <div className="card-hd-right">
            <div className="seg">
              {SEASON_TYPES.map((s) => (
                <button
                  key={s}
                  className={seasonType === s ? "on" : ""}
                  onClick={() => setSeasonType(s)}
                >
                  {SEASON_LABEL[s]}
                </button>
              ))}
            </div>
            <div className="seg">
              {(["Traditional", "Advanced"] as const).map((m) => (
                <button
                  key={m}
                  className={measure === m ? "on" : ""}
                  onClick={() => setMeasure(m)}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>
        </header>
        {isLoading && <p className="status-msg">Loading stats…</p>}
        {isError && <p className="status-msg error">Failed to load stats.</p>}
        {!isLoading && !isError && (
          <div className="players-table-wrap">
            <table className="ptable">
              <thead>
                <tr>
                  <th className="th-player">Player</th>
                  {cols.map((c) => (
                    <th
                      key={c.key}
                      className={`sortable ${sortKey === c.key ? "on " + sortDir : ""}`}
                      onClick={() => onSort(c.key)}
                    >
                      {c.label}
                      <span className="sort-arr">
                        {sortKey === c.key ? (sortDir === "desc" ? "↓" : "↑") : ""}
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {players.map((p, i) => {
                  const isOpen = (openId ?? players[0]?.PLAYER_ID) === p.PLAYER_ID;
                  const isMine = p.TEAM_ABBREVIATION === myTeam;
                  // "Hot" = high recent scorer; rough proxy on PTS for now.
                  const hot = (p.PTS ?? 0) >= 28;
                  return (
                    <tr
                      key={p.PLAYER_ID}
                      className={`${isOpen ? "open" : ""} ${isMine ? "myteam" : ""}`}
                      onClick={() => setOpenId(p.PLAYER_ID)}
                    >
                      <td className="td-player">
                        <span className="rank">{i + 1}</span>
                        <PlayerAvatar
                          playerId={p.PLAYER_ID}
                          teamAbbr={p.TEAM_ABBREVIATION}
                          size={24}
                          myTeam={myTeam}
                        />
                        <span className="pname">
                          {p.PLAYER_NAME}
                          {hot && <span className="hot-tag" title="Hot scorer">🔥</span>}
                        </span>
                      </td>
                      {cols.map((c) => (
                        <td key={c.key} className={sortKey === c.key ? "hi" : ""}>
                          {c.fmt(p[c.key])}
                        </td>
                      ))}
                    </tr>
                  );
                })}
                {players.length === 0 && (
                  <tr>
                    <td colSpan={cols.length + 1} style={{ padding: 24, textAlign: "center", color: "var(--ink-3)" }}>
                      No players match the current filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <div className="player-stack">
        <PlayerCard
          player={open}
          myTeam={myTeam}
          isFollowed={open?.PLAYER_ID != null && followedSet.has(open.PLAYER_ID)}
          onToggleFollow={toggleFollow}
        />
        {pinnedBelow.map((p) => (
          <PlayerCard
            key={p.PLAYER_ID}
            player={p}
            myTeam={myTeam}
            isFollowed
            onToggleFollow={toggleFollow}
            pinned
          />
        ))}
      </div>
    </div>
  );
}

interface PlayerCardProps {
  player: DetailMerged | undefined;
  myTeam: string;
  isFollowed: boolean;
  onToggleFollow: (id: number) => void;
  pinned?: boolean;
}

function PlayerCard({ player, myTeam, isFollowed, onToggleFollow, pinned }: PlayerCardProps) {
  if (!player) {
    return (
      <aside className="card player-card">
        <div className="status-msg">Select a player to see their breakdown.</div>
      </aside>
    );
  }

  const bars: Array<[string, number, number]> = [
    ["Field Goal", Number(player.FG_PCT ?? 0), 0.6],
    ["3-Point", Number(player.FG3_PCT ?? 0), 0.45],
    ["Free Throw", Number(player.FT_PCT ?? 0), 0.95],
    ["True Shoot", Number(player.TS_PCT ?? 0), 0.7],
  ];

  return (
    <aside className={`card player-card ${pinned ? "pinned" : ""}`}>
      {pinned && <div className="pinned-tag">📌 Pinned</div>}
      <div className="pc-top">
        <PlayerAvatar
          playerId={player.PLAYER_ID}
          teamAbbr={player.TEAM_ABBREVIATION}
          size={56}
          myTeam={myTeam}
        />
        <div>
          <div className="pc-name">{player.PLAYER_NAME}</div>
          <div className="pc-meta">
            {(player.POSITION as string) || "—"} · {player.TEAM_ABBREVIATION} · Age {player.AGE}
          </div>
        </div>
        <button
          className={`follow-btn ${isFollowed ? "on" : ""}`}
          onClick={() => onToggleFollow(player.PLAYER_ID)}
        >
          {isFollowed ? "✓ Followed" : "+ Follow"}
        </button>
      </div>

      <div className="pc-bignums">
        <div>
          <div className="big">{num1(player.PTS)}</div>
          <div className="lbl">PTS</div>
        </div>
        <div>
          <div className="big">{num1(player.REB)}</div>
          <div className="lbl">REB</div>
        </div>
        <div>
          <div className="big">{num1(player.AST)}</div>
          <div className="lbl">AST</div>
        </div>
      </div>

      <div className="pc-bars">
        {bars.map(([label, v, max]) => (
          <div key={label} className="bar-row">
            <span className="bar-lbl">{label}</span>
            <div className="bar">
              <div
                className="bar-fill"
                style={{ width: `${Math.min(100, (v / max) * 100)}%` }}
              />
            </div>
            <span className="bar-val">{v ? (v * 100).toFixed(1) + "%" : "—"}</span>
          </div>
        ))}
      </div>

      <div className="pc-foot">
        <div className="foot-cell">
          <span className="lbl">USG%</span>
          <span className="val">{player.USG_PCT ? (player.USG_PCT * 100).toFixed(1) : "—"}</span>
        </div>
        <div className="foot-cell">
          <span className="lbl">ORTG</span>
          <span className="val">{player.OFF_RATING != null ? Number(player.OFF_RATING).toFixed(1) : "—"}</span>
        </div>
        <div className="foot-cell">
          <span className="lbl">DRTG</span>
          <span className="val">{player.DEF_RATING != null ? Number(player.DEF_RATING).toFixed(1) : "—"}</span>
        </div>
        <div className="foot-cell">
          <span className="lbl">+/-</span>
          <span className="val">{plusMinus(player.PLUS_MINUS)}</span>
        </div>
      </div>
    </aside>
  );
}
