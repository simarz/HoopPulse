import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchTeamStats, type TeamStatRow } from "../api/teams";
import { useApp } from "../context/AppContext";
import TeamDot from "../components/TeamDot";

type Conf = "All" | "E" | "W";
type SeasonType = "Regular Season" | "Playoffs" | "Pre Season";

const SEASON_TYPES: SeasonType[] = ["Regular Season", "Playoffs", "Pre Season"];
const SEASON_LABEL: Record<SeasonType, string> = {
  "Regular Season": "Regular",
  "Playoffs": "Playoffs",
  "Pre Season": "Pre Season",
};

const CONFERENCE: Record<string, "E" | "W"> = {
  ATL: "E", BOS: "E", BKN: "E", CHA: "E", CHI: "E", CLE: "E", DET: "E", IND: "E",
  MIA: "E", MIL: "E", NYK: "E", ORL: "E", PHI: "E", TOR: "E", WAS: "E",
  DAL: "W", DEN: "W", GSW: "W", HOU: "W", LAC: "W", LAL: "W", MEM: "W", MIN: "W",
  NOP: "W", OKC: "W", PHX: "W", POR: "W", SAC: "W", SAS: "W", UTA: "W",
};

interface MergedTeam extends TeamStatRow {
  OFF_RATING?: number;
  DEF_RATING?: number;
  NET_RATING?: number;
  PACE?: number;
}

function deriveCity(name: string): string {
  if (!name) return "";
  const parts = name.trim().split(" ");
  if (parts.length <= 1) return name;
  // "Los Angeles Lakers" -> "Los Angeles"; "New York Knicks" -> "New York"
  return parts.slice(0, -1).join(" ");
}

export default function TeamsPage() {
  const { query, scope, myTeam } = useApp();
  const [conf, setConf] = useState<Conf>("All");
  const [seasonType, setSeasonType] = useState<SeasonType>("Regular Season");

  const baseQuery = useQuery({
    queryKey: ["teamStats", "2025-26", seasonType, "Base", "PerGame"],
    queryFn: () =>
      fetchTeamStats({
        season: "2025-26",
        season_type: seasonType,
        measure_type: "Base",
        per_mode: "PerGame",
      }),
    staleTime: 5 * 60 * 1000,
  });

  const advQuery = useQuery({
    queryKey: ["teamStats", "2025-26", seasonType, "Advanced", "PerGame"],
    queryFn: () =>
      fetchTeamStats({
        season: "2025-26",
        season_type: seasonType,
        measure_type: "Advanced",
        per_mode: "PerGame",
      }),
    staleTime: 5 * 60 * 1000,
  });

  const teams: MergedTeam[] = useMemo(() => {
    const base = baseQuery.data ?? [];
    const adv = advQuery.data ?? [];
    const advById = new Map(adv.map((t) => [t.TEAM_ID, t]));
    let merged: MergedTeam[] = base.map((b) => {
      const a = advById.get(b.TEAM_ID);
      return {
        ...b,
        OFF_RATING: a?.OFF_RATING,
        DEF_RATING: a?.DEF_RATING,
        NET_RATING: a?.NET_RATING,
        PACE: a?.PACE,
      };
    });

    if (scope === "My Team") merged = merged.filter((t) => t.TEAM_ABBREVIATION === myTeam);
    if (conf !== "All") merged = merged.filter((t) => CONFERENCE[t.TEAM_ABBREVIATION] === conf);
    if (query) {
      const q = query.toLowerCase();
      merged = merged.filter(
        (t) =>
          t.TEAM_NAME?.toLowerCase().includes(q) ||
          t.TEAM_ABBREVIATION?.toLowerCase().includes(q),
      );
    }
    merged.sort((a, b) => (b.W ?? 0) - (a.W ?? 0));
    return merged;
  }, [baseQuery.data, advQuery.data, scope, conf, query, myTeam]);

  const isLoading = baseQuery.isLoading;
  const isError = baseQuery.isError;

  const maxAbsNet = Math.max(
    1,
    ...teams.map((t) => Math.abs((t.OFF_RATING ?? 0) - (t.DEF_RATING ?? 0))),
  );

  return (
    <section className="card teams-card">
      <header className="card-hd">
        <h2>Standings &amp; Team Tempo</h2>
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
            {(["All", "E", "W"] as const).map((c) => (
              <button key={c} className={conf === c ? "on" : ""} onClick={() => setConf(c)}>
                {c === "E" ? "East" : c === "W" ? "West" : "All"}
              </button>
            ))}
          </div>
        </div>
      </header>

      {isLoading && <p className="status-msg">Loading standings…</p>}
      {isError && <p className="status-msg error">Failed to load team stats.</p>}

      {!isLoading && !isError && (
        <div className="teams-rows">
          {teams.map((t, i) => {
            const pct = (t.W_PCT ?? (t.W && t.W + t.L ? t.W / (t.W + t.L) : 0)) || 0;
            const ortg = t.OFF_RATING ?? 0;
            const drtg = t.DEF_RATING ?? 0;
            const net = t.NET_RATING ?? ortg - drtg;
            const netW = (Math.abs(net) / maxAbsNet) * 50;
            const opp = (t.PTS ?? 0) - (t.PLUS_MINUS ?? 0);
            return (
              <div
                key={t.TEAM_ID}
                className={`team-row ${t.TEAM_ABBREVIATION === myTeam ? "myteam" : ""}`}
              >
                <span className="rank">{i + 1}</span>
                <TeamDot abbr={t.TEAM_ABBREVIATION} size={34} myTeam={myTeam} />
                <div className="t-name">
                  <div className="t-city">{deriveCity(t.TEAM_NAME)}</div>
                  <div className="t-rec">
                    {t.W}–{t.L} · {(pct * 100).toFixed(1)}%
                  </div>
                </div>
                <div className="t-bar">
                  <div className="t-bar-track">
                    <div className="t-bar-fill" style={{ width: `${pct * 100}%` }} />
                  </div>
                </div>
                <div className="t-stat">
                  <span className="lbl">PTS</span>
                  <span className="val">{(t.PTS ?? 0).toFixed(1)}</span>
                </div>
                <div className="t-stat">
                  <span className="lbl">OPP</span>
                  <span className="val">{opp.toFixed(1)}</span>
                </div>
                <div className="t-net">
                  <span className="net-mid" />
                  {net >= 0 ? (
                    <span className="net-pos" style={{ width: `${netW}%`, left: "50%" }} />
                  ) : (
                    <span className="net-neg" style={{ width: `${netW}%`, right: "50%" }} />
                  )}
                  <span className={`net-val ${net >= 0 ? "pos" : "neg"}`}>
                    {net >= 0 ? "+" : ""}
                    {net.toFixed(1)}
                  </span>
                </div>
                <div className="t-stat">
                  <span className="lbl">PACE</span>
                  <span className="val">{t.PACE != null ? Number(t.PACE).toFixed(1) : "—"}</span>
                </div>
              </div>
            );
          })}
          {teams.length === 0 && (
            <p className="status-msg">No teams match the current filters.</p>
          )}
        </div>
      )}
    </section>
  );
}
