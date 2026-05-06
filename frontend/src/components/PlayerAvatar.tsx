import { useState } from "react";
import TeamDot from "./TeamDot";

interface PlayerAvatarProps {
  playerId?: number | null;
  teamAbbr?: string;
  size?: number;
  myTeam?: string;
}

const NBA_HEADSHOT = (id: number) =>
  `https://cdn.nba.com/headshots/nba/latest/1040x760/${id}.png`;

export default function PlayerAvatar({
  playerId,
  teamAbbr,
  size = 28,
  myTeam,
}: PlayerAvatarProps) {
  const [failed, setFailed] = useState(false);

  // Without a player ID (or after a load failure) we degrade to the team logo,
  // which itself falls back to a colored badge if NBA's CDN is unreachable.
  if (!playerId || failed) {
    return <TeamDot abbr={teamAbbr ?? ""} size={size} myTeam={myTeam} />;
  }

  const isMine = !!myTeam && teamAbbr === myTeam;
  return (
    <span
      className={`player-avatar ${isMine ? "mine" : ""}`}
      style={{ width: size, height: size }}
    >
      <img
        src={NBA_HEADSHOT(playerId)}
        alt=""
        loading="lazy"
        onError={() => setFailed(true)}
      />
    </span>
  );
}
