import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { type ColumnDef } from "@tanstack/react-table";
import StatTable from "../components/StatTable";
import FilterBar from "../components/FilterBar";
import { fetchPlayerStats, type PlayerStatRow } from "../api/players";
import "./Page.css";

const MEASURE_OPTIONS = [
  { label: "Traditional", value: "Base" },
  { label: "Advanced", value: "Advanced" },
  { label: "Scoring", value: "Scoring" },
  { label: "Misc", value: "Misc" },
  { label: "Usage", value: "Usage" },
  { label: "Defense", value: "Defense" },
];

function playerCell(row: PlayerStatRow) {
  const pos = row.POSITION as string | undefined;
  return (
    <span>
      {row.PLAYER_NAME}
      {pos ? <span style={{ color: "#8892b0", marginLeft: 8 }}>{pos}</span> : null}
    </span>
  );
}

function fmt1(v: unknown) {
  const n = Number(v);
  return isNaN(n) ? "-" : n.toFixed(1);
}

function pct(v: unknown) {
  const n = Number(v);
  return isNaN(n) || n === 0 ? "-" : (n * 100).toFixed(1) + "%";
}

const BASE_COLS: ColumnDef<PlayerStatRow, unknown>[] = [
  { accessorKey: "PLAYER_NAME", header: "Player", enableSorting: true, cell: (i) => playerCell(i.row.original) },
  { accessorKey: "TEAM_ABBREVIATION", header: "Team" },
  { accessorKey: "AGE", header: "Age" },
  { accessorKey: "GP", header: "GP" },
  { accessorKey: "MIN", header: "MIN", cell: (i) => fmt1(i.getValue()) },
  { accessorKey: "PTS", header: "PTS", cell: (i) => fmt1(i.getValue()) },
  { accessorKey: "REB", header: "REB", cell: (i) => fmt1(i.getValue()) },
  { accessorKey: "AST", header: "AST", cell: (i) => fmt1(i.getValue()) },
  { accessorKey: "STL", header: "STL", cell: (i) => fmt1(i.getValue()) },
  { accessorKey: "BLK", header: "BLK", cell: (i) => fmt1(i.getValue()) },
  { accessorKey: "TOV", header: "TOV", cell: (i) => fmt1(i.getValue()) },
  { accessorKey: "FGM", header: "FGM", cell: (i) => fmt1(i.getValue()) },
  { accessorKey: "FGA", header: "FGA", cell: (i) => fmt1(i.getValue()) },
  { accessorKey: "FG_PCT", header: "FG%", cell: (i) => pct(i.getValue()) },
  { accessorKey: "FG3M", header: "3PM", cell: (i) => fmt1(i.getValue()) },
  { accessorKey: "FG3A", header: "3PA", cell: (i) => fmt1(i.getValue()) },
  { accessorKey: "FG3_PCT", header: "3P%", cell: (i) => pct(i.getValue()) },
  { accessorKey: "FTM", header: "FTM", cell: (i) => fmt1(i.getValue()) },
  { accessorKey: "FTA", header: "FTA", cell: (i) => fmt1(i.getValue()) },
  { accessorKey: "FT_PCT", header: "FT%", cell: (i) => pct(i.getValue()) },
  { accessorKey: "OREB", header: "OREB", cell: (i) => fmt1(i.getValue()) },
  { accessorKey: "DREB", header: "DREB", cell: (i) => fmt1(i.getValue()) },
  { accessorKey: "PF", header: "PF", cell: (i) => fmt1(i.getValue()) },
  { accessorKey: "PLUS_MINUS", header: "+/-", cell: (i) => fmt1(i.getValue()) },
];

