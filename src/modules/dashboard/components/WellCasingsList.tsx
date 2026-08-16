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
import { getUserWellCasingTypes } from "../services/configModulesApi";
import {
  copyLogWellCasing,
  createLogWellCasing,
  deleteLogWellCasing,
  listLogWellCasings,
  restoreLogWellCasing,
  updateLogWellCasing,
} from "../services/logWellCasingApi";
import type { LogWellCasing } from "../types/logWellCasing";
import {
  WELL_LOGS_MODULE_ID,
  parseWellCasingTypeOptions,
  type WellCasingTypeOption,
} from "../utils/configModules";
import {
  EditWellCasingsModal,
  type LogWellCasingFormPayload,
} from "./EditWellCasingsModal";

type WellCasingsListProps = Readonly<{
  projectId: number;
  logId: number;
  logConfigurationId: string;
}>;

type ListScope = "active" | "deleted";

type ModalState =
  | { open: false }
  | { open: true; mode: "add" }
  | { open: true; mode: "edit"; casing: LogWellCasing };

type DeleteConfirmState =
  | { open: false }
  | { open: true; casing: LogWellCasing };

const CASINGS_GRID = "120px 120px minmax(180px, 1fr) minmax(180px, 1fr) 72px";

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

function getCasingSortValue(casing: LogWellCasing, field: string): string | number {
  switch (field) {
    case "depthFrom": {
      const numeric = Number(casing.depthFrom);
      return Number.isFinite(numeric) ? numeric : casing.depthFrom;
    }
    case "depthTo": {
      const numeric = Number(casing.depthTo);
      return Number.isFinite(numeric) ? numeric : casing.depthTo;
    }
    case "casingTypeName":
      return casing.casingTypeName;
    case "comments":
      return casing.comments;
    default:
      return "";
  }
}

