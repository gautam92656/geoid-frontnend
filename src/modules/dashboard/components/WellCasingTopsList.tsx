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
import { getUserWellCasingTops } from "../services/configModulesApi";
import {
  copyLogWellCasingTop,
  createLogWellCasingTop,
  deleteLogWellCasingTop,
  listLogWellCasingTops,
  restoreLogWellCasingTop,
  updateLogWellCasingTop,
} from "../services/logWellCasingTopApi";
import type { LogWellCasingTop } from "../types/logWellCasingTop";
import {
  WELL_LOGS_MODULE_ID,
  parseWellCasingTopTypeOptions,
  type WellCasingTopTypeOption,
} from "../utils/configModules";
import {
  EditWellCasingTopsModal,
  type LogWellCasingTopFormPayload,
} from "./EditWellCasingTopsModal";

type WellCasingTopsListProps = Readonly<{
  projectId: number;
  logId: number;
  logConfigurationId: string;
}>;

type ListScope = "active" | "deleted";

type ModalState =
  | { open: false }
  | { open: true; mode: "add" }
  | { open: true; mode: "edit"; casingTop: LogWellCasingTop };

type DeleteConfirmState =
  | { open: false }
  | { open: true; casingTop: LogWellCasingTop };

const CASING_TOPS_GRID = "120px 120px 120px minmax(140px, 1fr) minmax(140px, 1fr) 72px";

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

function getCasingTopSortValue(casingTop: LogWellCasingTop, field: string): string | number {
  switch (field) {
    case "elevation": {
      const numeric = Number(casingTop.elevation);
      return Number.isFinite(numeric) ? numeric : casingTop.elevation;
    }
    case "depthFrom": {
      const numeric = Number(casingTop.depthFrom);
      return Number.isFinite(numeric) ? numeric : casingTop.depthFrom;
    }
    case "depthTo": {
      const numeric = Number(casingTop.depthTo);
      return Number.isFinite(numeric) ? numeric : casingTop.depthTo;
    }
    case "casingTypeName":
      return casingTop.casingTypeName;
    case "notes":
      return casingTop.notes;
    default:
      return "";
  }
}

