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
  copyLogRemark,
  createLogRemark,
  deleteLogRemark,
  listLogRemarks,
  restoreLogRemark,
  updateLogRemark,
} from "../services/logRemarkApi";
import { getUserRemarkTypes } from "../services/configModulesApi";
import type { LogRemark } from "../types/logRemark";
import {
  LOG_REMARKS_MODULE_ID,
  parseRemarkTypeOptions,
  type RemarkTypeOption,
} from "../utils/configModules";
import {
  EditLogRemarkModal,
  type LogRemarkFormSubmitPayload,
} from "./EditLogRemarkModal";

type RemarksSectionProps = Readonly<{
  projectId: number;
  logId: number;
  logConfigurationId: string;
}>;

type ListScope = "active" | "deleted";

type ModalState =
  | { open: false }
  | { open: true; mode: "add" }
  | { open: true; mode: "edit"; remark: LogRemark };

type DeleteConfirmState =
  | { open: false }
  | { open: true; remark: LogRemark };

const REMARKS_GRID = "120px 120px 160px minmax(220px, 1fr) 72px";

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

function getRemarkSortValue(remark: LogRemark, field: string): string | number {
  switch (field) {
    case "depthFrom": {
      const numeric = Number(remark.depthFrom);
      return Number.isFinite(numeric) ? numeric : remark.depthFrom;
    }
    case "depthTo": {
      const numeric = Number(remark.depthTo);
      return Number.isFinite(numeric) ? numeric : remark.depthTo;
    }
    case "remarkTypeName":
      return remark.remarkTypeName;
    case "remarks":
      return remark.remarks;
    default:
      return "";
  }
}

