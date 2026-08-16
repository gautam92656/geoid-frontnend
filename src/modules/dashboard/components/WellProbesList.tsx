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
import { getUserWellProbeTypes } from "../services/configModulesApi";
import {
  copyLogWellProbe,
  createLogWellProbe,
  deleteLogWellProbe,
  listLogWellProbes,
  restoreLogWellProbe,
  updateLogWellProbe,
} from "../services/logWellProbeApi";
import type { LogWellProbe } from "../types/logWellProbe";
import {
  WELL_LOGS_MODULE_ID,
  parseWellProbeTypeOptions,
  type WellProbeTypeOption,
} from "../utils/configModules";
import {
  EditWellProbesModal,
  type LogWellProbeFormPayload,
} from "./EditWellProbesModal";

type WellProbesListProps = Readonly<{
  projectId: number;
  logId: number;
  logConfigurationId: string;
}>;

type ListScope = "active" | "deleted";

type ModalState =
  | { open: false }
  | { open: true; mode: "add" }
  | { open: true; mode: "edit"; probe: LogWellProbe };

type DeleteConfirmState =
  | { open: false }
  | { open: true; probe: LogWellProbe };

const PROBES_GRID = "140px 120px minmax(160px, 1fr) minmax(160px, 1fr) 72px";

function formatCell(value: string): string {
  return value.trim() || "—";
}

