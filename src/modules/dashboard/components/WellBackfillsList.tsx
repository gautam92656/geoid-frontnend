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
import { getUserWellBackfillTypes } from "../services/configModulesApi";
import {
  copyLogWellBackfill,
  createLogWellBackfill,
  deleteLogWellBackfill,
  listLogWellBackfills,
  restoreLogWellBackfill,
  updateLogWellBackfill,
} from "../services/logWellBackfillApi";
import type { LogWellBackfill } from "../types/logWellBackfill";
import {
  WELL_LOGS_MODULE_ID,
  parseWellBackfillTypeOptions,
  type WellBackfillTypeOption,
} from "../utils/configModules";
import {
  EditWellBackfillModal,
  type LogWellBackfillFormPayload,
} from "./EditWellBackfillModal";

type WellBackfillsListProps = Readonly<{
  projectId: number;
  logId: number;
  logConfigurationId: string;
}>;

type ListScope = "active" | "deleted";

type ModalState =
  | { open: false }
  | { open: true; mode: "add" }
  | { open: true; mode: "edit"; backfill: LogWellBackfill };

type DeleteConfirmState =
  | { open: false }
  | { open: true; backfill: LogWellBackfill };

const BACKFILLS_GRID = "120px 120px minmax(180px, 1fr) minmax(180px, 1fr) 72px";

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

function getBackfillSortValue(backfill: LogWellBackfill, field: string): string | number {
  switch (field) {
    case "depthFrom": {
      const numeric = Number(backfill.depthFrom);
      return Number.isFinite(numeric) ? numeric : backfill.depthFrom;
    }
    case "depthTo": {
      const numeric = Number(backfill.depthTo);
      return Number.isFinite(numeric) ? numeric : backfill.depthTo;
    }
    case "backfillTypeName":
      return backfill.backfillTypeName;
    case "comments":
      return backfill.comments;
    default:
      return "";
  }
}

