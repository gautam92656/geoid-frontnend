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
import { getUserDrillingTypes } from "../services/configModulesApi";
import {
  copyLogDrillingMethod,
  createLogDrillingMethod,
  deleteLogDrillingMethod,
  listLogDrillingMethods,
  restoreLogDrillingMethod,
  updateLogDrillingMethod,
} from "../services/logDrillingMethodApi";
import type { LogDrillingMethod } from "../types/logDrillingMethod";
import {
  DRILLING_OBSERVATIONS_MODULE_ID,
  parseDrillingTypeOptions,
  type DrillingTypeOption,
} from "../utils/configModules";
import {
  EditDrillingMethodsModal,
  type LogDrillingMethodFormPayload,
} from "./EditDrillingMethodsModal";

type DrillingMethodsListProps = Readonly<{
  projectId: number;
  logId: number;
  logConfigurationId: string;
}>;

type ListScope = "active" | "deleted";

type ModalState =
  | { open: false }
  | { open: true; mode: "add" }
  | { open: true; mode: "edit"; method: LogDrillingMethod };

type DeleteConfirmState =
  | { open: false }
  | { open: true; method: LogDrillingMethod };

const METHODS_GRID = "120px 120px minmax(220px, 1fr) 72px";

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

function getMethodSortValue(method: LogDrillingMethod, field: string): string | number {
  switch (field) {
    case "depthFrom": {
      const numeric = Number(method.depthFrom);
      return Number.isFinite(numeric) ? numeric : method.depthFrom;
    }
    case "depthTo": {
      const numeric = Number(method.depthTo);
      return Number.isFinite(numeric) ? numeric : method.depthTo;
    }
    case "drillingMethodName":
      return method.drillingMethodName;
    default:
      return "";
  }
}

