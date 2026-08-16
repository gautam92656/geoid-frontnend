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
import { getUserDrillingCasings } from "../services/configModulesApi";
import {
  copyLogDrillingCasing,
  createLogDrillingCasing,
  deleteLogDrillingCasing,
  listLogDrillingCasings,
  restoreLogDrillingCasing,
  updateLogDrillingCasing,
} from "../services/logDrillingCasingApi";
import type { LogDrillingCasing } from "../types/logDrillingCasing";
import {
  DRILLING_OBSERVATIONS_MODULE_ID,
  parseDrillingCasingOptions,
  type DrillingCasingOption,
} from "../utils/configModules";
import {
  EditDrillingCasingsModal,
  type LogDrillingCasingFormPayload,
} from "./EditDrillingCasingsModal";

type DrillingCasingsListProps = Readonly<{
  projectId: number;
  logId: number;
  logConfigurationId: string;
}>;

type ListScope = "active" | "deleted";

type ModalState =
  | { open: false }
  | { open: true; mode: "add" }
  | { open: true; mode: "edit"; casing: LogDrillingCasing };

type DeleteConfirmState =
  | { open: false }
  | { open: true; casing: LogDrillingCasing };

const CASINGS_GRID = "120px 120px minmax(220px, 1fr) 72px";

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

function getCasingSortValue(casing: LogDrillingCasing, field: string): string | number {
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
    default:
      return "";
  }
}

export function DrillingCasingsList({
  projectId,
  logId,
  logConfigurationId,
}: DrillingCasingsListProps) {
  const [casings, setCasings] = useState<LogDrillingCasing[]>([]);
  const [casingTypes, setCasingTypes] = useState<DrillingCasingOption[]>([]);
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
      const result = await listLogDrillingCasings(projectId, logId, page, pageSize, {
        search: debouncedSearch || undefined,
        onlyDeleted: onlyDeleted || undefined,
        sortBy: "id",
        sortOrder: "desc",
      });
      setCasings(result.data);
      setTotal(result.total);
    } catch (err) {
      showApiError(err, API_ERROR_MESSAGES.LOAD_LOG_DRILLING_CASINGS);
      setCasings([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [projectId, logId, page, pageSize, debouncedSearch, listScope]);

  const loadCasingTypes = useCallback(async () => {
    if (!logConfigurationId.trim()) {
      setCasingTypes([]);
      return;
    }
    try {
      const { data } = await getUserDrillingCasings(
        DRILLING_OBSERVATIONS_MODULE_ID,
        logConfigurationId
      );
      setCasingTypes(parseDrillingCasingOptions(data, []));
    } catch (err) {
      showApiError(err, API_ERROR_MESSAGES.LOAD_CONFIG_MODULES);
      setCasingTypes([]);
    }
  }, [logConfigurationId]);

  useEffect(() => {
    void loadCasings();
  }, [loadCasings]);

  useEffect(() => {
    void loadCasingTypes();
  }, [loadCasingTypes]);

  const { sort, toggleSort, sortedData } = useTableSort(casings, getCasingSortValue, {
    field: null,
    order: "asc",
  });

  useEffect(() => {
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    if (page > totalPages) setPage(totalPages);
  }, [page, pageSize, total]);

  const emptyMessage = loading
    ? "Loading drilling casings…"
    : listScope === "deleted"
      ? debouncedSearch
        ? "No deleted records match your search."
        : "No deleted records."
      : debouncedSearch
        ? "No drilling casings match your search."
        : "No drilling casings yet. Use Add New to create one.";

  const openAddModal = () => {
    setListScope("active");
    setModal({ open: true, mode: "add" });
  };

  const openEditModal = (casing: LogDrillingCasing) => {
    setModal({ open: true, mode: "edit", casing });
  };

  const closeModal = () => setModal({ open: false });

  const handleSubmit = async (payload: LogDrillingCasingFormPayload) => {
    if (modal.open && modal.mode === "edit") {
      await updateLogDrillingCasing(projectId, logId, modal.casing.id, payload);
    } else {
      await createLogDrillingCasing(projectId, logId, payload);
      setPage(1);
    }
    await loadCasings();
  };

  const handleCopy = async (casing: LogDrillingCasing) => {
    setActionBusy(true);
    try {
      await copyLogDrillingCasing(projectId, logId, casing.id);
      setListScope("active");
      setPage(1);
      showApiSuccess(undefined, "Drilling casing copied.");
      await loadCasings();
    } catch (err) {
      showApiError(err, API_ERROR_MESSAGES.SAVE_LOG_DRILLING_CASING);
    } finally {
      setActionBusy(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirm.open) return;
    setActionBusy(true);
    try {
      await deleteLogDrillingCasing(projectId, logId, deleteConfirm.casing.id);
      setDeleteConfirm({ open: false });
      showApiSuccess(undefined, "Drilling casing deleted.");
      await loadCasings();
    } catch (err) {
      showApiError(err, API_ERROR_MESSAGES.DELETE_LOG_DRILLING_CASING);
    } finally {
      setActionBusy(false);
    }
  };

  const handleRestore = async (casing: LogDrillingCasing) => {
    setActionBusy(true);
    try {
      await restoreLogDrillingCasing(projectId, logId, casing.id);
      showApiSuccess(undefined, "Drilling casing restored.");
      await loadCasings();
    } catch (err) {
      showApiError(err, API_ERROR_MESSAGES.RESTORE_LOG_DRILLING_CASING);
    } finally {
      setActionBusy(false);
    }
  };

  const columns = useMemo<ColumnDef<LogDrillingCasing>[]>(
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
              label={`Actions for ${formatCell(casing.casingTypeName)} at ${formatCell(casing.depthFrom)}`}
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
              label={`Actions for ${formatCell(casing.casingTypeName)} at ${formatCell(casing.depthFrom)}`}
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
              placeholder="Ex. PVC, 1.5, steel"
              ariaLabel="Search drilling casings"
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

      <EditDrillingCasingsModal
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
        title="Delete Drilling Casing"
        message={
          deleteConfirm.open
            ? `This will remove the ${deleteConfirm.casing.casingTypeName} casing at depth ${formatCell(deleteConfirm.casing.depthFrom)}. You can restore it later from Deleted Records.`
            : "This will remove the selected drilling casing."
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
