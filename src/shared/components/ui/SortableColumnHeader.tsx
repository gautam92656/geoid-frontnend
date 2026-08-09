import type { ReactNode } from "react";
import type { SortOrder } from "@/shared/utils/tableSort";

type SortableColumnHeaderProps = Readonly<{
  children: ReactNode;
  field: string;
  activeField: string | null;
  activeOrder: SortOrder;
  onSort: (field: string) => void;
  sortable?: boolean;
}>;

function SortIcon({ order }: Readonly<{ order: SortOrder | null }>) {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M8 9l4-4 4 4"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity={order === "desc" ? 0.35 : 1}
      />
      <path
        d="M8 15l4 4 4-4"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity={order === "asc" ? 0.35 : 1}
      />
    </svg>
  );
}

export function SortableColumnHeader({
  children,
  field,
  activeField,
  activeOrder,
  onSort,
  sortable = true,
}: SortableColumnHeaderProps) {
  if (!sortable) {
    return (
      <span className="data-table__sort data-table__sort--static">
        <span className="data-table__sort-label">{children}</span>
      </span>
    );
  }

  const isActive = activeField === field;
  const nextOrder = !isActive ? "asc" : activeOrder === "asc" ? "desc" : "none";

  return (
    <button
      type="button"
      className={["data-table__sort", isActive ? "data-table__sort--active" : ""]
        .filter(Boolean)
        .join(" ")}
      onClick={() => onSort(field)}
      aria-label={`Sort by ${typeof children === "string" ? children : field}${
        isActive ? `, ${activeOrder}` : ""
      }`}
    >
      <span className="data-table__sort-label">{children}</span>
      <span className="data-table__sort-icon">
        <SortIcon order={isActive ? activeOrder : null} />
      </span>
      <span className="visually-hidden">
        {nextOrder === "none" ? "Clear sort" : `Sort ${nextOrder}`}
      </span>
    </button>
  );
}
