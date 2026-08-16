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
import { getUserWellCoverTypes } from "../services/configModulesApi";
import {
  copyLogWellCover,
  createLogWellCover,
  deleteLogWellCover,
  listLogWellCovers,
  restoreLogWellCover,
  updateLogWellCover,
} from "../services/logWellCoverApi";
import type { LogWellCover } from "../types/logWellCover";
import {
  WELL_LOGS_MODULE_ID,
  parseWellCoverTypeOptions,
  type WellCoverTypeOption,
} from "../utils/configModules";
import {
  EditWellCoversModal,
  type LogWellCoverFormPayload,
} from "./EditWellCoversModal";

type WellCoversListProps = Readonly<{
  projectId: number;
  logId: number;
  logConfigurationId: string;
}>;

type ListScope = "active" | "deleted";

type ModalState =
  | { open: false }
  | { open: true; mode: "add" }
  | { open: true; mode: "edit"; cover: LogWellCover };

type DeleteConfirmState =
  | { open: false }
  | { open: true; cover: LogWellCover };

const COVERS_GRID = "140px minmax(180px, 1fr) 120px minmax(160px, 1fr) 72px";

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

function getCoverSortValue(cover: LogWellCover, field: string): string | number {
  switch (field) {
    case "wellIdLabel":
      return cover.wellIdLabel;
    case "wellCoverTypeName":
      return cover.wellCoverTypeName;
    case "depth": {
      const numeric = Number(cover.depth);
      return Number.isFinite(numeric) ? numeric : cover.depth;
    }
    case "comments":
      return cover.comments;
    default:
      return "";
  }
}

