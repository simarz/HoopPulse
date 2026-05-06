import { NavLink } from "react-router-dom";
import { useApp } from "../context/AppContext";
import { useQuery } from "@tanstack/react-query";
import { fetchScoreboard } from "../api/live";
import TeamPicker from "./TeamPicker";

interface ScoreboardResponse {
  scoreboard?: { games?: Array<{ gameStatus?: number }> };
}

const TABS: Array<{ to: string; label: string; icon: string; live?: boolean; key: string }> = [
  { to: "/players", label: "Players", icon: "★", key: "players" },
  { to: "/teams", label: "Teams", icon: "◎", key: "teams" },
  { to: "/live", label: "Live", icon: "●", live: true, key: "live" },
  { to: "/props", label: "Picks", icon: "✦", key: "props" },
];

export default function Header() {
  const { query, setQuery, scope, setScope, dark, toggleDark } = useApp();

  const { data: scoreboard } = useQuery<ScoreboardResponse>({
    queryKey: ["scoreboard"],
    queryFn: fetchScoreboard,
    refetchInterval: 30_000,
    staleTime: 25_000,
  });

  // gameStatus 2 = live in NBA's scoreboard schema.
  const liveCount =
    scoreboard?.scoreboard?.games?.filter((g) => g.gameStatus === 2).length ?? 0;

  return (
    <header className="hdr">
      <div className="hdr-brand">
        <div className="logo">
          <span className="logo-dot orange" />
          <span className="logo-dot blue" />
        </div>
        <div className="brand-text">
          <div className="brand-name">Hoop&nbsp;Pulse</div>
          <div className="brand-sub">2025–26 · Reg. Season</div>
        </div>
      </div>

      <nav className="hdr-tabs">
        {TABS.map((t) => (
          <NavLink
            key={t.key}
            to={t.to}
            className={({ isActive }) => `tab ${isActive ? "active" : ""}`}
          >
            <span className={`tab-icon ${t.live ? "live-pulse" : ""}`}>{t.icon}</span>
            <span>{t.label}</span>
            {t.key === "live" && liveCount > 0 && (
              <span className="live-count">{liveCount}</span>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="hdr-right">
        <div className="scope-toggle" role="tablist">
          {(["League", "My Team"] as const).map((s) => (
            <button
              key={s}
              className={scope === s ? "on" : ""}
              onClick={() => setScope(s)}
            >
              {s}
            </button>
          ))}
        </div>
        <TeamPicker />
        <button className="dark-toggle" onClick={toggleDark} title={dark ? "Switch to light mode" : "Switch to dark mode"}>
          {dark ? "☀" : "☾"}
        </button>
        <div className="search">
          <span className="search-ic">⌕</span>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search players, teams…"
          />
          <kbd>⌘K</kbd>
        </div>
      </div>
    </header>
  );
}
