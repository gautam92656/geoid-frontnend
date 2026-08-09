"use client";

import { StaticDrillingEntityList } from "./StaticDrillingEntityList";

type StaticDrillingResistanceRow = {
  id: string;
  depthFrom: string;
  depthTo: string;
  resistanceType: string;
  comments: string;
};

const COLUMNS = [
  {
    id: "depthFrom",
    label: "Depth From (m)",
    getValue: (row: StaticDrillingResistanceRow) => row.depthFrom,
  },
  {
    id: "depthTo",
    label: "Depth To (m)",
    getValue: (row: StaticDrillingResistanceRow) => row.depthTo,
  },
  {
    id: "resistanceType",
    label: "Resistance Type",
    getValue: (row: StaticDrillingResistanceRow) => row.resistanceType,
  },
  {
    id: "comments",
    label: "Comments",
    getValue: (row: StaticDrillingResistanceRow) => row.comments,
  },
];

export function DrillingResistancesList() {
  return (
    <StaticDrillingEntityList<StaticDrillingResistanceRow>
      columns={COLUMNS}
      gridTemplateColumns="120px 120px minmax(180px, 1fr) minmax(180px, 1fr) 72px"
      searchPlaceholder="Ex. Chatter, 1.5, vibration"
      searchAriaLabel="Search drilling resistances"
      emptyMessage="No drilling resistances yet. Use Add New to create one."
      emptySearchMessage="No drilling resistances match your search."
      actionsLabel={(row) =>
        `Actions for ${row.resistanceType.trim() || "—"} at ${row.depthFrom.trim() || "—"}`
      }
    />
  );
}
