"use client";

import { StaticDrillingEntityList } from "./StaticDrillingEntityList";

type StaticDrillingMethodRow = {
  id: string;
  depthFrom: string;
  depthTo: string;
  drillingMethod: string;
};

const COLUMNS = [
  { id: "depthFrom", label: "Depth From (m)", getValue: (row: StaticDrillingMethodRow) => row.depthFrom },
  { id: "depthTo", label: "Depth To (m)", getValue: (row: StaticDrillingMethodRow) => row.depthTo },
  {
    id: "drillingMethod",
    label: "Drilling Method",
    getValue: (row: StaticDrillingMethodRow) => row.drillingMethod,
  },
];

export function DrillingMethodsList() {
  return (
    <StaticDrillingEntityList<StaticDrillingMethodRow>
      columns={COLUMNS}
      gridTemplateColumns="120px 120px minmax(220px, 1fr) 72px"
      searchPlaceholder="Ex. Auger, 1.5, coring"
      searchAriaLabel="Search drilling methods"
      emptyMessage="No drilling methods yet. Use Add New to create one."
      emptySearchMessage="No drilling methods match your search."
      actionsLabel={(row) =>
        `Actions for ${row.drillingMethod.trim() || "—"} at ${row.depthFrom.trim() || "—"}`
      }
    />
  );
}
