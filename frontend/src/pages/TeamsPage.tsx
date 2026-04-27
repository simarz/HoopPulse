import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { type ColumnDef } from "@tanstack/react-table";
import StatTable from "../components/StatTable";
import FilterBar from "../components/FilterBar";
import { fetchTeamStats, type TeamStatRow } from "../api/teams";
import "./Page.css";

const MEASURE_OPTIONS = [
  { label: "Traditional", value: "Base" },
  { label: "Advanced", value: "Advanced" },
  { label: "Four Factors", value: "Four Factors" },
  { label: "Misc", value: "Misc" },
  { label: "Scoring", value: "Scoring" },
  { label: "Opponent", value: "Opponent" },
  { label: "Defense", value: "Defense" },
];

function fmt1(v: unknown) {
  const n = Number(v);
  return isNaN(n) ? "-" : n.toFixed(1);
}

function pct(v: unknown) {
  const n = Number(v);
  return isNaN(n) || n === 0 ? "-" : (n * 100).toFixed(1) + "%";
}

const BASE_COLS: ColumnDef<TeamStatRow, unknown>[] = [
  { accessorKey: "TEAM_NAME", header: "Team", enableSorting: true },
  { accessorKey: "GP", header: "GP" },
  { accessorKey: "W", header: "W" },
  { accessorKey: "L", header: "L" },
  { accessorKey: "W_PCT", header: "W%", cell: (i) => pct(i.getValue()) },
  { accessorKey: "MIN", header: "MIN", cell: (i) => fmt1(i.getValue()) },
  { accessorKey: "PTS", header: "PTS", cell: (i) => fmt1(i.getValue()) },
  { accessorKey: "REB", header: "REB", cell: (i) => fmt1(i.getValue()) },
  { accessorKey: "AST", header: "AST", cell: (i) => fmt1(i.getValue()) },
  { accessorKey: "STL", header: "STL", cell: (i) => fmt1(i.getValue()) },
  { accessorKey: "BLK", header: "BLK", cell: (i) => fmt1(i.getValue()) },
  { accessorKey: "TOV", header: "TOV", cell: (i) => fmt1(i.getValue()) },
  { accessorKey: "FG_PCT", header: "FG%", cell: (i) => pct(i.getValue()) },
  { accessorKey: "FG3_PCT", header: "3P%", cell: (i) => pct(i.getValue()) },
  { accessorKey: "FT_PCT", header: "FT%", cell: (i) => pct(i.getValue()) },
  { accessorKey: "OREB", header: "OREB", cell: (i) => fmt1(i.getValue()) },
  { accessorKey: "DREB", header: "DREB", cell: (i) => fmt1(i.getValue()) },
  { accessorKey: "PLUS_MINUS", header: "+/-", cell: (i) => fmt1(i.getValue()) },
];

const ADVANCED_COLS: ColumnDef<TeamStatRow, unknown>[] = [
  { accessorKey: "TEAM_NAME", header: "Team" },
  { accessorKey: "GP", header: "GP" },
  { accessorKey: "W", header: "W" },
  { accessorKey: "L", header: "L" },
  { accessorKey: "W_PCT", header: "W%", cell: (i) => pct(i.getValue()) },
  { accessorKey: "MIN", header: "MIN", cell: (i) => fmt1(i.getValue()) },
  { accessorKey: "OFF_RATING", header: "ORTG", cell: (i) => fmt1(i.getValue()) },
  { accessorKey: "DEF_RATING", header: "DRTG", cell: (i) => fmt1(i.getValue()) },
  { accessorKey: "NET_RATING", header: "NRTG", cell: (i) => fmt1(i.getValue()) },
  { accessorKey: "AST_PCT", header: "AST%", cell: (i) => pct(i.getValue()) },
  { accessorKey: "AST_TO", header: "AST/TO", cell: (i) => fmt1(i.getValue()) },
  { accessorKey: "OREB_PCT", header: "OREB%", cell: (i) => pct(i.getValue()) },
  { accessorKey: "DREB_PCT", header: "DREB%", cell: (i) => pct(i.getValue()) },
  { accessorKey: "REB_PCT", header: "REB%", cell: (i) => pct(i.getValue()) },
  { accessorKey: "EFG_PCT", header: "eFG%", cell: (i) => pct(i.getValue()) },
  { accessorKey: "TS_PCT", header: "TS%", cell: (i) => pct(i.getValue()) },
  { accessorKey: "PACE", header: "PACE", cell: (i) => fmt1(i.getValue()) },
  { accessorKey: "PIE", header: "PIE", cell: (i) => pct(i.getValue()) },
];

function getColumns(measureType: string): ColumnDef<TeamStatRow, unknown>[] {
  if (measureType === "Advanced") return ADVANCED_COLS;
  return BASE_COLS;
}

export default function TeamsPage() {
  const [season, setSeason] = useState("2025-26");
  const [seasonType, setSeasonType] = useState("Regular Season");
  const [measureType, setMeasureType] = useState("Base");
  const [perMode, setPerMode] = useState("PerGame");

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["teamStats", season, seasonType, measureType, perMode],
    queryFn: () => fetchTeamStats({ season, season_type: seasonType, measure_type: measureType, per_mode: perMode }),
    staleTime: 5 * 60 * 1000,
  });

  const columns = useMemo(() => getColumns(measureType), [measureType]);

  return (
    <div className="page">
      <h1 className="page-title">Team Stats</h1>
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
          searchPlaceholder="Search team..."
        />
      )}
    </div>
  );
}
