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
import { getUserWellTypes } from "../services/configModulesApi";
import {
  copyLogWellLog,
  createLogWellLog,
  deleteLogWellLog,
  listLogWellLogs,
  restoreLogWellLog,
  updateLogWellLog,
} from "../services/logWellLogApi";
import type { LogWellLog } from "../types/logWellLog";
import {
  WELL_LOGS_MODULE_ID,
  parseWellTypeOptions,
  type WellTypeOption,
} from "../utils/configModules";
import {
  EditWellTestingResultsModal,
  type LogWellLogFormPayload,
} from "./EditWellTestingResultsModal";

type WellLogsListProps = Readonly<{
  projectId: number;
  logId: number;
  logConfigurationId: string;
}>;

type ListScope = "active" | "deleted";

type ModalState =
  | { open: false }
  | { open: true; mode: "add" }
  | { open: true; mode: "edit"; wellLog: LogWellLog };

type DeleteConfirmState =
  | { open: false }
  | { open: true; wellLog: LogWellLog };

const WELL_LOGS_GRID = "120px 120px 120px minmax(160px, 1fr) minmax(160px, 1fr) 72px";

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

function getWellLogSortValue(wellLog: LogWellLog, field: string): string | number {
  switch (field) {
    case "wellId":
      return wellLog.wellId;
    case "depthFrom": {
      const numeric = Number(wellLog.depthFrom);
      return Number.isFinite(numeric) ? numeric : wellLog.depthFrom;
    }
    case "depthTo": {
      const numeric = Number(wellLog.depthTo);
      return Number.isFinite(numeric) ? numeric : wellLog.depthTo;
    }
    case "wellTypeName":
      return wellLog.wellTypeName;
    case "comments":
      return wellLog.comments;
    default:
      return "";
  }
}