export function WellCasingTopsList({
  projectId,
  logId,
  logConfigurationId,
}: WellCasingTopsListProps) {
  const [casingTops, setCasingTops] = useState<LogWellCasingTop[]>([]);
  const [casingTypes, setCasingTypes] = useState<WellCasingTopTypeOption[]>([]);
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

  const loadCasingTops = useCallback(async () => {
    if (!projectId || !logId) return;
    setLoading(true);
    try {
      const onlyDeleted = listScope === "deleted";
      const result = await listLogWellCasingTops(projectId, logId, page, pageSize, {
        search: debouncedSearch || undefined,
        onlyDeleted: onlyDeleted || undefined,
        sortBy: "id",
        sortOrder: "desc",
      });
      setCasingTops(result.data);
      setTotal(result.total);
    } catch (err) {
      showApiError(err, API_ERROR_MESSAGES.LOAD_LOG_WELL_CASING_TOPS);
      setCasingTops([]);
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
      const response = await getUserWellCasingTops(WELL_LOGS_MODULE_ID, logConfigurationId);
      setCasingTypes(parseWellCasingTopTypeOptions(response.data, []));
    } catch (err) {
      showApiError(err, API_ERROR_MESSAGES.LOAD_CONFIG_MODULES);
      setCasingTypes([]);
    }
  }, [logConfigurationId]);

  useEffect(() => {
    void loadCasingTops();
  }, [loadCasingTops]);

  useEffect(() => {
    void loadOptions();
  }, [loadOptions]);

  const { sort, toggleSort, sortedData } = useTableSort(casingTops, getCasingTopSortValue, {
    field: null,
    order: "asc",
  });

  useEffect(() => {
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    if (page > totalPages) setPage(totalPages);
  }, [page, pageSize, total]);

  const emptyMessage = loading
    ? "Loading well casing tops…"
    : listScope === "deleted"
      ? debouncedSearch
        ? "No deleted records match your search."
        : "No deleted records."
      : debouncedSearch
        ? "No well casing tops match your search."
        : "No well casing tops yet. Use Add New to create one.";

  const openAddModal = () => {
    setListScope("active");
    setModal({ open: true, mode: "add" });
  };

  const openEditModal = (casingTop: LogWellCasingTop) => {
    setModal({ open: true, mode: "edit", casingTop });
  };

  const closeModal = () => setModal({ open: false });

  const handleSubmit = async (payload: LogWellCasingTopFormPayload) => {
    if (modal.open && modal.mode === "edit") {
      await updateLogWellCasingTop(projectId, logId, modal.casingTop.id, payload);
    } else {
      await createLogWellCasingTop(projectId, logId, payload);
      setPage(1);
    }
    await loadCasingTops();
  };

  const handleCopy = async (casingTop: LogWellCasingTop) => {
    setActionBusy(true);
    try {
      await copyLogWellCasingTop(projectId, logId, casingTop.id);
      setListScope("active");
      setPage(1);
      showApiSuccess(undefined, "Well casing top copied.");
      await loadCasingTops();
    } catch (err) {
      showApiError(err, API_ERROR_MESSAGES.SAVE_LOG_WELL_CASING_TOP);
    } finally {
      setActionBusy(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirm.open) return;
    setActionBusy(true);
    try {
      await deleteLogWellCasingTop(projectId, logId, deleteConfirm.casingTop.id);
      setDeleteConfirm({ open: false });
      showApiSuccess(undefined, "Well casing top deleted.");
      await loadCasingTops();
    } catch (err) {
      showApiError(err, API_ERROR_MESSAGES.DELETE_LOG_WELL_CASING_TOP);
    } finally {
      setActionBusy(false);
    }
  };

  const handleRestore = async (casingTop: LogWellCasingTop) => {
    setActionBusy(true);
    try {
      await restoreLogWellCasingTop(projectId, logId, casingTop.id);
      showApiSuccess(undefined, "Well casing top restored.");
      await loadCasingTops();
    } catch (err) {
      showApiError(err, API_ERROR_MESSAGES.RESTORE_LOG_WELL_CASING_TOP);
    } finally {
      setActionBusy(false);
    }
  };

  const columns = useMemo<ColumnDef<LogWellCasingTop>[]>(
    () => [
      {
        id: "elevation",
        header: (
          <ColumnHeader
            field="elevation"
            sortField={sort.field}
            sortOrder={sort.order}
            onSort={toggleSort}
          >
            Elevation (m)
          </ColumnHeader>
        ),
        cell: (casingTop) => (
          <span className="data-table__text">{formatCell(casingTop.elevation)}</span>
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
        cell: (casingTop) => (
          <span className="data-table__text">{formatCell(casingTop.depthFrom)}</span>
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
        cell: (casingTop) => (
          <span className="data-table__text">{formatCell(casingTop.depthTo)}</span>
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
        cell: (casingTop) => (
          <span className="data-table__text">{formatCell(casingTop.casingTypeName)}</span>
        ),
      },
      {
        id: "notes",
        header: (
          <ColumnHeader
            field="notes"
            sortField={sort.field}
            sortOrder={sort.order}
            onSort={toggleSort}
          >
            Notes
          </ColumnHeader>
        ),
        cell: (casingTop) => (
          <span className="data-table__text">{formatCell(casingTop.notes)}</span>
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
        cell: (casingTop) =>
          listScope === "deleted" ? (
            <TableRowActionsMenu
              label={`Actions for ${formatCell(casingTop.casingTypeName)}`}
              actions={[
                {
                  id: "restore",
                  label: "Restore",
                  icon: <UnarchiveIcon />,
                  onClick: () => {
                    void handleRestore(casingTop);
                  },
                  disabled: actionBusy,
                },
              ]}
            />
          ) : (
            <TableRowActionsMenu
              label={`Actions for ${formatCell(casingTop.casingTypeName)}`}
              actions={[
                {
                  id: "edit",
                  label: "Edit",
                  icon: <EditIcon />,
                  onClick: () => openEditModal(casingTop),
                  disabled: actionBusy,
                },
                {
                  id: "copy",
                  label: "Copy",
                  icon: <CopyIcon />,
                  onClick: () => {
                    void handleCopy(casingTop);
                  },
                  disabled: actionBusy,
                },
                {
                  id: "delete",
                  label: "Delete",
                  icon: <TrashIcon />,
                  tone: "danger",
                  onClick: () => setDeleteConfirm({ open: true, casingTop }),
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
              placeholder="Ex. PVC, 1.5, elevation"
              ariaLabel="Search well casing tops"
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
            getRowId={(casingTop) => casingTop.id}
            gridTemplateColumns={CASING_TOPS_GRID}
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

      <EditWellCasingTopsModal
        open={modal.open}
        mode={modal.open ? modal.mode : "add"}
        logConfigurationId={logConfigurationId}
        casingTypes={casingTypes}
        initialCasingTop={modal.open && modal.mode === "edit" ? modal.casingTop : null}
        onClose={closeModal}
        onSubmit={handleSubmit}
        onCasingTypesChange={setCasingTypes}
      />

      <ConfirmDialog
        open={deleteConfirm.open}
        title="Delete Well Casing Top"
        message={
          deleteConfirm.open
            ? `This will remove the ${formatCell(deleteConfirm.casingTop.casingTypeName)} casing top. You can restore it later from Deleted Records.`
            : "This will remove the selected well casing top."
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