export function WellBackfillsList({
  projectId,
  logId,
  logConfigurationId,
}: WellBackfillsListProps) {
  const [backfills, setBackfills] = useState<LogWellBackfill[]>([]);
  const [backfillTypes, setBackfillTypes] = useState<WellBackfillTypeOption[]>([]);
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

  const loadBackfills = useCallback(async () => {
    if (!projectId || !logId) return;
    setLoading(true);
    try {
      const onlyDeleted = listScope === "deleted";
      const result = await listLogWellBackfills(projectId, logId, page, pageSize, {
        search: debouncedSearch || undefined,
        onlyDeleted: onlyDeleted || undefined,
        sortBy: "id",
        sortOrder: "desc",
      });
      setBackfills(result.data);
      setTotal(result.total);
    } catch (err) {
      showApiError(err, API_ERROR_MESSAGES.LOAD_LOG_WELL_BACKFILLS);
      setBackfills([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [projectId, logId, page, pageSize, debouncedSearch, listScope]);

  const loadOptions = useCallback(async () => {
    if (!logConfigurationId.trim()) {
      setBackfillTypes([]);
      return;
    }
    try {
      const response = await getUserWellBackfillTypes(WELL_LOGS_MODULE_ID, logConfigurationId);
      setBackfillTypes(parseWellBackfillTypeOptions(response.data, []));
    } catch (err) {
      showApiError(err, API_ERROR_MESSAGES.LOAD_CONFIG_MODULES);
      setBackfillTypes([]);
    }
  }, [logConfigurationId]);

  useEffect(() => {
    void loadBackfills();
  }, [loadBackfills]);

  useEffect(() => {
    void loadOptions();
  }, [loadOptions]);

  const { sort, toggleSort, sortedData } = useTableSort(backfills, getBackfillSortValue, {
    field: null,
    order: "asc",
  });

  useEffect(() => {
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    if (page > totalPages) setPage(totalPages);
  }, [page, pageSize, total]);

  const emptyMessage = loading
    ? "Loading well backfills…"
    : listScope === "deleted"
      ? debouncedSearch
        ? "No deleted records match your search."
        : "No deleted records."
      : debouncedSearch
        ? "No well backfills match your search."
        : "No well backfills yet. Use Add New to create one.";

  const openAddModal = () => {
    setListScope("active");
    setModal({ open: true, mode: "add" });
  };

  const openEditModal = (backfill: LogWellBackfill) => {
    setModal({ open: true, mode: "edit", backfill });
  };

  const closeModal = () => setModal({ open: false });

  const handleSubmit = async (payload: LogWellBackfillFormPayload) => {
    if (modal.open && modal.mode === "edit") {
      await updateLogWellBackfill(projectId, logId, modal.backfill.id, payload);
    } else {
      await createLogWellBackfill(projectId, logId, payload);
      setPage(1);
    }
    await loadBackfills();
  };

  const handleCopy = async (backfill: LogWellBackfill) => {
    setActionBusy(true);
    try {
      await copyLogWellBackfill(projectId, logId, backfill.id);
      setListScope("active");
      setPage(1);
      showApiSuccess(undefined, "Well backfill copied.");
      await loadBackfills();
    } catch (err) {
      showApiError(err, API_ERROR_MESSAGES.SAVE_LOG_WELL_BACKFILL);
    } finally {
      setActionBusy(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirm.open) return;
    setActionBusy(true);
    try {
      await deleteLogWellBackfill(projectId, logId, deleteConfirm.backfill.id);
      setDeleteConfirm({ open: false });
      showApiSuccess(undefined, "Well backfill deleted.");
      await loadBackfills();
    } catch (err) {
      showApiError(err, API_ERROR_MESSAGES.DELETE_LOG_WELL_BACKFILL);
    } finally {
      setActionBusy(false);
    }
  };

  const handleRestore = async (backfill: LogWellBackfill) => {
    setActionBusy(true);
    try {
      await restoreLogWellBackfill(projectId, logId, backfill.id);
      showApiSuccess(undefined, "Well backfill restored.");
      await loadBackfills();
    } catch (err) {
      showApiError(err, API_ERROR_MESSAGES.RESTORE_LOG_WELL_BACKFILL);
    } finally {
      setActionBusy(false);
    }
  };

  const columns = useMemo<ColumnDef<LogWellBackfill>[]>(
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
        cell: (backfill) => (
          <span className="data-table__text">{formatCell(backfill.depthFrom)}</span>
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
        cell: (backfill) => (
          <span className="data-table__text">{formatCell(backfill.depthTo)}</span>
        ),
      },
      {
        id: "backfillTypeName",
        header: (
          <ColumnHeader
            field="backfillTypeName"
            sortField={sort.field}
            sortOrder={sort.order}
            onSort={toggleSort}
          >
            Backfill Type
          </ColumnHeader>
        ),
        cell: (backfill) => (
          <span className="data-table__text">{formatCell(backfill.backfillTypeName)}</span>
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
        cell: (backfill) => (
          <span className="data-table__text">{formatCell(backfill.comments)}</span>
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
        cell: (backfill) =>
          listScope === "deleted" ? (
            <TableRowActionsMenu
              label={`Actions for ${formatCell(backfill.backfillTypeName)}`}
              actions={[
                {
                  id: "restore",
                  label: "Restore",
                  icon: <UnarchiveIcon />,
                  onClick: () => {
                    void handleRestore(backfill);
                  },
                  disabled: actionBusy,
                },
              ]}
            />
          ) : (
            <TableRowActionsMenu
              label={`Actions for ${formatCell(backfill.backfillTypeName)}`}
              actions={[
                {
                  id: "edit",
                  label: "Edit",
                  icon: <EditIcon />,
                  onClick: () => openEditModal(backfill),
                  disabled: actionBusy,
                },
                {
                  id: "copy",
                  label: "Copy",
                  icon: <CopyIcon />,
                  onClick: () => {
                    void handleCopy(backfill);
                  },
                  disabled: actionBusy,
                },
                {
                  id: "delete",
                  label: "Delete",
                  icon: <TrashIcon />,
                  tone: "danger",
                  onClick: () => setDeleteConfirm({ open: true, backfill }),
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
              placeholder="Ex. bentonite, 1.5, filter pack"
              ariaLabel="Search well backfills"
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
            getRowId={(backfill) => backfill.id}
            gridTemplateColumns={BACKFILLS_GRID}
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

      <EditWellBackfillModal
        open={modal.open}
        mode={modal.open ? modal.mode : "add"}
        logConfigurationId={logConfigurationId}
        backfillTypes={backfillTypes}
        initialBackfill={modal.open && modal.mode === "edit" ? modal.backfill : null}
        onClose={closeModal}
        onSubmit={handleSubmit}
        onBackfillTypesChange={setBackfillTypes}
      />

      <ConfirmDialog
        open={deleteConfirm.open}
        title="Delete Well Backfill"
        message={
          deleteConfirm.open
            ? `This will remove the ${formatCell(deleteConfirm.backfill.backfillTypeName)} backfill. You can restore it later from Deleted Records.`
            : "This will remove the selected well backfill."
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
