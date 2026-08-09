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
import { MAX_TABLE_PAGE_SIZE, TABLE_PAGE_SIZE_OPTIONS } from "@/shared/constants/pagination";
import { API_ERROR_MESSAGES } from "@/shared/constants/apiMessages";
import { showApiError, showApiSuccess } from "@/shared/utils/apiToast";
import {
  copyLogSubsurface,
  createLogSubsurface,
  deleteLogSubsurface,
  listLogSubsurfaces,
  restoreLogSubsurface,
  updateLogSubsurface,
} from "../services/subsurfaceApi";
import type { SubsurfaceLayer } from "../types/subsurfaceLayer";
import {
  EditSubsurfaceModal,
  type SubsurfaceFormSubmitPayload,
} from "./EditSubsurfaceModal";

type SubsurfaceSectionProps = Readonly<{
  projectId: number;
  logId: number;
  logConfigurationId: string;
  /** Notified whenever active (non-deleted) layers change — used by report preview. */
  onActiveLayersChange?: (layers: SubsurfaceLayer[]) => void;
}>;

type ListScope = "active" | "deleted";

type ModalState =
  | { open: false }
  | { open: true; mode: "add" }
  | { open: true; mode: "edit"; layer: SubsurfaceLayer };

type DeleteConfirmState =
  | { open: false }
  | { open: true; layer: SubsurfaceLayer };

const SUBSURFACE_GRID = "120px 140px 160px minmax(220px, 1fr) 72px";

function formatCell(value: string): string {
  return value.trim() || "—";
}

function FinaliseIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M4 20h4l10.5-10.5a2.1 2.1 0 00-3-3L5 17v3z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path d="M13.5 6.5l3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
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

function getLayerSortValue(layer: SubsurfaceLayer, field: string): string | number {
  switch (field) {
    case "depth": {
      const numeric = Number(layer.depth);
      return Number.isFinite(numeric) ? numeric : layer.depth;
    }
    case "classification":
      return layer.classification;
    case "origin":
      return layer.origin;
    case "description":
      return layer.description;
    default:
      return "";
  }
}

function payloadFromSubmit(payload: SubsurfaceFormSubmitPayload) {
  return {
    depth: payload.depth.trim() || "0",
    classification: payload.classification,
    origin: payload.origin,
    description: payload.description,
    consistency: payload.consistency,
    moisture: payload.moisture,
    remarks: payload.remarks,
    hatch: payload.hatch,
    values: payload.values,
  };
}