export function WellCasingsList({
  projectId,
  logId,
  logConfigurationId,
}: WellCasingsListProps) {
  const [casings, setCasings] = useState<LogWellCasing[]>([]);
  const [casingTypes, setCasingTypes] = useState<WellCasingTypeOption[]>([]);
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

  const loadCasings = useCallback(async () => {
    if (!projectId || !logId) return;
    setLoading(true);
    try {
      const onlyDeleted = listScope === "deleted";
      const result = await listLogWellCasings(projectId, logId, page, pageSize, {
        search: debouncedSearch || undefined,
        onlyDeleted: onlyDeleted || undefined,
        sortBy: "id",
        sortOrder: "desc",
      });
      setCasings(result.data);
      setTotal(result.total);
    } catch (err) {
      showApiError(err, API_ERROR_MESSAGES.LOAD_LOG_WELL_CASINGS);
      setCasings([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [projectId, logId, page, pageSize, debouncedSearch, listScope]);

  const loadOptions = useCallback(async () => {
    if (!logConfigurationId.trim()) {
      setCasingTypes([]);
      return;
    }
    try {
      const response = await getUserWellCasingTypes(WELL_LOGS_MODULE_ID, logConfigurationId);
      setCasingTypes(parseWellCasingTypeOptions(response.data, []));
    } catch (err) {
      showApiError(err, API_ERROR_MESSAGES.LOAD_CONFIG_MODULES);
      setCasingTypes([]);
    }
  }, [logConfigurationId]);

  useEffect(() => {
    void loadCasings();
  }, [loadCasings]);

  useEffect(() => {
    void loadOptions();
  }, [loadOptions]);

  const { sort, toggleSort, sortedData } = useTableSort(casings, getCasingSortValue, {
    field: null,
    order: "asc",
  });

  useEffect(() => {
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    if (page > totalPages) setPage(totalPages);
  }, [page, pageSize, total]);

  const emptyMessage = loading
    ? "Loading well casings…"
    : listScope === "deleted"
      ? debouncedSearch
        ? "No deleted records match your search."
        : "No deleted records."
      : debouncedSearch
        ? "No well casings match your search."
        : "No well casings yet. Use Add New to create one.";

  const openAddModal = () => {
    setListScope("active");
    setModal({ open: true, mode: "add" });
  };

  const openEditModal = (casing: LogWellCasing) => {
    setModal({ open: true, mode: "edit", casing });
  };

  const closeModal = () => setModal({ open: false });

  const handleSubmit = async (payload: LogWellCasingFormPayload) => {
    if (modal.open && modal.mode === "edit") {
      await updateLogWellCasing(projectId, logId, modal.casing.id, payload);
    } else {
      await createLogWellCasing(projectId, logId, payload);
      setPage(1);
    }
    await loadCasings();
  };

  const handleCopy = async (casing: LogWellCasing) => {
    setActionBusy(true);
    try {
      await copyLogWellCasing(projectId, logId, casing.id);
      setListScope("active");
      setPage(1);
      showApiSuccess(undefined, "Well casing copied.");
      await loadCasings();
    } catch (err) {
      showApiError(err, API_ERROR_MESSAGES.SAVE_LOG_WELL_CASING);
    } finally {
      setActionBusy(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirm.open) return;
    setActionBusy(true);
    try {
      await deleteLogWellCasing(projectId, logId, deleteConfirm.casing.id);
      setDeleteConfirm({ open: false });
      showApiSuccess(undefined, "Well casing deleted.");
      await loadCasings();
    } catch (err) {
      showApiError(err, API_ERROR_MESSAGES.DELETE_LOG_WELL_CASING);
    } finally {
      setActionBusy(false);
    }
  };

  const handleRestore = async (casing: LogWellCasing) => {
    setActionBusy(true);
    try {
      await restoreLogWellCasing(projectId, logId, casing.id);
      showApiSuccess(undefined, "Well casing restored.");
      await loadCasings();
    } catch (err) {
      showApiError(err, API_ERROR_MESSAGES.RESTORE_LOG_WELL_CASING);
    } finally {
      setActionBusy(false);
    }
  };

  const columns = useMemo<ColumnDef<LogWellCasing>[]>(
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
        cell: (casing) => (
          <span className="data-table__text">{formatCell(casing.depthFrom)}</span>
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
        cell: (casing) => (
          <span className="data-table__text">{formatCell(casing.depthTo)}</span>
        ),
      },
      {
        id: "casingTypeName",
        header: (
          <ColumnHeader
            field="casingTypeName"
            sortField={sort.field}
            sortOrder={sort.order}
            onSort={toggleSort}
          >
            Casing Type
          </ColumnHeader>
        ),
        cell: (casing) => (
          <span className="data-table__text">{formatCell(casing.casingTypeName)}</span>
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
        cell: (casing) => (
          <span className="data-table__text">{formatCell(casing.comments)}</span>
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
        cell: (casing) =>
          listScope === "deleted" ? (
            <TableRowActionsMenu
              label={`Actions for ${formatCell(casing.casingTypeName)}`}
              actions={[
                {
                  id: "restore",
                  label: "Restore",
                  icon: <UnarchiveIcon />,
                  onClick: () => {
                    void handleRestore(casing);
                  },
                  disabled: actionBusy,
                },
              ]}
            />
          ) : (
            <TableRowActionsMenu
              label={`Actions for ${formatCell(casing.casingTypeName)}`}
              actions={[
                {
                  id: "edit",
                  label: "Edit",
                  icon: <EditIcon />,
                  onClick: () => openEditModal(casing),
                  disabled: actionBusy,
                },
                {
                  id: "copy",
                  label: "Copy",
                  icon: <CopyIcon />,
                  onClick: () => {
                    void handleCopy(casing);
                  },
                  disabled: actionBusy,
                },
                {
                  id: "delete",
                  label: "Delete",
                  icon: <TrashIcon />,
                  tone: "danger",
                  onClick: () => setDeleteConfirm({ open: true, casing }),
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
              placeholder="Ex. PVC, 1.5, surface"
              ariaLabel="Search well casings"
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
            getRowId={(casing) => casing.id}
            gridTemplateColumns={CASINGS_GRID}
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

      <EditWellCasingsModal
        open={modal.open}
        mode={modal.open ? modal.mode : "add"}
        logConfigurationId={logConfigurationId}
        casingTypes={casingTypes}
        initialCasing={modal.open && modal.mode === "edit" ? modal.casing : null}
        onClose={closeModal}
        onSubmit={handleSubmit}
        onCasingTypesChange={setCasingTypes}
      />

      <ConfirmDialog
        open={deleteConfirm.open}
        title="Delete Well Casing"
        message={
          deleteConfirm.open
            ? `This will remove the ${formatCell(deleteConfirm.casing.casingTypeName)} casing. You can restore it later from Deleted Records.`
            : "This will remove the selected well casing."
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
