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
import { getUserDrillingResistances } from "../services/configModulesApi";
import {
  copyLogDrillingResistance,
  createLogDrillingResistance,
  deleteLogDrillingResistance,
  listLogDrillingResistances,
  restoreLogDrillingResistance,
  updateLogDrillingResistance,
} from "../services/logDrillingResistanceApi";
import type { LogDrillingResistance } from "../types/logDrillingResistance";
import {
  DRILLING_OBSERVATIONS_MODULE_ID,
  parseDrillingResistanceOptions,
  type DrillingResistanceOption,
} from "../utils/configModules";
import {
  EditDrillingResistanceModal,
  type LogDrillingResistanceFormPayload,
} from "./EditDrillingResistanceModal";

type DrillingResistancesListProps = Readonly<{
  projectId: number;
  logId: number;
  logConfigurationId: string;
}>;

type ListScope = "active" | "deleted";

type ModalState =
  | { open: false }
  | { open: true; mode: "add" }
  | { open: true; mode: "edit"; resistance: LogDrillingResistance };

type DeleteConfirmState =
  | { open: false }
  | { open: true; resistance: LogDrillingResistance };

const RESISTANCES_GRID = "120px 120px minmax(180px, 1fr) minmax(180px, 1fr) 72px";

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

function getResistanceSortValue(resistance: LogDrillingResistance, field: string): string | number {
  switch (field) {
    case "depthFrom": {
      const numeric = Number(resistance.depthFrom);
      return Number.isFinite(numeric) ? numeric : resistance.depthFrom;
    }
    case "depthTo": {
      const numeric = Number(resistance.depthTo);
      return Number.isFinite(numeric) ? numeric : resistance.depthTo;
    }
    case "resistanceTypeName":
      return resistance.resistanceTypeName;
    case "comments":
      return resistance.comments;
    default:
      return "";
  }
}

