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
  copyLogSample,
  createLogSample,
  deleteLogSample,
  listLogSamples,
  restoreLogSample,
  updateLogSample,
} from "../services/logSampleApi";
import { createLogInsituTest } from "../services/logInsituTestApi";
import { getUserSampleTypes } from "../services/configModulesApi";
import type { LogSample } from "../types/logSample";
import {
  SAMPLES_MODULE_ID,
  parseSampleTypeOptions,
  type SampleTypeOption,
} from "../utils/configModules";
import {
  EditSamplesModal,
  type LogSampleFormSubmitPayload,
} from "./EditSamplesModal";

type SamplesSectionProps = Readonly<{
  projectId: number;
  logId: number;
  logConfigurationId: string;
}>;

type ListScope = "active" | "deleted";

type ModalState =
  | { open: false }
  | { open: true; mode: "add" }
  | { open: true; mode: "edit"; sample: LogSample };

type DeleteConfirmState =
  | { open: false }
  | { open: true; sample: LogSample };

const SAMPLES_GRID = "110px 110px 160px 140px minmax(160px, 1fr) 72px";

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

function getSampleSortValue(sample: LogSample, field: string): string | number {
  switch (field) {
    case "depthFrom": {
      const numeric = Number(sample.depthFrom);
      return Number.isFinite(numeric) ? numeric : sample.depthFrom;
    }
    case "depthTo": {
      const numeric = Number(sample.depthTo);
      return Number.isFinite(numeric) ? numeric : sample.depthTo;
    }
    case "sampleTypeName":
      return sample.sampleTypeName;
    case "sampleNo":
      return sample.sampleNo;
    case "comments":
      return sample.comments;
    default:
      return "";
  }
}

