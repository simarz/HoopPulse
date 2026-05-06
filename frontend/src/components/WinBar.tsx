interface WinBarProps {
  awayPct: number;
  homePct: number;
  away: string;
  home: string;
}

export default function WinBar({ awayPct, homePct, away, home }: WinBarProps) {
  return (
    <div className="winbar">
      <div className="winbar-track">
        <div className="winbar-fill away" style={{ width: `${awayPct}%` }} />
        <div className="winbar-fill home" style={{ width: `${homePct}%` }} />
      </div>
      <div className="winbar-labels">
        <span><span className="dot away" /> {away} {Math.round(awayPct)}%</span>
        <span>{home} {Math.round(homePct)}% <span className="dot home" /></span>
      </div>
    </div>
  );
}
