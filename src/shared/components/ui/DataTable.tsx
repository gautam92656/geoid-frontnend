import type { CSSProperties, ReactNode } from "react";
import { SortableColumnHeader } from "./SortableColumnHeader";

export type ColumnDef<T> = Readonly<{
  id: string;
  header: ReactNode;
  cell: (row: T) => ReactNode;
  className?: string;
}>;

type DataTableProps<T> = Readonly<{
  columns: ColumnDef<T>[];
  data: T[];
  getRowId: (row: T) => string;
  gridTemplateColumns: string;
  emptyMessage?: string;
  className?: string;
}>;

function renderColumnHeader(id: string, header: ReactNode) {
  if (id === "actions" && typeof header === "string") {
    const label = typeof header === "string" ? header : "Actions";

    return (
      <SortableColumnHeader
        field="actions"
        activeField={null}
        activeOrder="asc"
        onSort={() => {}}
        sortable={false}
      >
        {label}
      </SortableColumnHeader>
    );
  }

  return header;
}

export function DataTable<T>({
  columns,
  data,
  getRowId,
  gridTemplateColumns,
  emptyMessage = "No records found.",
  className,
}: DataTableProps<T>) {
  if (data.length === 0) {
    return <p className="data-table__empty">{emptyMessage}</p>;
  }

  return (
    <div
      className={["data-table", className].filter(Boolean).join(" ")}
      style={{ "--data-table-cols": gridTemplateColumns } as CSSProperties}
    >
      <div className="data-table__header" role="row">
        {columns.map((column) => (
          <div
            key={column.id}
            className={["data-table__col", "data-table__col--header", column.className]
              .filter(Boolean)
              .join(" ")}
            role="columnheader"
          >
            {renderColumnHeader(column.id, column.header)}
          </div>
        ))}
      </div>

      <ul className="data-table__body">
        {data.map((row) => (
          <li key={getRowId(row)}>
            <div className="data-table__row" role="row">
              {columns.map((column) => (
                <div
                  key={column.id}
                  className={["data-table__col", column.className].filter(Boolean).join(" ")}
                  role="cell"
                >
                  {column.cell(row)}
                </div>
              ))}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
