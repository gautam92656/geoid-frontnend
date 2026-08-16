"use client";

import type { ReactNode } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ConfirmDialog,
  CopyIcon,
  DataTable,
  EditIcon,
  SortableColumnHeader,
  TablePagination,
  TableRowActionsMenu,
  TableSearch,
  TrashIcon,
  UiButton,
  UnarchiveIcon,
  type ColumnDef,
} from "@/shared/components/ui";
import { useDebouncedValue } from "@/shared/hooks/useDebouncedValue";
import { useTableSort } from "@/shared/hooks/useTableSort";
import { TABLE_PAGE_SIZE_OPTIONS } from "@/shared/constants/pagination";
import { API_ERROR_MESSAGES } from "@/shared/constants/apiMessages";
import { showApiError, showApiSuccess } from "@/shared/utils/apiToast";
import {
  copyLogRqdTcr,
  createLogRqdTcr,
  deleteLogRqdTcr,
  listLogRqdTcrs,
  restoreLogRqdTcr,
  updateLogRqdTcr,
} from "../services/logRqdTcrApi";
import type { LogRqdTcr } from "../types/logRqdTcr";
import {
  EditRqdTcrModal,
  type LogRqdTcrFormPayload,
} from "./EditRqdTcrModal";

type RqdTcrListProps = Readonly<{
  projectId: number;
  logId: number;
  logConfigurationId: string;
}>;

type ListScope = "active" | "deleted";

type ModalState =
  | { open: false }
  | { open: true; mode: "add" }
  | { open: true; mode: "edit"; record: LogRqdTcr };

type DeleteConfirmState =
  | { open: false }
  | { open: true; record: LogRqdTcr };

const RQD_TCR_GRID = "120px 120px minmax(140px, 1fr) minmax(140px, 1fr) 72px";

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

function getRqdTcrSortValue(record: LogRqdTcr, field: string): string | number {
  switch (field) {
    case "depthFrom": {
      const numeric = Number(record.depthFrom);
      return Number.isFinite(numeric) ? numeric : record.depthFrom;
    }
    case "depthTo": {
      const numeric = Number(record.depthTo);
      return Number.isFinite(numeric) ? numeric : record.depthTo;
    }
    case "rqdValue": {
      const numeric = Number(record.rqdPercent);
      return Number.isFinite(numeric) ? numeric : record.rqdPercent;
    }
    case "tcrValue": {
      const numeric = Number(record.tcrPercent);
      return Number.isFinite(numeric) ? numeric : record.tcrPercent;
    }
    default:
      return "";
  }
}

function toFormValues(record: LogRqdTcr): LogRqdTcrFormPayload {
  return {
    depthFrom: record.depthFrom,
    depthTo: record.depthTo,
    startDate: record.startDate,
    startTime: record.startTime,
    endDate: record.endDate,
    endTime: record.endTime,
    corePieceLength: record.corePieceLength,
    rqdPercent: record.rqdPercent,
    coreLossLength: record.coreLossLength,
    coreRecoveryLength: record.coreRecoveryLength,
    tcrPercent: record.tcrPercent,
    photoName: record.photoName,
  };
}

