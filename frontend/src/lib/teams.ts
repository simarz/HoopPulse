// Approximate brand colors for all 30 NBA teams.
// `primary` drives --blue (UI primary, tabs, sparkline). `accent` drives
// --orange (warm accent, hot tags, "Add to slip", live flag).

export interface TeamPalette {
  primary: string;
  accent: string;
}

export const TEAM_PALETTES: Record<string, TeamPalette> = {
  ATL: { primary: "#E03A3E", accent: "#C1D32F" },
  BOS: { primary: "#007A33", accent: "#BA9653" },
  BKN: { primary: "#1A1A1A", accent: "#9C9C9C" },
  CHA: { primary: "#1D1160", accent: "#00788C" },
  CHI: { primary: "#CE1141", accent: "#1D1160" },
  CLE: { primary: "#6F263D", accent: "#FFB81C" },
  DAL: { primary: "#00538C", accent: "#B8C4CA" },
  DEN: { primary: "#0E2240", accent: "#FEC524" },
  DET: { primary: "#C8102E", accent: "#1D42BA" },
  GSW: { primary: "#1D428A", accent: "#FFC72C" },
  HOU: { primary: "#CE1141", accent: "#000000" },
  IND: { primary: "#002D62", accent: "#FDBB30" },
  LAC: { primary: "#1D428A", accent: "#C8102E" },
  LAL: { primary: "#552583", accent: "#FDB927" },
  MEM: { primary: "#5D76A9", accent: "#12173F" },
  MIA: { primary: "#98002E", accent: "#F9A01B" },
  MIL: { primary: "#00471B", accent: "#EEE1C6" },
  MIN: { primary: "#0C2340", accent: "#78BE20" },
  NOP: { primary: "#0C2340", accent: "#C8102E" },
  NYK: { primary: "#006BB6", accent: "#F58426" },
  OKC: { primary: "#007AC1", accent: "#EF3B24" },
  ORL: { primary: "#0077C0", accent: "#C4CED4" },
  PHI: { primary: "#006BB6", accent: "#ED174C" },
  PHX: { primary: "#1D1160", accent: "#E56020" },
  POR: { primary: "#1A1A1A", accent: "#E03A3E" },
  SAC: { primary: "#5A2D81", accent: "#63727A" },
  SAS: { primary: "#1A1A1A", accent: "#C4CED4" },
  TOR: { primary: "#CE1141", accent: "#000000" },
  UTA: { primary: "#002B5C", accent: "#F9A01B" },
  WAS: { primary: "#002B5C", accent: "#E31837" },
};

// NBA team IDs (from nba_api / nba.com stats). Used to build CDN logo URLs.
export const TEAM_IDS: Record<string, number> = {
  ATL: 1610612737, BOS: 1610612738, BKN: 1610612751, CHA: 1610612766,
  CHI: 1610612741, CLE: 1610612739, DAL: 1610612742, DEN: 1610612743,
  DET: 1610612765, GSW: 1610612744, HOU: 1610612745, IND: 1610612754,
  LAC: 1610612746, LAL: 1610612747, MEM: 1610612763, MIA: 1610612748,
  MIL: 1610612749, MIN: 1610612750, NOP: 1610612740, NYK: 1610612752,
  OKC: 1610612760, ORL: 1610612753, PHI: 1610612755, PHX: 1610612756,
  POR: 1610612757, SAC: 1610612758, SAS: 1610612759, TOR: 1610612761,
  UTA: 1610612762, WAS: 1610612764,
};

export function teamLogoUrl(abbr: string): string | null {
  const id = TEAM_IDS[abbr];
  return id ? `https://cdn.nba.com/logos/nba/${id}/primary/L/logo.svg` : null;
}

export const TEAM_NAMES: Record<string, string> = {
  ATL: "Atlanta Hawks", BOS: "Boston Celtics", BKN: "Brooklyn Nets",
  CHA: "Charlotte Hornets", CHI: "Chicago Bulls", CLE: "Cleveland Cavaliers",
  DAL: "Dallas Mavericks", DEN: "Denver Nuggets", DET: "Detroit Pistons",
  GSW: "Golden State Warriors", HOU: "Houston Rockets", IND: "Indiana Pacers",
  LAC: "LA Clippers", LAL: "Los Angeles Lakers", MEM: "Memphis Grizzlies",
  MIA: "Miami Heat", MIL: "Milwaukee Bucks", MIN: "Minnesota Timberwolves",
  NOP: "New Orleans Pelicans", NYK: "New York Knicks", OKC: "Oklahoma City Thunder",
  ORL: "Orlando Magic", PHI: "Philadelphia 76ers", PHX: "Phoenix Suns",
  POR: "Portland Trail Blazers", SAC: "Sacramento Kings", SAS: "San Antonio Spurs",
  TOR: "Toronto Raptors", UTA: "Utah Jazz", WAS: "Washington Wizards",
};

export const TEAM_ABBRS = Object.keys(TEAM_PALETTES);

// Sorted by full team name (city) for the picker dropdown.
export const TEAMS_BY_NAME = [...TEAM_ABBRS].sort((a, b) =>
  TEAM_NAMES[a].localeCompare(TEAM_NAMES[b]),
);

export function applyTeamPalette(abbr: string): void {
  const p = TEAM_PALETTES[abbr] ?? TEAM_PALETTES.NYK;
  const root = document.documentElement.style;
  root.setProperty("--blue", p.primary);
  root.setProperty("--blue-deep", `color-mix(in oklch, ${p.primary} 78%, black 22%)`);
  root.setProperty("--blue-soft", `color-mix(in oklch, ${p.primary} 12%, white 88%)`);
  root.setProperty("--orange", p.accent);
  root.setProperty("--orange-deep", `color-mix(in oklch, ${p.accent} 86%, black 14%)`);
  root.setProperty("--orange-soft", `color-mix(in oklch, ${p.accent} 14%, white 86%)`);
}