export function SamplesSection({
  projectId,
  logId,
  logConfigurationId,
}: SamplesSectionProps) {
  const [samples, setSamples] = useState<LogSample[]>([]);
  const [sampleTypes, setSampleTypes] = useState<SampleTypeOption[]>([]);
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

  const loadSamples = useCallback(async () => {
    if (!projectId || !logId) return;
    setLoading(true);
    try {
      const onlyDeleted = listScope === "deleted";
      const result = await listLogSamples(projectId, logId, page, pageSize, {
        search: debouncedSearch || undefined,
        onlyDeleted: onlyDeleted || undefined,
        sortBy: "id",
        sortOrder: "desc",
      });
      setSamples(result.data);
      setTotal(result.total);
    } catch (err) {
      showApiError(err, API_ERROR_MESSAGES.LOAD_LOG_SAMPLES);
      setSamples([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [projectId, logId, page, pageSize, debouncedSearch, listScope]);

  const loadSampleTypes = useCallback(async () => {
    if (!logConfigurationId.trim()) {
      setSampleTypes([]);
      return;
    }
    try {
      const { data } = await getUserSampleTypes(SAMPLES_MODULE_ID, logConfigurationId);
      setSampleTypes(parseSampleTypeOptions(data, []));
    } catch {
      setSampleTypes([]);
    }
  }, [logConfigurationId]);

  useEffect(() => {
    void loadSamples();
  }, [loadSamples]);

  useEffect(() => {
    void loadSampleTypes();
  }, [loadSampleTypes]);

  const { sort, toggleSort, sortedData } = useTableSort(samples, getSampleSortValue, {
    field: null,
    order: "asc",
  });

  useEffect(() => {
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    if (page > totalPages) setPage(totalPages);
  }, [page, pageSize, total]);

  const emptyMessage = loading
    ? "Loading samples…"
    : listScope === "deleted"
      ? debouncedSearch
        ? "No deleted records match your search."
        : "No deleted records."
      : debouncedSearch
        ? "No samples match your search."
        : "No samples yet. Use Add New to create one.";

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

  const openEditModal = (sample: LogSample) => {
    setModal({ open: true, mode: "edit", sample });
  };

  const closeModal = () => setModal({ open: false });

  const handleSubmit = async (payload: LogSampleFormSubmitPayload) => {
    const { pendingInsituTests, ...samplePayload } = payload;

    if (modal.open && modal.mode === "edit") {
      await updateLogSample(projectId, logId, modal.sample.id, samplePayload);
      await loadSamples();
      return;
    }

    const created = await createLogSample(projectId, logId, samplePayload);
    const newSampleId = created.data.id;

    if (pendingInsituTests.length > 0 && newSampleId) {
      for (const test of pendingInsituTests) {
        await createLogInsituTest(projectId, logId, {
          ...test,
          sampleId: newSampleId,
        });
      }
    }

    setPage(1);
    await loadSamples();
  };

  const handleCopy = async (sample: LogSample) => {
    setActionBusy(true);
    try {
      await copyLogSample(projectId, logId, sample.id);
      setListScope("active");
      setPage(1);
      showApiSuccess(undefined, "Sample copied.");
      await loadSamples();
    } catch (err) {
      showApiError(err, API_ERROR_MESSAGES.SAVE_LOG_SAMPLE);
    } finally {
      setActionBusy(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirm.open) return;
    setActionBusy(true);
    try {
      await deleteLogSample(projectId, logId, deleteConfirm.sample.id);
      setDeleteConfirm({ open: false });
      showApiSuccess(undefined, "Sample deleted.");
      await loadSamples();
    } catch (err) {
      showApiError(err, API_ERROR_MESSAGES.DELETE_LOG_SAMPLE);
    } finally {
      setActionBusy(false);
    }
  };

  const handleRestore = async (sample: LogSample) => {
    setActionBusy(true);
    try {
      await restoreLogSample(projectId, logId, sample.id);
      showApiSuccess(undefined, "Sample restored.");
      await loadSamples();
    } catch (err) {
      showApiError(err, API_ERROR_MESSAGES.RESTORE_LOG_SAMPLE);
    } finally {
      setActionBusy(false);
    }
  };

  const columns = useMemo<ColumnDef<LogSample>[]>(
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
        cell: (sample) => (
          <span className="data-table__text">{formatCell(sample.depthFrom)}</span>
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
        cell: (sample) => (
          <span className="data-table__text">{formatCell(sample.depthTo)}</span>
        ),
      },
      {
        id: "sampleTypeName",
        header: (
          <ColumnHeader
            field="sampleTypeName"
            sortField={sort.field}
            sortOrder={sort.order}
            onSort={toggleSort}
          >
            Sample Type
          </ColumnHeader>
        ),
        cell: (sample) => (
          <span className="data-table__text">{formatCell(sample.sampleTypeName)}</span>
        ),
      },
      {
        id: "sampleNo",
        header: (
          <ColumnHeader
            field="sampleNo"
            sortField={sort.field}
            sortOrder={sort.order}
            onSort={toggleSort}
          >
            Sample ID
          </ColumnHeader>
        ),
        cell: (sample) => (
          <span className="data-table__text">{formatCell(sample.sampleNo)}</span>
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
        cell: (sample) => (
          <span className="data-table__text">{formatCell(sample.comments)}</span>
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
        cell: (sample) =>
          listScope === "deleted" ? (
            <TableRowActionsMenu
              label={`Actions for ${formatCell(sample.sampleTypeName)} at ${formatCell(sample.depthFrom)}`}
              actions={[
                {
                  id: "restore",
                  label: "Restore",
                  icon: <UnarchiveIcon />,
                  onClick: () => {
                    void handleRestore(sample);
                  },
                  disabled: actionBusy,
                },
              ]}
            />
          ) : (
            <TableRowActionsMenu
              label={`Actions for ${formatCell(sample.sampleTypeName)} at ${formatCell(sample.depthFrom)}`}
              actions={[
                {
                  id: "edit",
                  label: "Edit",
                  icon: <EditIcon />,
                  onClick: () => openEditModal(sample),
                  disabled: actionBusy,
                },
                {
                  id: "copy",
                  label: "Copy",
                  icon: <CopyIcon />,
                  onClick: () => {
                    void handleCopy(sample);
                  },
                  disabled: actionBusy,
                },
                {
                  id: "delete",
                  label: "Delete",
                  icon: <TrashIcon />,
                  tone: "danger",
                  onClick: () => setDeleteConfirm({ open: true, sample }),
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
    <section className="samples-section" aria-label="Samples">
      <div className="asset-card asset-card--table samples-section__card">
        <div className="asset-card__toolbar samples-section__toolbar">
          <div className="asset-card__filters">
            <TableSearch
              value={search}
              onChange={handleSearchChange}
              placeholder="Ex. Sample type, ID, 1.5"
              ariaLabel="Search samples"
            />
          </div>

          <div className="samples-section__actions">
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
            getRowId={(sample) => sample.id}
            gridTemplateColumns={SAMPLES_GRID}
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

      <EditSamplesModal
        open={modal.open}
        mode={modal.open ? modal.mode : "add"}
        projectId={projectId}
        logId={logId}
        logConfigurationId={logConfigurationId}
        sampleTypes={sampleTypes}
        initialSample={modal.open && modal.mode === "edit" ? modal.sample : null}
        onClose={closeModal}
        onSubmit={handleSubmit}
        onSampleTypesChange={setSampleTypes}
      />

      <ConfirmDialog
        open={deleteConfirm.open}
        title="Delete Sample"
        message={
          deleteConfirm.open
            ? `This will remove the ${deleteConfirm.sample.sampleTypeName} sample at depth ${formatCell(deleteConfirm.sample.depthFrom)}. You can restore it later from Deleted Records.`
            : "This will remove the selected sample."
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
