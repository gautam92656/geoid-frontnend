"use client";

import { StaticDrillingEntityList } from "./StaticDrillingEntityList";

type StaticDrillingObservationRow = {
  id: string;
  depth: string;
  observationType: string;
  comments: string;
};

const COLUMNS = [
  { id: "depth", label: "Depth (m)", getValue: (row: StaticDrillingObservationRow) => row.depth },
  {
    id: "observationType",
    label: "Observation Type",
    getValue: (row: StaticDrillingObservationRow) => row.observationType,
  },
  {
    id: "comments",
    label: "Comments",
    getValue: (row: StaticDrillingObservationRow) => row.comments,
  },
];

export function DrillingObservationsList() {
  return (
    <StaticDrillingEntityList<StaticDrillingObservationRow>
      columns={COLUMNS}
      gridTemplateColumns="120px minmax(180px, 1fr) minmax(180px, 1fr) 72px"
      searchPlaceholder="Ex. Water encountered, 1.5, cave in"
      searchAriaLabel="Search drilling observations"
      emptyMessage="No drilling observations yet. Use Add New to create one."
      emptySearchMessage="No drilling observations match your search."
      actionsLabel={(row) =>
        `Actions for ${row.observationType.trim() || "—"} at ${row.depth.trim() || "—"}`
      }
    />
  );
}
