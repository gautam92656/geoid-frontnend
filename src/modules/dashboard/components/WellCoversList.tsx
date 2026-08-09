"use client";

import { StaticDrillingEntityList } from "./StaticDrillingEntityList";

type StaticWellCoverRow = {
  id: string;
  wellId: string;
  wellCoverType: string;
  comments: string;
};

const COLUMNS = [
  { id: "wellId", label: "Well ID", getValue: (row: StaticWellCoverRow) => row.wellId },
  {
    id: "wellCoverType",
    label: "Well Cover Type",
    getValue: (row: StaticWellCoverRow) => row.wellCoverType,
  },
  { id: "comments", label: "Comments", getValue: (row: StaticWellCoverRow) => row.comments },
];

export function WellCoversList() {
  return (
    <StaticDrillingEntityList<StaticWellCoverRow>
      columns={COLUMNS}
      gridTemplateColumns="140px minmax(180px, 1fr) minmax(180px, 1fr) 72px"
      searchPlaceholder="Ex. MW-01, flush mount"
      searchAriaLabel="Search well covers"
      emptyMessage="No well covers yet. Use Add New to create one."
      emptySearchMessage="No well covers match your search."
      actionsLabel={(row) =>
        `Actions for ${row.wellId.trim() || "—"} (${row.wellCoverType.trim() || "—"})`
      }
    />
  );
}
