import { useState } from "react";
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
} from "@tanstack/react-table";
import "./StatTable.css";

interface Props<T extends object> {
  data: T[];
  columns: ColumnDef<T, unknown>[];
  searchKey?: string;
  searchPlaceholder?: string;
}

export default function StatTable<T extends object>({
  data,
  columns,
  searchPlaceholder = "Search...",
}: Props<T>) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = useState("");

  const table = useReactTable({
    data,
    columns,
    state: { sorting, globalFilter },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  });

  return (
    <div className="stat-table-wrapper">
      <input
        className="search-input"
        value={globalFilter}
        onChange={(e) => setGlobalFilter(e.target.value)}
        placeholder={searchPlaceholder}
      />
      <div className="table-scroll">
        <table className="stat-table">
          <thead>
            {table.getHeaderGroups().map((hg) => (
              <tr key={hg.id}>
                {hg.headers.map((header) => {
                  const sorted = header.column.getIsSorted();
                  return (
                    <th
                      key={header.id}
                      onClick={header.column.getToggleSortingHandler()}
                      className={header.column.getCanSort() ? "sortable" : ""}
                    >
                      {flexRender(header.column.columnDef.header, header.getContext())}
                      <span className="sort-icon">
                        {sorted === "asc" ? " ▲" : sorted === "desc" ? " ▼" : ""}
                      </span>
                    </th>
                  );
                })}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.map((row) => (
              <tr key={row.id}>
                {row.getVisibleCells().map((cell) => (
                  <td key={cell.id}>
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        {table.getRowModel().rows.length === 0 && (
          <p className="no-data">No results found.</p>
        )}
      </div>
    </div>
  );
}
