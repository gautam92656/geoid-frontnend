"use client";

import { StaticDrillingEntityList } from "./StaticDrillingEntityList";

type StaticDrillingCasingRow = {
  id: string;
  depthFrom: string;
  depthTo: string;
  casingType: string;
};

const COLUMNS = [
  { id: "depthFrom", label: "Depth From (m)", getValue: (row: StaticDrillingCasingRow) => row.depthFrom },
  { id: "depthTo", label: "Depth To (m)", getValue: (row: StaticDrillingCasingRow) => row.depthTo },
  {
    id: "casingType",
    label: "Casing Type",
    getValue: (row: StaticDrillingCasingRow) => row.casingType,
  },
];

export function DrillingCasingsList() {
  return (
    <StaticDrillingEntityList<StaticDrillingCasingRow>
      columns={COLUMNS}
      gridTemplateColumns="120px 120px minmax(220px, 1fr) 72px"
      searchPlaceholder="Ex. 200mm Casing, 1.5"
      searchAriaLabel="Search drilling casings"
      emptyMessage="No drilling casings yet. Use Add New to create one."
      emptySearchMessage="No drilling casings match your search."
      actionsLabel={(row) =>
        `Actions for ${row.casingType.trim() || "—"} at ${row.depthFrom.trim() || "—"}`
      }
    />
  );
}
