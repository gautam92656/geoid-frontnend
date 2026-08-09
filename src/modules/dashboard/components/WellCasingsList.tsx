"use client";

import { StaticDrillingEntityList } from "./StaticDrillingEntityList";

type StaticWellCasingRow = {
  id: string;
  depthFrom: string;
  depthTo: string;
  type: string;
  comments: string;
};

const COLUMNS = [
  { id: "depthFrom", label: "Depth From (m)", getValue: (row: StaticWellCasingRow) => row.depthFrom },
  { id: "depthTo", label: "Depth To (m)", getValue: (row: StaticWellCasingRow) => row.depthTo },
  { id: "type", label: "Type", getValue: (row: StaticWellCasingRow) => row.type },
  { id: "comments", label: "Comments", getValue: (row: StaticWellCasingRow) => row.comments },
];

export function WellCasingsList() {
  return (
    <StaticDrillingEntityList<StaticWellCasingRow>
      columns={COLUMNS}
      gridTemplateColumns="120px 120px minmax(180px, 1fr) minmax(180px, 1fr) 72px"
      searchPlaceholder="Ex. PVC, 1.5, steel"
      searchAriaLabel="Search well casings"
      emptyMessage="No well casings yet. Use Add New to create one."
      emptySearchMessage="No well casings match your search."
      actionsLabel={(row) =>
        `Actions for ${row.type.trim() || "—"} at ${row.depthFrom.trim() || "—"}`
      }
    />
  );
}
