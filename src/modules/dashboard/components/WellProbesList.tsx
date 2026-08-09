"use client";

import { StaticDrillingEntityList } from "./StaticDrillingEntityList";

type StaticWellProbeRow = {
  id: string;
  wellId: string;
  depth: string;
  type: string;
  comments: string;
};

const COLUMNS = [
  { id: "wellId", label: "Well ID", getValue: (row: StaticWellProbeRow) => row.wellId },
  { id: "depth", label: "Depth (m)", getValue: (row: StaticWellProbeRow) => row.depth },
  { id: "type", label: "Type", getValue: (row: StaticWellProbeRow) => row.type },
  { id: "comments", label: "Comments", getValue: (row: StaticWellProbeRow) => row.comments },
];

export function WellProbesList() {
  return (
    <StaticDrillingEntityList<StaticWellProbeRow>
      columns={COLUMNS}
      gridTemplateColumns="140px 120px minmax(160px, 1fr) minmax(160px, 1fr) 72px"
      searchPlaceholder="Ex. MW-01, 5.0, transducer"
      searchAriaLabel="Search well probes and instruments"
      emptyMessage="No well probes yet. Use Add New to create one."
      emptySearchMessage="No well probes match your search."
      actionsLabel={(row) =>
        `Actions for ${row.wellId.trim() || "—"} (${row.type.trim() || "—"})`
      }
    />
  );
}
