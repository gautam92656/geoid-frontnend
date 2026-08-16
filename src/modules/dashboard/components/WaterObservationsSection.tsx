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
  copyLogWaterObservation,
  createLogWaterObservation,
  deleteLogWaterObservation,
  listLogWaterObservations,
  restoreLogWaterObservation,
  updateLogWaterObservation,
} from "../services/logWaterObservationApi";
import { getUserWaterObservationTypes } from "../services/configModulesApi";
import type { LogWaterObservation } from "../types/logWaterObservation";
import {
  WATER_OBSERVATIONS_MODULE_ID,
  parseWaterObservationTypeOptions,
  type WaterObservationTypeOption,
} from "../utils/configModules";
import {
  EditWaterObservationsModal,
  type LogWaterObservationFormSubmitPayload,
} from "./EditWaterObservationsModal";

type WaterObservationsSectionProps = Readonly<{
  projectId: number;
  logId: number;
  logConfigurationId: string;
}>;

type ListScope = "active" | "deleted";

type ModalState =
  | { open: false }
  | { open: true; mode: "add" }
  | { open: true; mode: "edit"; observation: LogWaterObservation };

type DeleteConfirmState =
  | { open: false }
  | { open: true; observation: LogWaterObservation };

const OBSERVATIONS_GRID =
  "100px minmax(160px, 1fr) minmax(130px, 0.8fr) minmax(100px, 0.6fr) minmax(160px, 1fr) 72px";

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

function getObservationSortValue(
  observation: LogWaterObservation,
  field: string
): string | number {
  switch (field) {
    case "depth": {
      const numeric = Number(observation.depth);
      return Number.isFinite(numeric) ? numeric : observation.depth;
    }
    case "observationTypeName":
      return observation.observationTypeName;
    case "observationDate":
      return observation.observationDate;
    case "observationTime":
      return observation.observationTime;
    case "comments":
      return observation.comments;
    default:
      return "";
  }
}