export function RemarksSection({
  projectId,
  logId,
  logConfigurationId,
}: RemarksSectionProps) {
  const [remarks, setRemarks] = useState<LogRemark[]>([]);
  const [remarkTypes, setRemarkTypes] = useState<RemarkTypeOption[]>([]);
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

  const loadRemarks = useCallback(async () => {
    if (!projectId || !logId) return;
    setLoading(true);
    try {
      const onlyDeleted = listScope === "deleted";
      const result = await listLogRemarks(projectId, logId, page, pageSize, {
        search: debouncedSearch || undefined,
        onlyDeleted: onlyDeleted || undefined,
        sortBy: "id",
        sortOrder: "desc",
      });
      setRemarks(result.data);
      setTotal(result.total);
    } catch (err) {
      showApiError(err, API_ERROR_MESSAGES.LOAD_LOG_REMARKS);
      setRemarks([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [projectId, logId, page, pageSize, debouncedSearch, listScope]);

  const loadRemarkTypes = useCallback(async () => {
    if (!logConfigurationId.trim()) {
      setRemarkTypes([]);
      return;
    }
    try {
      const { data } = await getUserRemarkTypes(LOG_REMARKS_MODULE_ID, logConfigurationId);
      setRemarkTypes(parseRemarkTypeOptions(data, []));
    } catch {
      setRemarkTypes([]);
    }
  }, [logConfigurationId]);

  useEffect(() => {
    void loadRemarks();
  }, [loadRemarks]);

  useEffect(() => {
    void loadRemarkTypes();
  }, [loadRemarkTypes]);

  const { sort, toggleSort, sortedData } = useTableSort(remarks, getRemarkSortValue, {
    field: null,
    order: "asc",
  });

  useEffect(() => {
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    if (page > totalPages) setPage(totalPages);
  }, [page, pageSize, total]);

  const emptyMessage = loading
    ? "Loading remarks…"
    : listScope === "deleted"
      ? debouncedSearch
        ? "No deleted records match your search."
        : "No deleted records."
      : debouncedSearch
        ? "No remarks match your search."
        : "No remarks yet. Use Add New to create one.";

  const handleSearchChange = (value: string) => {
    setSearch(value);
    setPage(1);
  };

  const handlePageSizeChange = (nextPageSize: number) => {
    setPageSize(nextPageSize);
    setPage(1);
  };

  const openAddModal = () => {
    setListScope("active");
    setModal({ open: true, mode: "add" });
  };

  const openEditModal = (remark: LogRemark) => {
    setModal({ open: true, mode: "edit", remark });
  };

  const closeModal = () => setModal({ open: false });

  const handleSubmit = async (payload: LogRemarkFormSubmitPayload) => {
    if (modal.open && modal.mode === "edit") {
      await updateLogRemark(projectId, logId, modal.remark.id, payload);
    } else {
      await createLogRemark(projectId, logId, payload);
      setPage(1);
    }
    await loadRemarks();
  };

  const handleCopy = async (remark: LogRemark) => {
    setActionBusy(true);
    try {
      await copyLogRemark(projectId, logId, remark.id);
      setListScope("active");
      setPage(1);
      showApiSuccess(undefined, "Log remark copied.");
      await loadRemarks();
    } catch (err) {
      showApiError(err, API_ERROR_MESSAGES.SAVE_LOG_REMARK);
    } finally {
      setActionBusy(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirm.open) return;
    setActionBusy(true);
    try {
      await deleteLogRemark(projectId, logId, deleteConfirm.remark.id);
      setDeleteConfirm({ open: false });
      showApiSuccess(undefined, "Log remark deleted.");
      await loadRemarks();
    } catch (err) {
      showApiError(err, API_ERROR_MESSAGES.DELETE_LOG_REMARK);
    } finally {
      setActionBusy(false);
    }
  };

  const handleRestore = async (remark: LogRemark) => {
    setActionBusy(true);
    try {
      await restoreLogRemark(projectId, logId, remark.id);
      showApiSuccess(undefined, "Log remark restored.");
      await loadRemarks();
    } catch (err) {
      showApiError(err, API_ERROR_MESSAGES.RESTORE_LOG_REMARK);
    } finally {
      setActionBusy(false);
    }
  };

  const columns = useMemo<ColumnDef<LogRemark>[]>(
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
        cell: (remark) => (
          <span className="data-table__text">{formatCell(remark.depthFrom)}</span>
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
        cell: (remark) => (
          <span className="data-table__text">{formatCell(remark.depthTo)}</span>
        ),
      },
      {
        id: "remarkTypeName",
        header: (
          <ColumnHeader
            field="remarkTypeName"
            sortField={sort.field}
            sortOrder={sort.order}
            onSort={toggleSort}
          >
            Remark Type
          </ColumnHeader>
        ),
        cell: (remark) => (
          <span className="data-table__text">{formatCell(remark.remarkTypeName)}</span>
        ),
      },
      {
        id: "remarks",
        header: (
          <ColumnHeader
            field="remarks"
            sortField={sort.field}
            sortOrder={sort.order}
            onSort={toggleSort}
          >
            Remarks
          </ColumnHeader>
        ),
        cell: (remark) => (
          <span className="data-table__text">{formatCell(remark.remarks)}</span>
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
        cell: (remark) =>
          listScope === "deleted" ? (
            <TableRowActionsMenu
              label={`Actions for ${formatCell(remark.remarkTypeName)} at ${formatCell(remark.depthFrom)}`}
              actions={[
                {
                  id: "restore",
                  label: "Restore",
                  icon: <UnarchiveIcon />,
                  onClick: () => {
                    void handleRestore(remark);
                  },
                  disabled: actionBusy,
                },
              ]}
            />
          ) : (
            <TableRowActionsMenu
              label={`Actions for ${formatCell(remark.remarkTypeName)} at ${formatCell(remark.depthFrom)}`}
              actions={[
                {
                  id: "edit",
                  label: "Edit",
                  icon: <EditIcon />,
                  onClick: () => openEditModal(remark),
                  disabled: actionBusy,
                },
                {
                  id: "copy",
                  label: "Copy",
                  icon: <CopyIcon />,
                  onClick: () => {
                    void handleCopy(remark);
                  },
                  disabled: actionBusy,
                },
                {
                  id: "delete",
                  label: "Delete",
                  icon: <TrashIcon />,
                  tone: "danger",
                  onClick: () => setDeleteConfirm({ open: true, remark }),
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
    <section className="remarks-section" aria-label="Remarks">
      <div className="asset-card asset-card--table remarks-section__card">
        <div className="asset-card__toolbar remarks-section__toolbar">
          <div className="asset-card__filters">
            <TableSearch
              value={search}
              onChange={handleSearchChange}
              placeholder="Ex. Remarks, 1.5, groundwater"
              ariaLabel="Search remarks"
            />
          </div>

          <div className="remarks-section__actions">
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
            getRowId={(remark) => remark.id}
            gridTemplateColumns={REMARKS_GRID}
            emptyMessage={emptyMessage}
          />
        </div>

        <TablePagination
          page={page}
          pageSize={pageSize}
          total={total}
          pageSizeOptions={TABLE_PAGE_SIZE_OPTIONS}
          onPageChange={setPage}
          onPageSizeChange={handlePageSizeChange}
        />
      </div>

      <EditLogRemarkModal
        open={modal.open}
        mode={modal.open ? modal.mode : "add"}
        logConfigurationId={logConfigurationId}
        remarkTypes={remarkTypes}
        initialRemark={modal.open && modal.mode === "edit" ? modal.remark : null}
        onClose={closeModal}
        onSubmit={handleSubmit}
        onRemarkTypesChange={setRemarkTypes}
      />

      <ConfirmDialog
        open={deleteConfirm.open}
        title="Delete Log Remark"
        message={
          deleteConfirm.open
            ? `This will remove the ${deleteConfirm.remark.remarkTypeName} remark at depth ${formatCell(deleteConfirm.remark.depthFrom)}. You can restore it later from Deleted Records.`
            : "This will remove the selected log remark."
        }
        confirmLabel="Delete"
        cancelLabel="Cancel"
        variant="danger"
        onConfirm={() => {
          void handleDelete();
        }}
        onCancel={() => setDeleteConfirm({ open: false })}
      />
    </section>
  );
}
