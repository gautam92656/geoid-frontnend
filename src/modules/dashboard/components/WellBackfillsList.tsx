"use client";

import { StaticDrillingEntityList } from "./StaticDrillingEntityList";

type StaticWellBackfillRow = {
  id: string;
  depthFrom: string;
  depthTo: string;
  backfillType: string;
  comments: string;
};

const COLUMNS = [
  {
    id: "depthFrom",
    label: "Depth From (m)",
    getValue: (row: StaticWellBackfillRow) => row.depthFrom,
  },
  { id: "depthTo", label: "Depth To (m)", getValue: (row: StaticWellBackfillRow) => row.depthTo },
  {
    id: "backfillType",
    label: "Backfill Type",
    getValue: (row: StaticWellBackfillRow) => row.backfillType,
  },
  { id: "comments", label: "Comments", getValue: (row: StaticWellBackfillRow) => row.comments },
];

export function WellBackfillsList() {
  return (
    <StaticDrillingEntityList<StaticWellBackfillRow>
      columns={COLUMNS}
      gridTemplateColumns="120px 120px minmax(180px, 1fr) minmax(180px, 1fr) 72px"
      searchPlaceholder="Ex. Bentonite, 1.5, sand"
      searchAriaLabel="Search well backfills"
      emptyMessage="No well backfills yet. Use Add New to create one."
      emptySearchMessage="No well backfills match your search."
      actionsLabel={(row) =>
        `Actions for ${row.backfillType.trim() || "—"} at ${row.depthFrom.trim() || "—"}`
      }
    />
  );
}