export function RqdTcrList({
  projectId,
  logId,
  logConfigurationId,
}: RqdTcrListProps) {
  const [records, setRecords] = useState<LogRqdTcr[]>([]);
  const [loading, setLoading] = useState(true);
  const [listScope, setListScope] = useState<ListScope>("active");
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search.trim());
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [total, setTotal] = useState(0);
  const [modal, setModal] = useState<ModalState>({ open: false });
  const [deleteConfirm, setDeleteConfirm] = useState<DeleteConfirmState>({ open: false });
  const [actionBusy, setActionBusy] = useState(false);

  const loadRecords = useCallback(async () => {
    if (!projectId || !logId) return;
    setLoading(true);
    try {
      const onlyDeleted = listScope === "deleted";
      const result = await listLogRqdTcrs(projectId, logId, page, pageSize, {
        search: debouncedSearch || undefined,
        onlyDeleted: onlyDeleted || undefined,
        sortBy: "id",
        sortOrder: "desc",
      });
      setRecords(result.data);
      setTotal(result.total);
    } catch (err) {
      showApiError(err, API_ERROR_MESSAGES.LOAD_LOG_RQD_TCRS);
      setRecords([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [projectId, logId, page, pageSize, debouncedSearch, listScope]);

  useEffect(() => {
    void loadRecords();
  }, [loadRecords]);

  const { sort, toggleSort, sortedData } = useTableSort(records, getRqdTcrSortValue, {
    field: null,
    order: "asc",
  });

  useEffect(() => {
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    if (page > totalPages) setPage(totalPages);
  }, [page, pageSize, total]);

  const emptyMessage = loading
    ? "Loading RQD / TCR records…"
    : listScope === "deleted"
      ? debouncedSearch
        ? "No deleted records match your search."
        : "No deleted records."
      : debouncedSearch
        ? "No RQD / TCR records match your search."
        : "No RQD / TCR records yet. Use Add New to create one.";

  const openAddModal = () => {
    setListScope("active");
    setModal({ open: true, mode: "add" });
  };

  const openEditModal = (record: LogRqdTcr) => {
    setModal({ open: true, mode: "edit", record });
  };

  const closeModal = () => setModal({ open: false });

  const handleSubmit = async (payload: LogRqdTcrFormPayload) => {
    if (modal.open && modal.mode === "edit") {
      await updateLogRqdTcr(projectId, logId, modal.record.id, payload);
    } else {
      await createLogRqdTcr(projectId, logId, payload);
      setPage(1);
    }
    await loadRecords();
  };

  const handleCopy = async (record: LogRqdTcr) => {
    setActionBusy(true);
    try {
      await copyLogRqdTcr(projectId, logId, record.id);
      setListScope("active");
      setPage(1);
      showApiSuccess(undefined, "RQD/TCR copied.");
      await loadRecords();
    } catch (err) {
      showApiError(err, API_ERROR_MESSAGES.SAVE_LOG_RQD_TCR);
    } finally {
      setActionBusy(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirm.open) return;
    setActionBusy(true);
    try {
      await deleteLogRqdTcr(projectId, logId, deleteConfirm.record.id);
      setDeleteConfirm({ open: false });
      showApiSuccess(undefined, "RQD/TCR deleted.");
      await loadRecords();
    } catch (err) {
      showApiError(err, API_ERROR_MESSAGES.DELETE_LOG_RQD_TCR);
    } finally {
      setActionBusy(false);
    }
  };

  const handleRestore = async (record: LogRqdTcr) => {
    setActionBusy(true);
    try {
      await restoreLogRqdTcr(projectId, logId, record.id);
      showApiSuccess(undefined, "RQD/TCR restored.");
      await loadRecords();
    } catch (err) {
      showApiError(err, API_ERROR_MESSAGES.RESTORE_LOG_RQD_TCR);
    } finally {
      setActionBusy(false);
    }
  };

  const columns = useMemo<ColumnDef<LogRqdTcr>[]>(
    () => [
      {
        id: "depthFrom",
        header: (
          <ColumnHeader
            field="depthFrom"
            sortField={sort.field}
            sortOrder={sort.order}
            onSort={toggleSort}
          >
            Depth From (m)
          </ColumnHeader>
        ),
        cell: (record) => (
          <span className="data-table__text">{formatCell(record.depthFrom)}</span>
        ),
      },
      {
        id: "depthTo",
        header: (
          <ColumnHeader
            field="depthTo"
            sortField={sort.field}
            sortOrder={sort.order}
            onSort={toggleSort}
          >
            Depth To (m)
          </ColumnHeader>
        ),
        cell: (record) => (
          <span className="data-table__text">{formatCell(record.depthTo)}</span>
        ),
      },
      {
        id: "rqdValue",
        header: (
          <ColumnHeader
            field="rqdValue"
            sortField={sort.field}
            sortOrder={sort.order}
            onSort={toggleSort}
          >
            RQD Value
          </ColumnHeader>
        ),
        cell: (record) => (
          <span className="data-table__text">{formatCell(record.rqdPercent)}</span>
        ),
      },
      {
        id: "tcrValue",
        header: (
          <ColumnHeader
            field="tcrValue"
            sortField={sort.field}
            sortOrder={sort.order}
            onSort={toggleSort}
          >
            TCR Value
          </ColumnHeader>
        ),
        cell: (record) => (
          <span className="data-table__text">{formatCell(record.tcrPercent)}</span>
        ),
      },
      {
        id: "actions",
        header: (
          <ColumnHeader
            field="actions"
            sortField={sort.field}
            sortOrder={sort.order}
            onSort={toggleSort}
            sortable={false}
          >
            Actions
          </ColumnHeader>
        ),
        cell: (record) =>
          listScope === "deleted" ? (
            <TableRowActionsMenu
              label={`Actions for RQD/TCR at ${formatCell(record.depthFrom)}`}
              actions={[
                {
                  id: "restore",
                  label: "Restore",
                  icon: <UnarchiveIcon />,
                  onClick: () => {
                    void handleRestore(record);
                  },
                  disabled: actionBusy,
                },
              ]}
            />
          ) : (
            <TableRowActionsMenu
              label={`Actions for RQD/TCR at ${formatCell(record.depthFrom)}`}
              actions={[
                {
                  id: "edit",
                  label: "Edit",
                  icon: <EditIcon />,
                  onClick: () => openEditModal(record),
                  disabled: actionBusy,
                },
                {
                  id: "copy",
                  label: "Copy",
                  icon: <CopyIcon />,
                  onClick: () => {
                    void handleCopy(record);
                  },
                  disabled: actionBusy,
                },
                {
                  id: "delete",
                  label: "Delete",
                  icon: <TrashIcon />,
                  tone: "danger",
                  onClick: () => setDeleteConfirm({ open: true, record }),
                  disabled: actionBusy,
                },
              ]}
            />
          ),
        className: "data-table__col--actions",
      },
    ],
    [listScope, sort.field, sort.order, toggleSort, actionBusy]
  );

  return (
    <>
      <div className="asset-card asset-card--table drilling-entity-list__card">
        <div className="asset-card__toolbar drilling-entity-list__toolbar">
          <div className="asset-card__filters">
            <TableSearch
              value={search}
              onChange={(value) => {
                setSearch(value);
                setPage(1);
              }}
              placeholder="Search RQD / TCR…"
              ariaLabel="Search RQD / TCR"
            />
          </div>

          <div className="drilling-entity-list__actions">
            <UiButton
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setListScope((current) => (current === "deleted" ? "active" : "deleted"));
                setPage(1);
              }}
              disabled={actionBusy}
            >
              <TrashIcon />
              {listScope === "deleted" ? "Back to Records" : "Deleted Records"}
            </UiButton>
            <UiButton
              type="button"
              variant="primary"
              size="sm"
              onClick={openAddModal}
              disabled={actionBusy || !logConfigurationId.trim()}
            >
              Add New
            </UiButton>
          </div>
        </div>

        <div className="asset-card__table-wrap ui-scrollbar">
          <DataTable
            columns={columns}
            data={sortedData}
            getRowId={(record) => record.id}
            gridTemplateColumns={RQD_TCR_GRID}
            emptyMessage={emptyMessage}
          />
        </div>

        <TablePagination
          page={page}
          pageSize={pageSize}
          total={total}
          pageSizeOptions={TABLE_PAGE_SIZE_OPTIONS}
          onPageChange={setPage}
          onPageSizeChange={(nextPageSize) => {
            setPageSize(nextPageSize);
            setPage(1);
          }}
        />
      </div>

      <EditRqdTcrModal
        open={modal.open}
        mode={modal.open ? modal.mode : "add"}
        initialValues={modal.open && modal.mode === "edit" ? toFormValues(modal.record) : null}
        onClose={closeModal}
        onSubmit={handleSubmit}
      />

      <ConfirmDialog
        open={deleteConfirm.open}
        title="Delete RQD/TCR"
        message={
          deleteConfirm.open
            ? `This will remove the RQD/TCR record at depth ${formatCell(deleteConfirm.record.depthFrom)}. You can restore it later from Deleted Records.`
            : "This will remove the selected RQD/TCR record."
        }
        confirmLabel="Delete"
        cancelLabel="Cancel"
        variant="danger"
        onConfirm={() => {
          void handleDelete();
        }}
        onCancel={() => setDeleteConfirm({ open: false })}
      />
    </>
  );
}