export function DrillingResistancesList({
  projectId,
  logId,
  logConfigurationId,
}: DrillingResistancesListProps) {
  const [resistances, setResistances] = useState<LogDrillingResistance[]>([]);
  const [resistanceTypes, setResistanceTypes] = useState<DrillingResistanceOption[]>([]);
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

  const loadResistances = useCallback(async () => {
    if (!projectId || !logId) return;
    setLoading(true);
    try {
      const onlyDeleted = listScope === "deleted";
      const result = await listLogDrillingResistances(projectId, logId, page, pageSize, {
        search: debouncedSearch || undefined,
        onlyDeleted: onlyDeleted || undefined,
        sortBy: "id",
        sortOrder: "desc",
      });
      setResistances(result.data);
      setTotal(result.total);
    } catch (err) {
      showApiError(err, API_ERROR_MESSAGES.LOAD_LOG_DRILLING_RESISTANCES);
      setResistances([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [projectId, logId, page, pageSize, debouncedSearch, listScope]);

  const loadResistanceTypes = useCallback(async () => {
    if (!logConfigurationId.trim()) {
      setResistanceTypes([]);
      return;
    }
    try {
      const { data } = await getUserDrillingResistances(
        DRILLING_OBSERVATIONS_MODULE_ID,
        logConfigurationId
      );
      setResistanceTypes(parseDrillingResistanceOptions(data, []));
    } catch (err) {
      showApiError(err, API_ERROR_MESSAGES.LOAD_CONFIG_MODULES);
      setResistanceTypes([]);
    }
  }, [logConfigurationId]);

  useEffect(() => {
    void loadResistances();
  }, [loadResistances]);

  useEffect(() => {
    void loadResistanceTypes();
  }, [loadResistanceTypes]);

  const { sort, toggleSort, sortedData } = useTableSort(
    resistances,
    getResistanceSortValue,
    {
      field: null,
      order: "asc",
    }
  );

  useEffect(() => {
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    if (page > totalPages) setPage(totalPages);
  }, [page, pageSize, total]);

  const emptyMessage = loading
    ? "Loading drilling resistances…"
    : listScope === "deleted"
      ? debouncedSearch
        ? "No deleted records match your search."
        : "No deleted records."
      : debouncedSearch
        ? "No drilling resistances match your search."
        : "No drilling resistances yet. Use Add New to create one.";

  const openAddModal = () => {
    setListScope("active");
    setModal({ open: true, mode: "add" });
  };

  const openEditModal = (resistance: LogDrillingResistance) => {
    setModal({ open: true, mode: "edit", resistance });
  };

  const closeModal = () => setModal({ open: false });

  const handleSubmit = async (payload: LogDrillingResistanceFormPayload) => {
    if (modal.open && modal.mode === "edit") {
      await updateLogDrillingResistance(projectId, logId, modal.resistance.id, payload);
    } else {
      await createLogDrillingResistance(projectId, logId, payload);
      setPage(1);
    }
    await loadResistances();
  };

  const handleCopy = async (resistance: LogDrillingResistance) => {
    setActionBusy(true);
    try {
      await copyLogDrillingResistance(projectId, logId, resistance.id);
      setListScope("active");
      setPage(1);
      showApiSuccess(undefined, "Drilling resistance copied.");
      await loadResistances();
    } catch (err) {
      showApiError(err, API_ERROR_MESSAGES.SAVE_LOG_DRILLING_RESISTANCE);
    } finally {
      setActionBusy(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirm.open) return;
    setActionBusy(true);
    try {
      await deleteLogDrillingResistance(projectId, logId, deleteConfirm.resistance.id);
      setDeleteConfirm({ open: false });
      showApiSuccess(undefined, "Drilling resistance deleted.");
      await loadResistances();
    } catch (err) {
      showApiError(err, API_ERROR_MESSAGES.DELETE_LOG_DRILLING_RESISTANCE);
    } finally {
      setActionBusy(false);
    }
  };

  const handleRestore = async (resistance: LogDrillingResistance) => {
    setActionBusy(true);
    try {
      await restoreLogDrillingResistance(projectId, logId, resistance.id);
      showApiSuccess(undefined, "Drilling resistance restored.");
      await loadResistances();
    } catch (err) {
      showApiError(err, API_ERROR_MESSAGES.RESTORE_LOG_DRILLING_RESISTANCE);
    } finally {
      setActionBusy(false);
    }
  };

  const columns = useMemo<ColumnDef<LogDrillingResistance>[]>(
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
        cell: (resistance) => (
          <span className="data-table__text">{formatCell(resistance.depthFrom)}</span>
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
        cell: (resistance) => (
          <span className="data-table__text">{formatCell(resistance.depthTo)}</span>
        ),
      },
      {
        id: "resistanceTypeName",
        header: (
          <ColumnHeader
            field="resistanceTypeName"
            sortField={sort.field}
            sortOrder={sort.order}
            onSort={toggleSort}
          >
            Resistance Type
          </ColumnHeader>
        ),
        cell: (resistance) => (
          <span className="data-table__text">{formatCell(resistance.resistanceTypeName)}</span>
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
        cell: (resistance) => (
          <span className="data-table__text">{formatCell(resistance.comments)}</span>
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
        cell: (resistance) =>
          listScope === "deleted" ? (
            <TableRowActionsMenu
              label={`Actions for ${formatCell(resistance.resistanceTypeName)} at ${formatCell(resistance.depthFrom)}`}
              actions={[
                {
                  id: "restore",
                  label: "Restore",
                  icon: <UnarchiveIcon />,
                  onClick: () => {
                    void handleRestore(resistance);
                  },
                  disabled: actionBusy,
                },
              ]}
            />
          ) : (
            <TableRowActionsMenu
              label={`Actions for ${formatCell(resistance.resistanceTypeName)} at ${formatCell(resistance.depthFrom)}`}
              actions={[
                {
                  id: "edit",
                  label: "Edit",
                  icon: <EditIcon />,
                  onClick: () => openEditModal(resistance),
                  disabled: actionBusy,
                },
                {
                  id: "copy",
                  label: "Copy",
                  icon: <CopyIcon />,
                  onClick: () => {
                    void handleCopy(resistance);
                  },
                  disabled: actionBusy,
                },
                {
                  id: "delete",
                  label: "Delete",
                  icon: <TrashIcon />,
                  tone: "danger",
                  onClick: () => setDeleteConfirm({ open: true, resistance }),
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
              placeholder="Ex. Chatter, 1.5, vibration"
              ariaLabel="Search drilling resistances"
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
            getRowId={(resistance) => resistance.id}
            gridTemplateColumns={RESISTANCES_GRID}
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

      <EditDrillingResistanceModal
        open={modal.open}
        mode={modal.open ? modal.mode : "add"}
        logConfigurationId={logConfigurationId}
        resistanceTypes={resistanceTypes}
        initialResistance={modal.open && modal.mode === "edit" ? modal.resistance : null}
        onClose={closeModal}
        onSubmit={handleSubmit}
        onResistanceTypesChange={setResistanceTypes}
      />

      <ConfirmDialog
        open={deleteConfirm.open}
        title="Delete Drilling Resistance"
        message={
          deleteConfirm.open
            ? `This will remove the ${deleteConfirm.resistance.resistanceTypeName} resistance at depth ${formatCell(deleteConfirm.resistance.depthFrom)}. You can restore it later from Deleted Records.`
            : "This will remove the selected drilling resistance."
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
