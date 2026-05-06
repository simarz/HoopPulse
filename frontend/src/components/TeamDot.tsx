import { useState } from "react";
import { teamLogoUrl } from "../lib/teams";

interface TeamDotProps {
  abbr: string;
  size?: number;
  myTeam?: string;
}

export default function TeamDot({ abbr, size = 28, myTeam }: TeamDotProps) {
  const [failed, setFailed] = useState(false);
  const safe = (abbr || "?").slice(0, 4);
  const isMine = !!myTeam && safe === myTeam;
  const url = teamLogoUrl(safe);

  // Fall back to a colored badge when we don't have an NBA logo for this code,
  // or the logo failed to load (CDN hiccup, offline, blocked, etc).
  if (!url || failed) {
    const hash = [...safe].reduce((a, c) => a * 31 + c.charCodeAt(0), 7);
    const hue = Math.abs(hash) % 360;
    const fg = isMine ? "var(--orange)" : `oklch(0.65 0.14 ${hue})`;
    const bg = isMine ? "var(--blue)" : `oklch(0.30 0.10 ${(hue + 200) % 360})`;
    return (
      <span
        className={`team-dot fallback ${isMine ? "mine" : ""}`}
        style={{ width: size, height: size, background: bg, color: fg, fontSize: size * 0.36 }}
      >
        {safe}
      </span>
    );
  }

  return (
    <span
      className={`team-dot ${isMine ? "mine" : ""}`}
      style={{ width: size, height: size }}
      title={safe}
    >
      <img
        src={url}
        alt={safe}
        width={size}
        height={size}
        loading="lazy"
        onError={() => setFailed(true)}
      />
    </span>
  );
}
