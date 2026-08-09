"use client";

import type { ReactNode } from "react";
import { useMemo, useState } from "react";
import {
  CopyIcon,
  DataTable,
  EditIcon,
  SortableColumnHeader,
  TablePagination,
  TableRowActionsMenu,
  TableSearch,
  TrashIcon,
  UiButton,
  type ColumnDef,
} from "@/shared/components/ui";
import { TABLE_PAGE_SIZE_OPTIONS } from "@/shared/constants/pagination";

export type StaticDrillingListColumn<T extends { id: string }> = {
  id: string;
  label: string;
  sortable?: boolean;
  getValue: (row: T) => string;
};

type StaticDrillingEntityListProps<T extends { id: string }> = Readonly<{
  columns: StaticDrillingListColumn<T>[];
  gridTemplateColumns: string;
  searchPlaceholder: string;
  searchAriaLabel: string;
  emptyMessage: string;
  emptySearchMessage: string;
  actionsLabel: (row: T) => string;
}>;

function formatCell(value: string): string {
  return value.trim() || "—";
}

function ColumnHeader({
  children,
  field,
  sortField,
  sortOrder,
  onSort,
  sortable = true,
}: Readonly<{
  children: ReactNode;
  field: string;
  sortField: string | null;
  sortOrder: "asc" | "desc";
  onSort: (field: string) => void;
  sortable?: boolean;
}>) {
  return (
    <SortableColumnHeader
      field={field}
      activeField={sortField}
      activeOrder={sortOrder}
      onSort={onSort}
      sortable={sortable}
    >
      {children}
    </SortableColumnHeader>
  );
}

export function StaticDrillingEntityList<T extends { id: string }>({
  columns,
  gridTemplateColumns,
  searchPlaceholder,
  searchAriaLabel,
  emptyMessage,
  emptySearchMessage,
  actionsLabel,
}: StaticDrillingEntityListProps<T>) {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [sortField, setSortField] = useState<string | null>(null);
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");

  const toggleSort = (field: string) => {
    if (sortField === field) {
      setSortOrder((current) => (current === "asc" ? "desc" : "asc"));
      return;
    }
    setSortField(field);
    setSortOrder("asc");
  };

  const tableColumns = useMemo<ColumnDef<T>[]>(
    () => [
      ...columns.map((column) => ({
        id: column.id,
        header: (
          <ColumnHeader
            field={column.id}
            sortField={sortField}
            sortOrder={sortOrder}
            onSort={toggleSort}
            sortable={column.sortable !== false}
          >
            {column.label}
          </ColumnHeader>
        ),
        cell: (row: T) => (
          <span className="data-table__text">{formatCell(column.getValue(row))}</span>
        ),
      })),
      {
        id: "actions",
        header: (
          <ColumnHeader
            field="actions"
            sortField={sortField}
            sortOrder={sortOrder}
            onSort={toggleSort}
            sortable={false}
          >
            Actions
          </ColumnHeader>
        ),
        cell: (row: T) => (
          <TableRowActionsMenu
            label={actionsLabel(row)}
            actions={[
              { id: "edit", label: "Edit", icon: <EditIcon />, onClick: () => undefined },
              { id: "copy", label: "Copy", icon: <CopyIcon />, onClick: () => undefined },
              {
                id: "delete",
                label: "Delete",
                icon: <TrashIcon />,
                tone: "danger",
                onClick: () => undefined,
              },
            ]}
          />
        ),
        className: "data-table__col--actions",
      },
    ],
    [actionsLabel, columns, sortField, sortOrder]
  );

  return (
    <div className="asset-card asset-card--table drilling-entity-list__card">
      <div className="asset-card__toolbar drilling-entity-list__toolbar">
        <div className="asset-card__filters">
          <TableSearch
            value={search}
            onChange={(value) => {
              setSearch(value);
              setPage(1);
            }}
            placeholder={searchPlaceholder}
            ariaLabel={searchAriaLabel}
          />
        </div>

        <div className="drilling-entity-list__actions">
          <UiButton type="button" variant="outline" size="sm">
            <TrashIcon />
            Deleted Records
          </UiButton>
          <UiButton type="button" variant="primary" size="sm">
            Add New
          </UiButton>
        </div>
      </div>

      <div className="asset-card__table-wrap ui-scrollbar">
        <DataTable
          columns={tableColumns}
          data={[] as T[]}
          getRowId={(row) => row.id}
          gridTemplateColumns={gridTemplateColumns}
          emptyMessage={search.trim() ? emptySearchMessage : emptyMessage}
        />
      </div>

      <TablePagination
        page={page}
        pageSize={pageSize}
        total={0}
        pageSizeOptions={TABLE_PAGE_SIZE_OPTIONS}
        onPageChange={setPage}
        onPageSizeChange={(nextPageSize) => {
          setPageSize(nextPageSize);
          setPage(1);
        }}
      />
    </div>
  );
}
