import "./FilterBar.css";

interface SelectOption {
  label: string;
  value: string;
}

interface FilterBarProps {
  season: string;
  onSeasonChange: (v: string) => void;
  seasonType: string;
  onSeasonTypeChange: (v: string) => void;
  measureType: string;
  onMeasureTypeChange: (v: string) => void;
  perMode: string;
  onPerModeChange: (v: string) => void;
  measureOptions: SelectOption[];
  showPerMode?: boolean;
}

const SEASONS = ["2025-26", "2024-25", "2023-24", "2022-23", "2021-22", "2020-21", "2019-20"];
const SEASON_TYPES = ["Regular Season", "Playoffs", "Pre Season"];
const PER_MODES: SelectOption[] = [
  { label: "Per Game", value: "PerGame" },
  { label: "Totals", value: "Totals" },
  { label: "Per 36 Min", value: "Per36" },
  { label: "Per 100 Poss", value: "Per100Possessions" },
];

export default function FilterBar({
  season,
  onSeasonChange,
  seasonType,
  onSeasonTypeChange,
  measureType,
  onMeasureTypeChange,
  perMode,
  onPerModeChange,
  measureOptions,
  showPerMode = true,
}: FilterBarProps) {
  return (
    <div className="filter-bar">
      <label className="filter-group">
        <span>Season</span>
        <select value={season} onChange={(e) => onSeasonChange(e.target.value)}>
          {SEASONS.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </label>

      <label className="filter-group">
        <span>Season Type</span>
        <select value={seasonType} onChange={(e) => onSeasonTypeChange(e.target.value)}>
          {SEASON_TYPES.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
      </label>

      <label className="filter-group">
        <span>Stats</span>
        <select value={measureType} onChange={(e) => onMeasureTypeChange(e.target.value)}>
          {measureOptions.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </label>

      {showPerMode && (
        <label className="filter-group">
          <span>Mode</span>
          <select value={perMode} onChange={(e) => onPerModeChange(e.target.value)}>
            {PER_MODES.map((m) => (
              <option key={m.value} value={m.value}>{m.label}</option>
            ))}
          </select>
        </label>
      )}
    </div>
  );
}