export function DrillingMethodsList({
  projectId,
  logId,
  logConfigurationId,
}: DrillingMethodsListProps) {
  const [methods, setMethods] = useState<LogDrillingMethod[]>([]);
  const [drillingTypes, setDrillingTypes] = useState<DrillingTypeOption[]>([]);
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

  const loadMethods = useCallback(async () => {
    if (!projectId || !logId) return;
    setLoading(true);
    try {
      const onlyDeleted = listScope === "deleted";
      const result = await listLogDrillingMethods(projectId, logId, page, pageSize, {
        search: debouncedSearch || undefined,
        onlyDeleted: onlyDeleted || undefined,
        sortBy: "id",
        sortOrder: "desc",
      });
      setMethods(result.data);
      setTotal(result.total);
    } catch (err) {
      showApiError(err, API_ERROR_MESSAGES.LOAD_LOG_DRILLING_METHODS);
      setMethods([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [projectId, logId, page, pageSize, debouncedSearch, listScope]);

  const loadDrillingTypes = useCallback(async () => {
    if (!logConfigurationId.trim()) {
      setDrillingTypes([]);
      return;
    }
    try {
      const { data } = await getUserDrillingTypes(
        DRILLING_OBSERVATIONS_MODULE_ID,
        logConfigurationId
      );
      setDrillingTypes(parseDrillingTypeOptions(data, []));
    } catch (err) {
      showApiError(err, API_ERROR_MESSAGES.LOAD_CONFIG_MODULES);
      setDrillingTypes([]);
    }
  }, [logConfigurationId]);

  useEffect(() => {
    void loadMethods();
  }, [loadMethods]);

  useEffect(() => {
    void loadDrillingTypes();
  }, [loadDrillingTypes]);

  const { sort, toggleSort, sortedData } = useTableSort(methods, getMethodSortValue, {
    field: null,
    order: "asc",
  });

  useEffect(() => {
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    if (page > totalPages) setPage(totalPages);
  }, [page, pageSize, total]);

  const emptyMessage = loading
    ? "Loading drilling methods…"
    : listScope === "deleted"
      ? debouncedSearch
        ? "No deleted records match your search."
        : "No deleted records."
      : debouncedSearch
        ? "No drilling methods match your search."
        : "No drilling methods yet. Use Add New to create one.";

  const openAddModal = () => {
    setListScope("active");
    setModal({ open: true, mode: "add" });
  };

  const openEditModal = (method: LogDrillingMethod) => {
    setModal({ open: true, mode: "edit", method });
  };

  const closeModal = () => setModal({ open: false });

  const handleSubmit = async (payload: LogDrillingMethodFormPayload) => {
    if (modal.open && modal.mode === "edit") {
      await updateLogDrillingMethod(projectId, logId, modal.method.id, payload);
    } else {
      await createLogDrillingMethod(projectId, logId, payload);
      setPage(1);
    }
    await loadMethods();
  };

  const handleCopy = async (method: LogDrillingMethod) => {
    setActionBusy(true);
    try {
      await copyLogDrillingMethod(projectId, logId, method.id);
      setListScope("active");
      setPage(1);
      showApiSuccess(undefined, "Drilling method copied.");
      await loadMethods();
    } catch (err) {
      showApiError(err, API_ERROR_MESSAGES.SAVE_LOG_DRILLING_METHOD);
    } finally {
      setActionBusy(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirm.open) return;
    setActionBusy(true);
    try {
      await deleteLogDrillingMethod(projectId, logId, deleteConfirm.method.id);
      setDeleteConfirm({ open: false });
      showApiSuccess(undefined, "Drilling method deleted.");
      await loadMethods();
    } catch (err) {
      showApiError(err, API_ERROR_MESSAGES.DELETE_LOG_DRILLING_METHOD);
    } finally {
      setActionBusy(false);
    }
  };

  const handleRestore = async (method: LogDrillingMethod) => {
    setActionBusy(true);
    try {
      await restoreLogDrillingMethod(projectId, logId, method.id);
      showApiSuccess(undefined, "Drilling method restored.");
      await loadMethods();
    } catch (err) {
      showApiError(err, API_ERROR_MESSAGES.RESTORE_LOG_DRILLING_METHOD);
    } finally {
      setActionBusy(false);
    }
  };

  const columns = useMemo<ColumnDef<LogDrillingMethod>[]>(
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
        cell: (method) => (
          <span className="data-table__text">{formatCell(method.depthFrom)}</span>
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
        cell: (method) => (
          <span className="data-table__text">{formatCell(method.depthTo)}</span>
        ),
      },
      {
        id: "drillingMethodName",
        header: (
          <ColumnHeader
            field="drillingMethodName"
            sortField={sort.field}
            sortOrder={sort.order}
            onSort={toggleSort}
          >
            Drilling Method
          </ColumnHeader>
        ),
        cell: (method) => (
          <span className="data-table__text">{formatCell(method.drillingMethodName)}</span>
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
        cell: (method) =>
          listScope === "deleted" ? (
            <TableRowActionsMenu
              label={`Actions for ${formatCell(method.drillingMethodName)} at ${formatCell(method.depthFrom)}`}
              actions={[
                {
                  id: "restore",
                  label: "Restore",
                  icon: <UnarchiveIcon />,
                  onClick: () => {
                    void handleRestore(method);
                  },
                  disabled: actionBusy,
                },
              ]}
            />
          ) : (
            <TableRowActionsMenu
              label={`Actions for ${formatCell(method.drillingMethodName)} at ${formatCell(method.depthFrom)}`}
              actions={[
                {
                  id: "edit",
                  label: "Edit",
                  icon: <EditIcon />,
                  onClick: () => openEditModal(method),
                  disabled: actionBusy,
                },
                {
                  id: "copy",
                  label: "Copy",
                  icon: <CopyIcon />,
                  onClick: () => {
                    void handleCopy(method);
                  },
                  disabled: actionBusy,
                },
                {
                  id: "delete",
                  label: "Delete",
                  icon: <TrashIcon />,
                  tone: "danger",
                  onClick: () => setDeleteConfirm({ open: true, method }),
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
              placeholder="Ex. Auger, 1.5, coring"
              ariaLabel="Search drilling methods"
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
            getRowId={(method) => method.id}
            gridTemplateColumns={METHODS_GRID}
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

      <EditDrillingMethodsModal
        open={modal.open}
        mode={modal.open ? modal.mode : "add"}
        logConfigurationId={logConfigurationId}
        drillingTypes={drillingTypes}
        initialMethod={modal.open && modal.mode === "edit" ? modal.method : null}
        onClose={closeModal}
        onSubmit={handleSubmit}
        onDrillingTypesChange={setDrillingTypes}
      />

      <ConfirmDialog
        open={deleteConfirm.open}
        title="Delete Drilling Method"
        message={
          deleteConfirm.open
            ? `This will remove the ${deleteConfirm.method.drillingMethodName} method at depth ${formatCell(deleteConfirm.method.depthFrom)}. You can restore it later from Deleted Records.`
            : "This will remove the selected drilling method."
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