export function SubsurfaceSection({
  projectId,
  logId,
  logConfigurationId,
  onActiveLayersChange,
}: SubsurfaceSectionProps) {
  const [layers, setLayers] = useState<SubsurfaceLayer[]>([]);
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

  const notifyActiveLayers = useCallback(
    (allLayers: SubsurfaceLayer[]) => {
      onActiveLayersChange?.(allLayers.filter((layer) => layer.deletedAt == null));
    },
    [onActiveLayersChange]
  );

  const loadLayers = useCallback(async () => {
    if (!projectId || !logId) return;
    setLoading(true);
    try {
      const onlyDeleted = listScope === "deleted";
      const [result, activeResult] = await Promise.all([
        listLogSubsurfaces(projectId, logId, page, pageSize, {
          search: debouncedSearch || undefined,
          onlyDeleted: onlyDeleted || undefined,
          sortBy: "id",
          sortOrder: "desc",
        }),
        listLogSubsurfaces(projectId, logId, 1, MAX_TABLE_PAGE_SIZE, {
          sortBy: "sortOrder",
          sortOrder: "asc",
        }),
      ]);

      setLayers(result.data);
      setTotal(result.total);
      notifyActiveLayers(activeResult.data);
    } catch (err) {
      showApiError(err, API_ERROR_MESSAGES.LOAD_SUBSURFACE_LAYERS);
      setLayers([]);
      setTotal(0);
      notifyActiveLayers([]);
    } finally {
      setLoading(false);
    }
  }, [projectId, logId, page, pageSize, debouncedSearch, listScope, notifyActiveLayers]);

  useEffect(() => {
    void loadLayers();
  }, [loadLayers]);

  const { sort, toggleSort, sortedData } = useTableSort(layers, getLayerSortValue, {
    field: null,
    order: "asc",
  });

  useEffect(() => {
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    if (page > totalPages) setPage(totalPages);
  }, [page, pageSize, total]);

  const emptyMessage = loading
    ? "Loading subsurface layers…"
    : listScope === "deleted"
      ? debouncedSearch
        ? "No deleted records match your search."
        : "No deleted records."
      : debouncedSearch
        ? "No subsurface layers match your search."
        : "No subsurface layers yet. Use Add New to create one.";

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

  const openEditModal = (layer: SubsurfaceLayer) => {
    setModal({ open: true, mode: "edit", layer });
  };

  const closeModal = () => setModal({ open: false });

  const handleSubmit = async (payload: SubsurfaceFormSubmitPayload) => {
    const body = payloadFromSubmit(payload);
    if (modal.open && modal.mode === "edit") {
      await updateLogSubsurface(projectId, logId, modal.layer.id, body);
    } else {
      await createLogSubsurface(projectId, logId, body);
      setPage(1);
    }
    await loadLayers();
  };

  const handleCopy = async (layer: SubsurfaceLayer) => {
    setActionBusy(true);
    try {
      await copyLogSubsurface(projectId, logId, layer.id);
      setListScope("active");
      setPage(1);
      showApiSuccess(undefined, "Subsurface layer copied.");
      await loadLayers();
    } catch (err) {
      showApiError(err, API_ERROR_MESSAGES.SAVE_SUBSURFACE_LAYER);
    } finally {
      setActionBusy(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirm.open) return;
    setActionBusy(true);
    try {
      await deleteLogSubsurface(projectId, logId, deleteConfirm.layer.id);
      setDeleteConfirm({ open: false });
      showApiSuccess(undefined, "Subsurface layer deleted.");
      await loadLayers();
    } catch (err) {
      showApiError(err, API_ERROR_MESSAGES.DELETE_SUBSURFACE_LAYER);
    } finally {
      setActionBusy(false);
    }
  };

  const handleRestore = async (layer: SubsurfaceLayer) => {
    setActionBusy(true);
    try {
      await restoreLogSubsurface(projectId, logId, layer.id);
      showApiSuccess(undefined, "Subsurface layer restored.");
      await loadLayers();
    } catch (err) {
      showApiError(err, API_ERROR_MESSAGES.RESTORE_SUBSURFACE_LAYER);
    } finally {
      setActionBusy(false);
    }
  };

  const handleFinalise = () => {
    showApiSuccess(undefined, "Finalise USC and description is coming soon.");
  };

  const handleBulkEdit = () => {
    showApiSuccess(undefined, "Bulk edit is coming soon.");
  };

  const columns = useMemo<ColumnDef<SubsurfaceLayer>[]>(
    () => [
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
        cell: (layer) => <span className="data-table__text">{formatCell(layer.depth)}</span>,
      },
      {
        id: "classification",
        header: (
          <ColumnHeader
            field="classification"
            sortField={sort.field}
            sortOrder={sort.order}
            onSort={toggleSort}
          >
            Classification
          </ColumnHeader>
        ),
        cell: (layer) => (
          <span className="data-table__text">{formatCell(layer.classification)}</span>
        ),
      },
      {
        id: "origin",
        header: (
          <ColumnHeader
            field="origin"
            sortField={sort.field}
            sortOrder={sort.order}
            onSort={toggleSort}
          >
            Origin
          </ColumnHeader>
        ),
        cell: (layer) => <span className="data-table__text">{formatCell(layer.origin)}</span>,
      },
      {
        id: "description",
        header: (
          <ColumnHeader
            field="description"
            sortField={sort.field}
            sortOrder={sort.order}
            onSort={toggleSort}
          >
            Description
          </ColumnHeader>
        ),
        cell: (layer) => (
          <span className="data-table__text">{formatCell(layer.description)}</span>
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
        cell: (layer) =>
          listScope === "deleted" ? (
            <TableRowActionsMenu
              label={`Actions for depth ${formatCell(layer.depth)}`}
              actions={[
                {
                  id: "restore",
                  label: "Restore",
                  icon: <UnarchiveIcon />,
                  onClick: () => {
                    void handleRestore(layer);
                  },
                  disabled: actionBusy,
                },
              ]}
            />
          ) : (
            <TableRowActionsMenu
              label={`Actions for depth ${formatCell(layer.depth)}`}
              actions={[
                {
                  id: "edit",
                  label: "Edit",
                  icon: <EditIcon />,
                  onClick: () => openEditModal(layer),
                  disabled: actionBusy,
                },
                {
                  id: "copy",
                  label: "Copy",
                  icon: <CopyIcon />,
                  onClick: () => {
                    void handleCopy(layer);
                  },
                  disabled: actionBusy,
                },
                {
                  id: "delete",
                  label: "Delete",
                  icon: <TrashIcon />,
                  tone: "danger",
                  onClick: () => setDeleteConfirm({ open: true, layer }),
                  disabled: actionBusy,
                },
                {
                  id: "finalise",
                  label: "Finalise USC And Description",
                  icon: <FinaliseIcon />,
                  onClick: () => handleFinalise(),
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
    <section className="subsurface-section" aria-label="Subsurface">
      <div className="asset-card asset-card--table subsurface-section__card">
        <div className="asset-card__toolbar subsurface-section__toolbar">
          <div className="asset-card__filters">
            <TableSearch
              value={search}
              onChange={handleSearchChange}
              placeholder="Ex. 0.5, Sample"
              ariaLabel="Search subsurface layers"
            />
          </div>

          <div className="subsurface-section__actions">
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
            <UiButton
              type="button"
              variant="outline"
              size="sm"
              className="subsurface-section__bulk-btn"
              onClick={handleBulkEdit}
              disabled={listScope === "deleted" || actionBusy}
            >
              Bulk Edit
            </UiButton>
          </div>
        </div>

        <div className="asset-card__table-wrap ui-scrollbar">
          <DataTable
            columns={columns}
            data={sortedData}
            getRowId={(layer) => layer.id}
            gridTemplateColumns={SUBSURFACE_GRID}
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

      <EditSubsurfaceModal
        open={modal.open}
        onClose={closeModal}
        logConfigurationId={logConfigurationId}
        mode={modal.open ? modal.mode : "add"}
        initialValues={
          modal.open && modal.mode === "edit" ? modal.layer.values : undefined
        }
        onSubmit={handleSubmit}
      />

      <ConfirmDialog
        open={deleteConfirm.open}
        title="Delete subsurface layer?"
        message={
          deleteConfirm.open
            ? `Move the layer at depth ${formatCell(deleteConfirm.layer.depth)} to deleted records?`
            : "Move this subsurface layer to deleted records?"
        }
        confirmLabel="Delete"
        cancelLabel="Cancel"
        variant="danger"
        onCancel={() => setDeleteConfirm({ open: false })}
        onConfirm={() => {
          void handleDelete();
        }}
      />
    </section>
  );
}