function formatDepth(probe: LogWellProbe): string {
  const from = probe.depthFrom.trim();
  const to = probe.depthTo.trim();
  if (from && to) return `${from} – ${to}`;
  return from || to || "";
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

function getProbeSortValue(probe: LogWellProbe, field: string): string | number {
  switch (field) {
    case "wellIdLabel":
      return probe.wellIdLabel;
    case "depth": {
      const numeric = Number(probe.depthFrom);
      return Number.isFinite(numeric) ? numeric : probe.depthFrom;
    }
    case "probeTypeName":
      return probe.probeTypeName;
    case "comments":
      return probe.comments;
    default:
      return "";
  }
}

export function WellProbesList({
  projectId,
  logId,
  logConfigurationId,
}: WellProbesListProps) {
  const [probes, setProbes] = useState<LogWellProbe[]>([]);
  const [probeTypes, setProbeTypes] = useState<WellProbeTypeOption[]>([]);
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

  const loadProbes = useCallback(async () => {
    if (!projectId || !logId) return;
    setLoading(true);
    try {
      const onlyDeleted = listScope === "deleted";
      const result = await listLogWellProbes(projectId, logId, page, pageSize, {
        search: debouncedSearch || undefined,
        onlyDeleted: onlyDeleted || undefined,
        sortBy: "id",
        sortOrder: "desc",
      });
      setProbes(result.data);
      setTotal(result.total);
    } catch (err) {
      showApiError(err, API_ERROR_MESSAGES.LOAD_LOG_WELL_PROBES);
      setProbes([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [projectId, logId, page, pageSize, debouncedSearch, listScope]);

  const loadOptions = useCallback(async () => {
    if (!logConfigurationId.trim()) {
      setProbeTypes([]);
      return;
    }
    try {
      const probeTypesResponse = await getUserWellProbeTypes(
        WELL_LOGS_MODULE_ID,
        logConfigurationId
      );
      setProbeTypes(parseWellProbeTypeOptions(probeTypesResponse.data, []));
    } catch (err) {
      showApiError(err, API_ERROR_MESSAGES.LOAD_CONFIG_MODULES);
      setProbeTypes([]);
    }
  }, [logConfigurationId]);

  useEffect(() => {
    void loadProbes();
  }, [loadProbes]);

  useEffect(() => {
    void loadOptions();
  }, [loadOptions]);

  const { sort, toggleSort, sortedData } = useTableSort(probes, getProbeSortValue, {
    field: null,
    order: "asc",
  });

  useEffect(() => {
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    if (page > totalPages) setPage(totalPages);
  }, [page, pageSize, total]);

  const emptyMessage = loading
    ? "Loading well probes…"
    : listScope === "deleted"
      ? debouncedSearch
        ? "No deleted records match your search."
        : "No deleted records."
      : debouncedSearch
        ? "No well probes match your search."
        : "No well probes yet. Use Add New to create one.";

  const openAddModal = () => {
    setListScope("active");
    setModal({ open: true, mode: "add" });
  };

  const openEditModal = (probe: LogWellProbe) => {
    setModal({ open: true, mode: "edit", probe });
  };

  const closeModal = () => setModal({ open: false });

  const handleSubmit = async (payload: LogWellProbeFormPayload) => {
    if (modal.open && modal.mode === "edit") {
      await updateLogWellProbe(projectId, logId, modal.probe.id, payload);
    } else {
      await createLogWellProbe(projectId, logId, payload);
      setPage(1);
    }
    await loadProbes();
  };

  const handleCopy = async (probe: LogWellProbe) => {
    setActionBusy(true);
    try {
      await copyLogWellProbe(projectId, logId, probe.id);
      setListScope("active");
      setPage(1);
      showApiSuccess(undefined, "Well probe copied.");
      await loadProbes();
    } catch (err) {
      showApiError(err, API_ERROR_MESSAGES.SAVE_LOG_WELL_PROBE);
    } finally {
      setActionBusy(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirm.open) return;
    setActionBusy(true);
    try {
      await deleteLogWellProbe(projectId, logId, deleteConfirm.probe.id);
      setDeleteConfirm({ open: false });
      showApiSuccess(undefined, "Well probe deleted.");
      await loadProbes();
    } catch (err) {
      showApiError(err, API_ERROR_MESSAGES.DELETE_LOG_WELL_PROBE);
    } finally {
      setActionBusy(false);
    }
  };

  const handleRestore = async (probe: LogWellProbe) => {
    setActionBusy(true);
    try {
      await restoreLogWellProbe(projectId, logId, probe.id);
      showApiSuccess(undefined, "Well probe restored.");
      await loadProbes();
    } catch (err) {
      showApiError(err, API_ERROR_MESSAGES.RESTORE_LOG_WELL_PROBE);
    } finally {
      setActionBusy(false);
    }
  };

  const columns = useMemo<ColumnDef<LogWellProbe>[]>(
    () => [
      {
        id: "wellIdLabel",
        header: (
          <ColumnHeader
            field="wellIdLabel"
            sortField={sort.field}
            sortOrder={sort.order}
            onSort={toggleSort}
          >
            Well ID
          </ColumnHeader>
        ),
        cell: (probe) => (
          <span className="data-table__text">{formatCell(probe.wellIdLabel)}</span>
        ),
      },
      {
        id: "depth",
        header: (
          <ColumnHeader
            field="depth"
            sortField={sort.field}
            sortOrder={sort.order}
            onSort={toggleSort}
          >
            Depth (m)
          </ColumnHeader>
        ),
        cell: (probe) => (
          <span className="data-table__text">{formatCell(formatDepth(probe))}</span>
        ),
      },
      {
        id: "probeTypeName",
        header: (
          <ColumnHeader
            field="probeTypeName"
            sortField={sort.field}
            sortOrder={sort.order}
            onSort={toggleSort}
          >
            Type
          </ColumnHeader>
        ),
        cell: (probe) => (
          <span className="data-table__text">{formatCell(probe.probeTypeName)}</span>
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
        cell: (probe) => (
          <span className="data-table__text">{formatCell(probe.comments)}</span>
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
        cell: (probe) =>
          listScope === "deleted" ? (
            <TableRowActionsMenu
              label={`Actions for ${formatCell(probe.wellIdLabel)} (${formatCell(probe.probeTypeName)})`}
              actions={[
                {
                  id: "restore",
                  label: "Restore",
                  icon: <UnarchiveIcon />,
                  onClick: () => {
                    void handleRestore(probe);
                  },
                  disabled: actionBusy,
                },
              ]}
            />
          ) : (
            <TableRowActionsMenu
              label={`Actions for ${formatCell(probe.wellIdLabel)} (${formatCell(probe.probeTypeName)})`}
              actions={[
                {
                  id: "edit",
                  label: "Edit",
                  icon: <EditIcon />,
                  onClick: () => openEditModal(probe),
                  disabled: actionBusy,
                },
                {
                  id: "copy",
                  label: "Copy",
                  icon: <CopyIcon />,
                  onClick: () => {
                    void handleCopy(probe);
                  },
                  disabled: actionBusy,
                },
                {
                  id: "delete",
                  label: "Delete",
                  icon: <TrashIcon />,
                  tone: "danger",
                  onClick: () => setDeleteConfirm({ open: true, probe }),
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
              placeholder="Ex. MW-01, 5.0, transducer"
              ariaLabel="Search well probes and instruments"
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
            getRowId={(probe) => probe.id}
            gridTemplateColumns={PROBES_GRID}
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

      <EditWellProbesModal
        open={modal.open}
        mode={modal.open ? modal.mode : "add"}
        logConfigurationId={logConfigurationId}
        probeTypes={probeTypes}
        initialProbe={modal.open && modal.mode === "edit" ? modal.probe : null}
        onClose={closeModal}
        onSubmit={handleSubmit}
        onProbeTypesChange={setProbeTypes}
      />

      <ConfirmDialog
        open={deleteConfirm.open}
        title="Delete Well Probe"
        message={
          deleteConfirm.open
            ? `This will remove the ${formatCell(deleteConfirm.probe.probeTypeName)} probe for ${formatCell(deleteConfirm.probe.wellIdLabel)}. You can restore it later from Deleted Records.`
            : "This will remove the selected well probe."
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
