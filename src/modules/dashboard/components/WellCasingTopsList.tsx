"use client";

import { StaticDrillingEntityList } from "./StaticDrillingEntityList";

type StaticWellCasingTopRow = {
  id: string;
  elevation: string;
  depthFrom: string;
  depthTo: string;
  type: string;
  notes: string;
};

const COLUMNS = [
  {
    id: "elevation",
    label: "Elevation (m)",
    getValue: (row: StaticWellCasingTopRow) => row.elevation,
  },
  {
    id: "depthFrom",
    label: "Depth From (m)",
    getValue: (row: StaticWellCasingTopRow) => row.depthFrom,
  },
  { id: "depthTo", label: "Depth To (m)", getValue: (row: StaticWellCasingTopRow) => row.depthTo },
  { id: "type", label: "Type", getValue: (row: StaticWellCasingTopRow) => row.type },
  { id: "notes", label: "Notes", getValue: (row: StaticWellCasingTopRow) => row.notes },
];

export function WellCasingTopsList() {
  return (
    <StaticDrillingEntityList<StaticWellCasingTopRow>
      columns={COLUMNS}
      gridTemplateColumns="120px 120px 120px minmax(140px, 1fr) minmax(140px, 1fr) 72px"
      searchPlaceholder="Ex. 12.5, PVC, top of casing"
      searchAriaLabel="Search well casing tops"
      emptyMessage="No well casing tops yet. Use Add New to create one."
      emptySearchMessage="No well casing tops match your search."
      actionsLabel={(row) =>
        `Actions for ${row.type.trim() || "—"} at elevation ${row.elevation.trim() || "—"}`
      }
    />
  );
}
