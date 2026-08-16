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
import { getUserCoreDefectTypes } from "../services/configModulesApi";
import {
  copyLogCoreDefect,
  createLogCoreDefect,
  deleteLogCoreDefect,
  listLogCoreDefects,
  restoreLogCoreDefect,
  updateLogCoreDefect,
} from "../services/logCoreDefectApi";
import type { LogCoreDefect, LogCoreDefectPayload } from "../types/logCoreDefect";
import {
  CORE_LOGGING_MODULE_ID,
  parseCoreDefectTypeOptions,
  type CoreDefectTypeOption,
} from "../utils/configModules";
import {
  EditCoreDefectsModal,
  type LogCoreDefectFormPayload,
} from "./EditCoreDefectsModal";

type CoreDefectsListProps = Readonly<{
  projectId: number;
  logId: number;
  logConfigurationId: string;
}>;

type ListScope = "active" | "deleted";

type ModalState =
  | { open: false }
  | { open: true; mode: "add" }
  | { open: true; mode: "edit"; record: LogCoreDefect };

type DeleteConfirmState =
  | { open: false }
  | { open: true; record: LogCoreDefect };

const CORE_DEFECTS_GRID =
  "120px 120px minmax(160px, 1fr) minmax(180px, 1.2fr) 72px";

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

function getCoreDefectSortValue(record: LogCoreDefect, field: string): string | number {
  switch (field) {
    case "depthFrom": {
      const numeric = Number(record.depthFrom);
      return Number.isFinite(numeric) ? numeric : record.depthFrom;
    }
    case "depthTo": {
      const numeric = Number(record.depthTo);
      return Number.isFinite(numeric) ? numeric : record.depthTo;
    }
    case "defectType":
      return record.defectTypeName;
    case "comments":
      return record.comments;
    default:
      return "";
  }
}

function toFormValues(record: LogCoreDefect): Partial<LogCoreDefectFormPayload> {
  return {
    defectTypeId: record.defectTypeId,
    defectTypeName: record.defectTypeName,
    depthFrom: record.depthFrom,
    depthTo: record.depthTo,
    defectOrientation: record.defectOrientation,
    surfaceShapeIds: record.surfaceShapeIds,
    surfaceRoughnessIds: record.surfaceRoughnessIds,
    defectCoatingIds: record.defectCoatingIds,
    defectOpennessIds: record.defectOpennessIds,
    defectSpacingOverride: record.defectSpacingOverride,
    boundsOnDefectMin: record.boundsOnDefectMin,
    boundsOnDefectMax: record.boundsOnDefectMax,
    comments: record.comments,
    photoFile: null,
    photoName: record.photoName,
  };
}

function toApiPayload(payload: LogCoreDefectFormPayload): LogCoreDefectPayload {
  return {
    defectTypeId: payload.defectTypeId,
    defectTypeName: payload.defectTypeName,
    depthFrom: payload.depthFrom,
    depthTo: payload.depthTo,
    defectOrientation: payload.defectOrientation,
    surfaceShapeIds: payload.surfaceShapeIds,
    surfaceRoughnessIds: payload.surfaceRoughnessIds,
    defectCoatingIds: payload.defectCoatingIds,
    defectOpennessIds: payload.defectOpennessIds,
    defectSpacingOverride: payload.defectSpacingOverride,
    boundsOnDefectMin: payload.boundsOnDefectMin,
    boundsOnDefectMax: payload.boundsOnDefectMax,
    comments: payload.comments,
    photoName: payload.photoName || payload.photoFile?.name || "",
  };
}

