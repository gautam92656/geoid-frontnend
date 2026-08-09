"use client";

import { StaticDrillingEntityList } from "./StaticDrillingEntityList";

type StaticWellLogRow = {
  id: string;
  wellId: string;
  depthFrom: string;
  depthTo: string;
  wellType: string;
  comments: string;
};

const COLUMNS = [
  { id: "wellId", label: "Well ID", getValue: (row: StaticWellLogRow) => row.wellId },
  { id: "depthFrom", label: "Depth From (m)", getValue: (row: StaticWellLogRow) => row.depthFrom },
  { id: "depthTo", label: "Depth To (m)", getValue: (row: StaticWellLogRow) => row.depthTo },
  { id: "wellType", label: "Well Type", getValue: (row: StaticWellLogRow) => row.wellType },
  { id: "comments", label: "Comments", getValue: (row: StaticWellLogRow) => row.comments },
];

export function WellLogsList() {
  return (
    <StaticDrillingEntityList<StaticWellLogRow>
      columns={COLUMNS}
      gridTemplateColumns="120px 120px 120px minmax(160px, 1fr) minmax(160px, 1fr) 72px"
      searchPlaceholder="Ex. MW-01, 1.5, monitoring"
      searchAriaLabel="Search well logs"
      emptyMessage="No well logs yet. Use Add New to create one."
      emptySearchMessage="No well logs match your search."
      actionsLabel={(row) =>
        `Actions for ${row.wellId.trim() || "—"} (${row.wellType.trim() || "—"})`
      }
    />
  );
}