export function WellCoversList({
  projectId,
  logId,
  logConfigurationId,
}: WellCoversListProps) {
  const [covers, setCovers] = useState<LogWellCover[]>([]);
  const [wellCoverTypes, setWellCoverTypes] = useState<WellCoverTypeOption[]>([]);
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

  const loadCovers = useCallback(async () => {
    if (!projectId || !logId) return;
    setLoading(true);
    try {
      const onlyDeleted = listScope === "deleted";
      const result = await listLogWellCovers(projectId, logId, page, pageSize, {
        search: debouncedSearch || undefined,
        onlyDeleted: onlyDeleted || undefined,
        sortBy: "id",
        sortOrder: "desc",
      });
      setCovers(result.data);
      setTotal(result.total);
    } catch (err) {
      showApiError(err, API_ERROR_MESSAGES.LOAD_LOG_WELL_COVERS);
      setCovers([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [projectId, logId, page, pageSize, debouncedSearch, listScope]);

  const loadOptions = useCallback(async () => {
    if (!logConfigurationId.trim()) {
      setWellCoverTypes([]);
      return;
    }
    try {
      const coverTypesResponse = await getUserWellCoverTypes(
        WELL_LOGS_MODULE_ID,
        logConfigurationId
      );
      setWellCoverTypes(parseWellCoverTypeOptions(coverTypesResponse.data, []));
    } catch (err) {
      showApiError(err, API_ERROR_MESSAGES.LOAD_CONFIG_MODULES);
      setWellCoverTypes([]);
    }
  }, [logConfigurationId]);

  useEffect(() => {
    void loadCovers();
  }, [loadCovers]);

  useEffect(() => {
    void loadOptions();
  }, [loadOptions]);

  const { sort, toggleSort, sortedData } = useTableSort(covers, getCoverSortValue, {
    field: null,
    order: "asc",
  });

  useEffect(() => {
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    if (page > totalPages) setPage(totalPages);
  }, [page, pageSize, total]);

  const emptyMessage = loading
    ? "Loading well covers…"
    : listScope === "deleted"
      ? debouncedSearch
        ? "No deleted records match your search."
        : "No deleted records."
      : debouncedSearch
        ? "No well covers match your search."
        : "No well covers yet. Use Add New to create one.";

  const openAddModal = () => {
    setListScope("active");
    setModal({ open: true, mode: "add" });
  };

  const openEditModal = (cover: LogWellCover) => {
    setModal({ open: true, mode: "edit", cover });
  };

  const closeModal = () => setModal({ open: false });

  const handleSubmit = async (payload: LogWellCoverFormPayload) => {
    if (modal.open && modal.mode === "edit") {
      await updateLogWellCover(projectId, logId, modal.cover.id, payload);
    } else {
      await createLogWellCover(projectId, logId, payload);
      setPage(1);
    }
    await loadCovers();
  };

  const handleCopy = async (cover: LogWellCover) => {
    setActionBusy(true);
    try {
      await copyLogWellCover(projectId, logId, cover.id);
      setListScope("active");
      setPage(1);
      showApiSuccess(undefined, "Well cover copied.");
      await loadCovers();
    } catch (err) {
      showApiError(err, API_ERROR_MESSAGES.SAVE_LOG_WELL_COVER);
    } finally {
      setActionBusy(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirm.open) return;
    setActionBusy(true);
    try {
      await deleteLogWellCover(projectId, logId, deleteConfirm.cover.id);
      setDeleteConfirm({ open: false });
      showApiSuccess(undefined, "Well cover deleted.");
      await loadCovers();
    } catch (err) {
      showApiError(err, API_ERROR_MESSAGES.DELETE_LOG_WELL_COVER);
    } finally {
      setActionBusy(false);
    }
  };

  const handleRestore = async (cover: LogWellCover) => {
    setActionBusy(true);
    try {
      await restoreLogWellCover(projectId, logId, cover.id);
      showApiSuccess(undefined, "Well cover restored.");
      await loadCovers();
    } catch (err) {
      showApiError(err, API_ERROR_MESSAGES.RESTORE_LOG_WELL_COVER);
    } finally {
      setActionBusy(false);
    }
  };

  const columns = useMemo<ColumnDef<LogWellCover>[]>(
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
        cell: (cover) => (
          <span className="data-table__text">{formatCell(cover.wellIdLabel)}</span>
        ),
      },
      {
        id: "wellCoverTypeName",
        header: (
          <ColumnHeader
            field="wellCoverTypeName"
            sortField={sort.field}
            sortOrder={sort.order}
            onSort={toggleSort}
          >
            Well Cover Type
          </ColumnHeader>
        ),
        cell: (cover) => (
          <span className="data-table__text">{formatCell(cover.wellCoverTypeName)}</span>
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
        cell: (cover) => (
          <span className="data-table__text">{formatCell(cover.depth)}</span>
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
        cell: (cover) => (
          <span className="data-table__text">{formatCell(cover.comments)}</span>
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
        cell: (cover) =>
          listScope === "deleted" ? (
            <TableRowActionsMenu
              label={`Actions for ${formatCell(cover.wellIdLabel)} (${formatCell(cover.wellCoverTypeName)})`}
              actions={[
                {
                  id: "restore",
                  label: "Restore",
                  icon: <UnarchiveIcon />,
                  onClick: () => {
                    void handleRestore(cover);
                  },
                  disabled: actionBusy,
                },
              ]}
            />
          ) : (
            <TableRowActionsMenu
              label={`Actions for ${formatCell(cover.wellIdLabel)} (${formatCell(cover.wellCoverTypeName)})`}
              actions={[
                {
                  id: "edit",
                  label: "Edit",
                  icon: <EditIcon />,
                  onClick: () => openEditModal(cover),
                  disabled: actionBusy,
                },
                {
                  id: "copy",
                  label: "Copy",
                  icon: <CopyIcon />,
                  onClick: () => {
                    void handleCopy(cover);
                  },
                  disabled: actionBusy,
                },
                {
                  id: "delete",
                  label: "Delete",
                  icon: <TrashIcon />,
                  tone: "danger",
                  onClick: () => setDeleteConfirm({ open: true, cover }),
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
              placeholder="Ex. MW-01, flush mount"
              ariaLabel="Search well covers"
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
            getRowId={(cover) => cover.id}
            gridTemplateColumns={COVERS_GRID}
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

      <EditWellCoversModal
        open={modal.open}
        mode={modal.open ? modal.mode : "add"}
        logConfigurationId={logConfigurationId}
        wellCoverTypes={wellCoverTypes}
        initialCover={modal.open && modal.mode === "edit" ? modal.cover : null}
        onClose={closeModal}
        onSubmit={handleSubmit}
        onWellCoverTypesChange={setWellCoverTypes}
      />

      <ConfirmDialog
        open={deleteConfirm.open}
        title="Delete Well Cover"
        message={
          deleteConfirm.open
            ? `This will remove the ${formatCell(deleteConfirm.cover.wellCoverTypeName)} cover for ${formatCell(deleteConfirm.cover.wellIdLabel)}. You can restore it later from Deleted Records.`
            : "This will remove the selected well cover."
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