export function CoreDefectsList({
  projectId,
  logId,
  logConfigurationId,
}: CoreDefectsListProps) {
  const [records, setRecords] = useState<LogCoreDefect[]>([]);
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
  const [defectTypes, setDefectTypes] = useState<CoreDefectTypeOption[]>([]);

  const loadDefectTypes = useCallback(async () => {
    if (!logConfigurationId.trim()) {
      setDefectTypes([]);
      return;
    }
    try {
      const response = await getUserCoreDefectTypes(
        CORE_LOGGING_MODULE_ID,
        logConfigurationId
      );
      setDefectTypes(parseCoreDefectTypeOptions(response.data, []));
    } catch (err) {
      showApiError(err, API_ERROR_MESSAGES.LOAD_CONFIG_MODULES);
      setDefectTypes([]);
    }
  }, [logConfigurationId]);

  const loadRecords = useCallback(async () => {
    if (!projectId || !logId) return;
    setLoading(true);
    try {
      const onlyDeleted = listScope === "deleted";
      const result = await listLogCoreDefects(projectId, logId, page, pageSize, {
        search: debouncedSearch || undefined,
        onlyDeleted: onlyDeleted || undefined,
        sortBy: "id",
        sortOrder: "desc",
      });
      setRecords(result.data);
      setTotal(result.total);
    } catch (err) {
      showApiError(err, API_ERROR_MESSAGES.LOAD_LOG_CORE_DEFECTS);
      setRecords([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [projectId, logId, page, pageSize, debouncedSearch, listScope]);

  useEffect(() => {
    void loadDefectTypes();
  }, [loadDefectTypes]);

  useEffect(() => {
    void loadRecords();
  }, [loadRecords]);

  const { sort, toggleSort, sortedData } = useTableSort(records, getCoreDefectSortValue, {
    field: null,
    order: "asc",
  });

  useEffect(() => {
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    if (page > totalPages) setPage(totalPages);
  }, [page, pageSize, total]);

  const emptyMessage = loading
    ? "Loading core defects…"
    : listScope === "deleted"
      ? debouncedSearch
        ? "No deleted records match your search."
        : "No deleted records."
      : debouncedSearch
        ? "No core defects match your search."
        : "No core defects yet. Use Add New to create one.";

  const openAddModal = () => {
    setListScope("active");
    setModal({ open: true, mode: "add" });
  };

  const openEditModal = (record: LogCoreDefect) => {
    setModal({ open: true, mode: "edit", record });
  };

  const closeModal = () => setModal({ open: false });

  const handleSubmit = async (payload: LogCoreDefectFormPayload) => {
    const body = toApiPayload(payload);
    if (modal.open && modal.mode === "edit") {
      await updateLogCoreDefect(projectId, logId, modal.record.id, body);
    } else {
      await createLogCoreDefect(projectId, logId, body);
      setPage(1);
    }
    await loadRecords();
  };

  const handleCopy = async (record: LogCoreDefect) => {
    setActionBusy(true);
    try {
      await copyLogCoreDefect(projectId, logId, record.id);
      setListScope("active");
      setPage(1);
      showApiSuccess(undefined, "Core defect copied.");
      await loadRecords();
    } catch (err) {
      showApiError(err, API_ERROR_MESSAGES.SAVE_LOG_CORE_DEFECT);
    } finally {
      setActionBusy(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirm.open) return;
    setActionBusy(true);
    try {
      await deleteLogCoreDefect(projectId, logId, deleteConfirm.record.id);
      setDeleteConfirm({ open: false });
      showApiSuccess(undefined, "Core defect deleted.");
      await loadRecords();
    } catch (err) {
      showApiError(err, API_ERROR_MESSAGES.DELETE_LOG_CORE_DEFECT);
    } finally {
      setActionBusy(false);
    }
  };

  const handleRestore = async (record: LogCoreDefect) => {
    setActionBusy(true);
    try {
      await restoreLogCoreDefect(projectId, logId, record.id);
      showApiSuccess(undefined, "Core defect restored.");
      await loadRecords();
    } catch (err) {
      showApiError(err, API_ERROR_MESSAGES.RESTORE_LOG_CORE_DEFECT);
    } finally {
      setActionBusy(false);
    }
  };

  const columns = useMemo<ColumnDef<LogCoreDefect>[]>(
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
        id: "defectType",
        header: (
          <ColumnHeader
            field="defectType"
            sortField={sort.field}
            sortOrder={sort.order}
            onSort={toggleSort}
          >
            Defect Type
          </ColumnHeader>
        ),
        cell: (record) => (
          <span className="data-table__text">{formatCell(record.defectTypeName)}</span>
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
        cell: (record) => (
          <span className="data-table__text">{formatCell(record.comments)}</span>
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
              label={`Actions for core defect at ${formatCell(record.depthFrom)}`}
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
              label={`Actions for core defect at ${formatCell(record.depthFrom)}`}
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
              placeholder="Search core defects…"
              ariaLabel="Search core defects"
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
            gridTemplateColumns={CORE_DEFECTS_GRID}
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

      <EditCoreDefectsModal
        open={modal.open}
        mode={modal.open ? modal.mode : "add"}
        logConfigurationId={logConfigurationId}
        defectTypes={defectTypes}
        initialValues={modal.open && modal.mode === "edit" ? toFormValues(modal.record) : null}
        onClose={closeModal}
        onSubmit={handleSubmit}
        onDefectTypesChange={setDefectTypes}
      />

      <ConfirmDialog
        open={deleteConfirm.open}
        title="Delete Core Defect"
        message={
          deleteConfirm.open
            ? `This will remove the core defect at depth ${formatCell(deleteConfirm.record.depthFrom)}. You can restore it later from Deleted Records.`
            : "This will remove the selected core defect."
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