export function WellLogsList({
  projectId,
  logId,
  logConfigurationId,
}: WellLogsListProps) {
  const [wellLogs, setWellLogs] = useState<LogWellLog[]>([]);
  const [wellTypes, setWellTypes] = useState<WellTypeOption[]>([]);
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

  const loadWellLogs = useCallback(async () => {
    if (!projectId || !logId) return;
    setLoading(true);
    try {
      const onlyDeleted = listScope === "deleted";
      const result = await listLogWellLogs(projectId, logId, page, pageSize, {
        search: debouncedSearch || undefined,
        onlyDeleted: onlyDeleted || undefined,
        sortBy: "id",
        sortOrder: "desc",
      });
      setWellLogs(result.data);
      setTotal(result.total);
    } catch (err) {
      showApiError(err, API_ERROR_MESSAGES.LOAD_LOG_WELL_LOGS);
      setWellLogs([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [projectId, logId, page, pageSize, debouncedSearch, listScope]);

  const loadCatalogs = useCallback(async () => {
    if (!logConfigurationId.trim()) {
      setWellTypes([]);
      return;
    }
    try {
      const wellTypesResponse = await getUserWellTypes(
        WELL_LOGS_MODULE_ID,
        logConfigurationId
      );
      setWellTypes(parseWellTypeOptions(wellTypesResponse.data, []));
    } catch (err) {
      showApiError(err, API_ERROR_MESSAGES.LOAD_CONFIG_MODULES);
      setWellTypes([]);
    }
  }, [logConfigurationId]);

  useEffect(() => {
    void loadWellLogs();
  }, [loadWellLogs]);

  useEffect(() => {
    void loadCatalogs();
  }, [loadCatalogs]);

  const { sort, toggleSort, sortedData } = useTableSort(wellLogs, getWellLogSortValue, {
    field: null,
    order: "asc",
  });

  useEffect(() => {
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    if (page > totalPages) setPage(totalPages);
  }, [page, pageSize, total]);

  const emptyMessage = loading
    ? "Loading well logs…"
    : listScope === "deleted"
      ? debouncedSearch
        ? "No deleted records match your search."
        : "No deleted records."
      : debouncedSearch
        ? "No well logs match your search."
        : "No well logs yet. Use Add New to create one.";

  const openAddModal = () => {
    setListScope("active");
    setModal({ open: true, mode: "add" });
  };

  const openEditModal = (wellLog: LogWellLog) => {
    setModal({ open: true, mode: "edit", wellLog });
  };

  const closeModal = () => setModal({ open: false });

  const handleSubmit = async (payload: LogWellLogFormPayload) => {
    if (modal.open && modal.mode === "edit") {
      await updateLogWellLog(projectId, logId, modal.wellLog.id, payload);
    } else {
      await createLogWellLog(projectId, logId, payload);
      setPage(1);
    }
    await loadWellLogs();
  };

  const handleCopy = async (wellLog: LogWellLog) => {
    setActionBusy(true);
    try {
      await copyLogWellLog(projectId, logId, wellLog.id);
      setListScope("active");
      setPage(1);
      showApiSuccess(undefined, "Well testing result copied.");
      await loadWellLogs();
    } catch (err) {
      showApiError(err, API_ERROR_MESSAGES.SAVE_LOG_WELL_LOG);
    } finally {
      setActionBusy(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirm.open) return;
    setActionBusy(true);
    try {
      await deleteLogWellLog(projectId, logId, deleteConfirm.wellLog.id);
      setDeleteConfirm({ open: false });
      showApiSuccess(undefined, "Well testing result deleted.");
      await loadWellLogs();
    } catch (err) {
      showApiError(err, API_ERROR_MESSAGES.DELETE_LOG_WELL_LOG);
    } finally {
      setActionBusy(false);
    }
  };

  const handleRestore = async (wellLog: LogWellLog) => {
    setActionBusy(true);
    try {
      await restoreLogWellLog(projectId, logId, wellLog.id);
      showApiSuccess(undefined, "Well testing result restored.");
      await loadWellLogs();
    } catch (err) {
      showApiError(err, API_ERROR_MESSAGES.RESTORE_LOG_WELL_LOG);
    } finally {
      setActionBusy(false);
    }
  };

  const columns = useMemo<ColumnDef<LogWellLog>[]>(
    () => [
      {
        id: "wellId",
        header: (
          <ColumnHeader
            field="wellId"
            sortField={sort.field}
            sortOrder={sort.order}
            onSort={toggleSort}
          >
            Well ID
          </ColumnHeader>
        ),
        cell: (wellLog) => (
          <span className="data-table__text">{formatCell(wellLog.wellId)}</span>
        ),
      },
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
        cell: (wellLog) => (
          <span className="data-table__text">{formatCell(wellLog.depthFrom)}</span>
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
        cell: (wellLog) => (
          <span className="data-table__text">{formatCell(wellLog.depthTo)}</span>
        ),
      },
      {
        id: "wellTypeName",
        header: (
          <ColumnHeader
            field="wellTypeName"
            sortField={sort.field}
            sortOrder={sort.order}
            onSort={toggleSort}
          >
            Well Type
          </ColumnHeader>
        ),
        cell: (wellLog) => (
          <span className="data-table__text">{formatCell(wellLog.wellTypeName)}</span>
        ),
      },
      {
        id: "comments",
        header: (
          <ColumnHeader
            field="comments"
            sortField={sort.field}
            sortOrder={sort.order}
            onSort={toggleSort}
          >
            Comments
          </ColumnHeader>
        ),
        cell: (wellLog) => (
          <span className="data-table__text">{formatCell(wellLog.comments)}</span>
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
        cell: (wellLog) =>
          listScope === "deleted" ? (
            <TableRowActionsMenu
              label={`Actions for ${formatCell(wellLog.wellId)} (${formatCell(wellLog.wellTypeName)})`}
              actions={[
                {
                  id: "restore",
                  label: "Restore",
                  icon: <UnarchiveIcon />,
                  onClick: () => {
                    void handleRestore(wellLog);
                  },
                  disabled: actionBusy,
                },
              ]}
            />
          ) : (
            <TableRowActionsMenu
              label={`Actions for ${formatCell(wellLog.wellId)} (${formatCell(wellLog.wellTypeName)})`}
              actions={[
                {
                  id: "edit",
                  label: "Edit",
                  icon: <EditIcon />,
                  onClick: () => openEditModal(wellLog),
                  disabled: actionBusy,
                },
                {
                  id: "copy",
                  label: "Copy",
                  icon: <CopyIcon />,
                  onClick: () => {
                    void handleCopy(wellLog);
                  },
                  disabled: actionBusy,
                },
                {
                  id: "delete",
                  label: "Delete",
                  icon: <TrashIcon />,
                  tone: "danger",
                  onClick: () => setDeleteConfirm({ open: true, wellLog }),
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
              placeholder="Ex. MW-01, 1.5, monitoring"
              ariaLabel="Search well logs"
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
            getRowId={(wellLog) => wellLog.id}
            gridTemplateColumns={WELL_LOGS_GRID}
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

      <EditWellTestingResultsModal
        open={modal.open}
        mode={modal.open ? modal.mode : "add"}
        logConfigurationId={logConfigurationId}
        wellTypes={wellTypes}
        initialWellLog={modal.open && modal.mode === "edit" ? modal.wellLog : null}
        onClose={closeModal}
        onSubmit={handleSubmit}
        onWellTypesChange={setWellTypes}
      />

      <ConfirmDialog
        open={deleteConfirm.open}
        title="Delete Well Testing Result"
        message={
          deleteConfirm.open
            ? `This will remove well ${formatCell(deleteConfirm.wellLog.wellId)} (${formatCell(deleteConfirm.wellLog.wellTypeName)}). You can restore it later from Deleted Records.`
            : "This will remove the selected well testing result."
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
