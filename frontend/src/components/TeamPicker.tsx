import { useEffect, useRef, useState } from "react";
import { useApp } from "../context/AppContext";
import { TEAM_NAMES, TEAMS_BY_NAME } from "../lib/teams";
import TeamDot from "./TeamDot";

export default function TeamPicker() {
  const { myTeam, setMyTeam } = useApp();
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDocClick = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div className="team-picker" ref={wrapRef}>
      <button
        type="button"
        className="team-picker-btn"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        title={`Favorite team: ${TEAM_NAMES[myTeam] ?? myTeam}`}
      >
        <TeamDot abbr={myTeam} size={20} myTeam={myTeam} />
        <span className="team-picker-abbr">{myTeam}</span>
        <span className="team-picker-caret" aria-hidden>▾</span>
      </button>

      {open && (
        <div className="team-picker-menu" role="listbox">
          {TEAMS_BY_NAME.map((abbr) => (
            <button
              key={abbr}
              role="option"
              aria-selected={abbr === myTeam}
              className={`team-picker-item ${abbr === myTeam ? "on" : ""}`}
              onClick={() => {
                setMyTeam(abbr);
                setOpen(false);
              }}
            >
              <TeamDot abbr={abbr} size={22} myTeam={myTeam} />
              <span className="tp-name">{TEAM_NAMES[abbr]}</span>
              <span className="tp-abbr">{abbr}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