export function WaterObservationsSection({
  projectId,
  logId,
  logConfigurationId,
}: WaterObservationsSectionProps) {
  const [observations, setObservations] = useState<LogWaterObservation[]>([]);
  const [observationTypes, setObservationTypes] = useState<WaterObservationTypeOption[]>([]);
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

  const loadObservations = useCallback(async () => {
    if (!projectId || !logId) return;
    setLoading(true);
    try {
      const onlyDeleted = listScope === "deleted";
      const result = await listLogWaterObservations(projectId, logId, page, pageSize, {
        search: debouncedSearch || undefined,
        onlyDeleted: onlyDeleted || undefined,
        sortBy: "id",
        sortOrder: "desc",
      });
      setObservations(result.data);
      setTotal(result.total);
    } catch (err) {
      showApiError(err, API_ERROR_MESSAGES.LOAD_LOG_WATER_OBSERVATIONS);
      setObservations([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [projectId, logId, page, pageSize, debouncedSearch, listScope]);

  const loadObservationTypes = useCallback(async () => {
    if (!logConfigurationId.trim()) {
      setObservationTypes([]);
      return;
    }
    try {
      const { data } = await getUserWaterObservationTypes(
        WATER_OBSERVATIONS_MODULE_ID,
        logConfigurationId
      );
      setObservationTypes(parseWaterObservationTypeOptions(data, []));
    } catch {
      setObservationTypes([]);
    }
  }, [logConfigurationId]);

  useEffect(() => {
    void loadObservations();
  }, [loadObservations]);

  useEffect(() => {
    void loadObservationTypes();
  }, [loadObservationTypes]);

  const { sort, toggleSort, sortedData } = useTableSort(
    observations,
    getObservationSortValue,
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
    ? "Loading water observations…"
    : listScope === "deleted"
      ? debouncedSearch
        ? "No deleted records match your search."
        : "No deleted records."
      : debouncedSearch
        ? "No water observations match your search."
        : "No water observations yet. Use Add New to create one.";

  const openAddModal = () => {
    setListScope("active");
    setModal({ open: true, mode: "add" });
  };

  const openEditModal = (observation: LogWaterObservation) => {
    setModal({ open: true, mode: "edit", observation });
  };

  const closeModal = () => setModal({ open: false });

  const handleSubmit = async (payload: LogWaterObservationFormSubmitPayload) => {
    if (modal.open && modal.mode === "edit") {
      await updateLogWaterObservation(projectId, logId, modal.observation.id, payload);
    } else {
      await createLogWaterObservation(projectId, logId, payload);
      setPage(1);
    }
    await loadObservations();
  };

  const handleCopy = async (observation: LogWaterObservation) => {
    setActionBusy(true);
    try {
      await copyLogWaterObservation(projectId, logId, observation.id);
      setListScope("active");
      setPage(1);
      showApiSuccess(undefined, "Water observation copied.");
      await loadObservations();
    } catch (err) {
      showApiError(err, API_ERROR_MESSAGES.SAVE_LOG_WATER_OBSERVATION);
    } finally {
      setActionBusy(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirm.open) return;
    setActionBusy(true);
    try {
      await deleteLogWaterObservation(projectId, logId, deleteConfirm.observation.id);
      setDeleteConfirm({ open: false });
      showApiSuccess(undefined, "Water observation deleted.");
      await loadObservations();
    } catch (err) {
      showApiError(err, API_ERROR_MESSAGES.DELETE_LOG_WATER_OBSERVATION);
    } finally {
      setActionBusy(false);
    }
  };

  const handleRestore = async (observation: LogWaterObservation) => {
    setActionBusy(true);
    try {
      await restoreLogWaterObservation(projectId, logId, observation.id);
      showApiSuccess(undefined, "Water observation restored.");
      await loadObservations();
    } catch (err) {
      showApiError(err, API_ERROR_MESSAGES.RESTORE_LOG_WATER_OBSERVATION);
    } finally {
      setActionBusy(false);
    }
  };

  const columns = useMemo<ColumnDef<LogWaterObservation>[]>(
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
        cell: (observation) => (
          <span className="data-table__text">{formatCell(observation.depth)}</span>
        ),
      },
      {
        id: "observationTypeName",
        header: (
          <ColumnHeader
            field="observationTypeName"
            sortField={sort.field}
            sortOrder={sort.order}
            onSort={toggleSort}
          >
            Observation Type
          </ColumnHeader>
        ),
        cell: (observation) => (
          <span className="data-table__text">
            {formatCell(observation.observationTypeName)}
          </span>
        ),
      },
      {
        id: "observationDate",
        header: (
          <ColumnHeader
            field="observationDate"
            sortField={sort.field}
            sortOrder={sort.order}
            onSort={toggleSort}
          >
            Date
          </ColumnHeader>
        ),
        cell: (observation) => (
          <span className="data-table__text">
            {formatCell(observation.observationDate)}
          </span>
        ),
      },
      {
        id: "observationTime",
        header: (
          <ColumnHeader
            field="observationTime"
            sortField={sort.field}
            sortOrder={sort.order}
            onSort={toggleSort}
          >
            Time
          </ColumnHeader>
        ),
        cell: (observation) => (
          <span className="data-table__text">
            {formatCell(observation.observationTime)}
          </span>
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
        cell: (observation) => (
          <span className="data-table__text">{formatCell(observation.comments)}</span>
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
        cell: (observation) =>
          listScope === "deleted" ? (
            <TableRowActionsMenu
              label={`Actions for ${formatCell(observation.observationTypeName)} at ${formatCell(observation.depth)}`}
              actions={[
                {
                  id: "restore",
                  label: "Restore",
                  icon: <UnarchiveIcon />,
                  onClick: () => {
                    void handleRestore(observation);
                  },
                  disabled: actionBusy,
                },
              ]}
            />
          ) : (
            <TableRowActionsMenu
              label={`Actions for ${formatCell(observation.observationTypeName)} at ${formatCell(observation.depth)}`}
              actions={[
                {
                  id: "edit",
                  label: "Edit",
                  icon: <EditIcon />,
                  onClick: () => openEditModal(observation),
                  disabled: actionBusy,
                },
                {
                  id: "copy",
                  label: "Copy",
                  icon: <CopyIcon />,
                  onClick: () => {
                    void handleCopy(observation);
                  },
                  disabled: actionBusy,
                },
                {
                  id: "delete",
                  label: "Delete",
                  icon: <TrashIcon />,
                  tone: "danger",
                  onClick: () => setDeleteConfirm({ open: true, observation }),
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
              placeholder="Ex. Standing, 1.5, seepage"
              ariaLabel="Search water observations"
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
            getRowId={(observation) => observation.id}
            gridTemplateColumns={OBSERVATIONS_GRID}
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

      <EditWaterObservationsModal
        open={modal.open}
        mode={modal.open ? modal.mode : "add"}
        logConfigurationId={logConfigurationId}
        observationTypes={observationTypes}
        initialObservation={
          modal.open && modal.mode === "edit" ? modal.observation : null
        }
        onClose={closeModal}
        onSubmit={handleSubmit}
        onObservationTypesChange={setObservationTypes}
      />

      <ConfirmDialog
        open={deleteConfirm.open}
        title="Delete Water Observation"
        message={
          deleteConfirm.open
            ? `This will remove the ${deleteConfirm.observation.observationTypeName} observation at depth ${formatCell(deleteConfirm.observation.depth)}. You can restore it later from Deleted Records.`
            : "This will remove the selected water observation."
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