const ADVANCED_COLS: ColumnDef<PlayerStatRow, unknown>[] = [
  { accessorKey: "PLAYER_NAME", header: "Player", cell: (i) => playerCell(i.row.original) },
  { accessorKey: "TEAM_ABBREVIATION", header: "Team" },
  { accessorKey: "AGE", header: "Age" },
  { accessorKey: "GP", header: "GP" },
  { accessorKey: "MIN", header: "MIN", cell: (i) => fmt1(i.getValue()) },
  { accessorKey: "OFF_RATING", header: "ORTG", cell: (i) => fmt1(i.getValue()) },
  { accessorKey: "DEF_RATING", header: "DRTG", cell: (i) => fmt1(i.getValue()) },
  { accessorKey: "NET_RATING", header: "NRTG", cell: (i) => fmt1(i.getValue()) },
  { accessorKey: "AST_PCT", header: "AST%", cell: (i) => pct(i.getValue()) },
  { accessorKey: "AST_TO", header: "AST/TO", cell: (i) => fmt1(i.getValue()) },
  { accessorKey: "AST_RATIO", header: "AST Ratio", cell: (i) => fmt1(i.getValue()) },
  { accessorKey: "OREB_PCT", header: "OREB%", cell: (i) => pct(i.getValue()) },
  { accessorKey: "DREB_PCT", header: "DREB%", cell: (i) => pct(i.getValue()) },
  { accessorKey: "REB_PCT", header: "REB%", cell: (i) => pct(i.getValue()) },
  { accessorKey: "USG_PCT", header: "USG%", cell: (i) => pct(i.getValue()) },
  { accessorKey: "EFG_PCT", header: "eFG%", cell: (i) => pct(i.getValue()) },
  { accessorKey: "TS_PCT", header: "TS%", cell: (i) => pct(i.getValue()) },
  { accessorKey: "PIE", header: "PIE", cell: (i) => pct(i.getValue()) },
  { accessorKey: "PACE", header: "PACE", cell: (i) => fmt1(i.getValue()) },
];

const SCORING_COLS: ColumnDef<PlayerStatRow, unknown>[] = [
  { accessorKey: "PLAYER_NAME", header: "Player", cell: (i) => playerCell(i.row.original) },
  { accessorKey: "TEAM_ABBREVIATION", header: "Team" },
  { accessorKey: "GP", header: "GP" },
  { accessorKey: "MIN", header: "MIN", cell: (i) => fmt1(i.getValue()) },
  { accessorKey: "PTS", header: "PTS", cell: (i) => fmt1(i.getValue()) },
  { accessorKey: "PCT_FGA_2PT", header: "2PA%", cell: (i) => pct(i.getValue()) },
  { accessorKey: "PCT_FGA_3PT", header: "3PA%", cell: (i) => pct(i.getValue()) },
  { accessorKey: "PCT_PTS_2PT", header: "2P PTS%", cell: (i) => pct(i.getValue()) },
  { accessorKey: "PCT_PTS_2PT_MR", header: "Mid%", cell: (i) => pct(i.getValue()) },
  { accessorKey: "PCT_PTS_3PT", header: "3P PTS%", cell: (i) => pct(i.getValue()) },
  { accessorKey: "PCT_PTS_FB", header: "FB PTS%", cell: (i) => pct(i.getValue()) },
  { accessorKey: "PCT_PTS_FT", header: "FT PTS%", cell: (i) => pct(i.getValue()) },
  { accessorKey: "PCT_PTS_OFF_TOV", header: "TOV PTS%", cell: (i) => pct(i.getValue()) },
  { accessorKey: "PCT_PTS_PAINT", header: "Paint PTS%", cell: (i) => pct(i.getValue()) },
];

function getColumns(measureType: string): ColumnDef<PlayerStatRow, unknown>[] {
  if (measureType === "Advanced") return ADVANCED_COLS;
  if (measureType === "Scoring") return SCORING_COLS;
  return BASE_COLS;
}

export default function PlayersPage() {
  const [season, setSeason] = useState("2025-26");
  const [seasonType, setSeasonType] = useState("Regular Season");
  const [measureType, setMeasureType] = useState("Base");
  const [perMode, setPerMode] = useState("PerGame");

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["playerStats", season, seasonType, measureType, perMode],
    queryFn: () => fetchPlayerStats({ season, season_type: seasonType, measure_type: measureType, per_mode: perMode }),
    staleTime: 6 * 60 * 60 * 1000,
    gcTime: 6 * 60 * 60 * 1000,
  });

  const columns = useMemo(() => getColumns(measureType), [measureType]);

  return (
    <div className="page">
      <h1 className="page-title">Player Stats</h1>
      <FilterBar
        season={season} onSeasonChange={setSeason}
        seasonType={seasonType} onSeasonTypeChange={setSeasonType}
        measureType={measureType} onMeasureTypeChange={setMeasureType}
        perMode={perMode} onPerModeChange={setPerMode}
        measureOptions={MEASURE_OPTIONS}
      />
      {isLoading && <p className="status">Loading stats — this may take a few seconds...</p>}
      {isError && <p className="status error">Failed to load stats: {(error as Error)?.message ?? "Unknown error"}</p>}
      {data && (
        <StatTable
          data={data}
          columns={columns}
          searchPlaceholder="Search player or team..."
        />
      )}
    </div>
  );
}
