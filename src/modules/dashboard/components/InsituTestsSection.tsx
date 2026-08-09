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
  copyLogInsituTest,
  createLogInsituTest,
  deleteLogInsituTest,
  listLogInsituTests,
  restoreLogInsituTest,
  updateLogInsituTest,
} from "../services/logInsituTestApi";
import { getUserInsituTestTypes } from "../services/configModulesApi";
import type { LogInsituTest } from "../types/logInsituTest";
import {
  parseInsituTestTypeOptions,
  type InsituTestTypeOption,
} from "../utils/configModules/insituTestType";
import { INSITU_TESTS_USA_MODULE_ID } from "../utils/configModules/modules/insitu-tests-usa";
import {
  EditInsituTestModal,
  type InsituTestFormSubmitPayload,
} from "./EditInsituTestModal";

type InsituTestsSectionProps = Readonly<{
  projectId: number;
  logId: number;
  logConfigurationId: string;
}>;

type ListScope = "active" | "deleted";

type ModalState =
  | { open: false }
  | { open: true; mode: "add" }
  | { open: true; mode: "edit"; test: LogInsituTest };

type DeleteConfirmState =
  | { open: false }
  | { open: true; test: LogInsituTest };

const INSITU_GRID = "120px 120px 140px minmax(180px, 1fr) minmax(160px, 1fr) 72px";

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

function getTestSortValue(test: LogInsituTest, field: string): string | number {
  switch (field) {
    case "depthFrom": {
      const numeric = Number(test.depthFrom);
      return Number.isFinite(numeric) ? numeric : test.depthFrom;
    }
    case "depthTo": {
      const numeric = Number(test.depthTo);
      return Number.isFinite(numeric) ? numeric : test.depthTo;
    }
    case "testTypeName":
      return test.testTypeName;
    case "results":
      return test.results;
    case "comments":
      return test.comments;
    default:
      return "";
  }
}

export function InsituTestsSection({
  projectId,
  logId,
  logConfigurationId,
}: InsituTestsSectionProps) {
  const [tests, setTests] = useState<LogInsituTest[]>([]);
  const [testTypes, setTestTypes] = useState<InsituTestTypeOption[]>([]);
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

  const loadTests = useCallback(async () => {
    if (!projectId || !logId) return;
    setLoading(true);
    try {
      const onlyDeleted = listScope === "deleted";
      const result = await listLogInsituTests(projectId, logId, page, pageSize, {
        search: debouncedSearch || undefined,
        onlyDeleted: onlyDeleted || undefined,
        sortBy: "id",
        sortOrder: "desc",
      });
      setTests(result.data);
      setTotal(result.total);
    } catch (err) {
      showApiError(err, API_ERROR_MESSAGES.LOAD_INSITU_TESTS);
      setTests([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [projectId, logId, page, pageSize, debouncedSearch, listScope]);

  const loadTestTypes = useCallback(async () => {
    if (!logConfigurationId.trim()) {
      setTestTypes([]);
      return;
    }
    try {
      const { data } = await getUserInsituTestTypes(
        INSITU_TESTS_USA_MODULE_ID,
        logConfigurationId
      );
      setTestTypes(parseInsituTestTypeOptions(data, []));
    } catch {
      setTestTypes([]);
    }
  }, [logConfigurationId]);

  useEffect(() => {
    void loadTests();
  }, [loadTests]);

  useEffect(() => {
    void loadTestTypes();
  }, [loadTestTypes]);

  const { sort, toggleSort, sortedData } = useTableSort(tests, getTestSortValue, {
    field: null,
    order: "asc",
  });

  useEffect(() => {
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    if (page > totalPages) setPage(totalPages);
  }, [page, pageSize, total]);

  const emptyMessage = loading
    ? "Loading insitu tests…"
    : listScope === "deleted"
      ? debouncedSearch
        ? "No deleted records match your search."
        : "No deleted records."
      : debouncedSearch
        ? "No insitu tests match your search."
        : "No insitu tests yet. Use Add New to create one.";

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

  const openEditModal = (test: LogInsituTest) => {
    setModal({ open: true, mode: "edit", test });
  };

  const closeModal = () => setModal({ open: false });

  const handleSubmit = async (payloads: InsituTestFormSubmitPayload[]) => {
    if (!payloads.length) return;
    if (modal.open && modal.mode === "edit") {
      await updateLogInsituTest(projectId, logId, modal.test.id, payloads[0]);
    } else {
      for (const payload of payloads) {
        await createLogInsituTest(projectId, logId, payload);
      }
      setPage(1);
    }
    await loadTests();
  };

  const handleCopy = async (test: LogInsituTest) => {
    setActionBusy(true);
    try {
      await copyLogInsituTest(projectId, logId, test.id);
      setListScope("active");
      setPage(1);
      showApiSuccess(undefined, "Insitu test copied.");
      await loadTests();
    } catch (err) {
      showApiError(err, API_ERROR_MESSAGES.SAVE_INSITU_TEST);
    } finally {
      setActionBusy(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirm.open) return;
    setActionBusy(true);
    try {
      await deleteLogInsituTest(projectId, logId, deleteConfirm.test.id);
      setDeleteConfirm({ open: false });
      showApiSuccess(undefined, "Insitu test deleted.");
      await loadTests();
    } catch (err) {
      showApiError(err, API_ERROR_MESSAGES.DELETE_INSITU_TEST);
    } finally {
      setActionBusy(false);
    }
  };

  const handleRestore = async (test: LogInsituTest) => {
    setActionBusy(true);
    try {
      await restoreLogInsituTest(projectId, logId, test.id);
      showApiSuccess(undefined, "Insitu test restored.");
      await loadTests();
    } catch (err) {
      showApiError(err, API_ERROR_MESSAGES.RESTORE_INSITU_TEST);
    } finally {
      setActionBusy(false);
    }
  };

  const columns = useMemo<ColumnDef<LogInsituTest>[]>(
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
        cell: (test) => <span className="data-table__text">{formatCell(test.depthFrom)}</span>,
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
        cell: (test) => <span className="data-table__text">{formatCell(test.depthTo)}</span>,
      },
      {
        id: "testTypeName",
        header: (
          <ColumnHeader
            field="testTypeName"
            sortField={sort.field}
            sortOrder={sort.order}
            onSort={toggleSort}
          >
            Test Type
          </ColumnHeader>
        ),
        cell: (test) => (
          <span className="data-table__text">{formatCell(test.testTypeName)}</span>
        ),
      },
      {
        id: "results",
        header: (
          <ColumnHeader
            field="results"
            sortField={sort.field}
            sortOrder={sort.order}
            onSort={toggleSort}
          >
            Results
          </ColumnHeader>
        ),
        cell: (test) => <span className="data-table__text">{formatCell(test.results)}</span>,
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
        cell: (test) => <span className="data-table__text">{formatCell(test.comments)}</span>,
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
        cell: (test) =>
          listScope === "deleted" ? (
            <TableRowActionsMenu
              label={`Actions for ${formatCell(test.testTypeName)} at ${formatCell(test.depthFrom)}`}
              actions={[
                {
                  id: "restore",
                  label: "Restore",
                  icon: <UnarchiveIcon />,
                  onClick: () => {
                    void handleRestore(test);
                  },
                  disabled: actionBusy,
                },
              ]}
            />
          ) : (
            <TableRowActionsMenu
              label={`Actions for ${formatCell(test.testTypeName)} at ${formatCell(test.depthFrom)}`}
              actions={[
                {
                  id: "edit",
                  label: "Edit",
                  icon: <EditIcon />,
                  onClick: () => openEditModal(test),
                  disabled: actionBusy,
                },
                {
                  id: "copy",
                  label: "Copy",
                  icon: <CopyIcon />,
                  onClick: () => {
                    void handleCopy(test);
                  },
                  disabled: actionBusy,
                },
                {
                  id: "delete",
                  label: "Delete",
                  icon: <TrashIcon />,
                  tone: "danger",
                  onClick: () => setDeleteConfirm({ open: true, test }),
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
    <section className="insitu-tests-section" aria-label="Insitu Tests">
      <div className="asset-card asset-card--table insitu-tests-section__card">
        <div className="asset-card__toolbar insitu-tests-section__toolbar">
          <div className="asset-card__filters">
            <TableSearch
              value={search}
              onChange={handleSearchChange}
              placeholder="Ex. SPT, 1.5, N=12"
              ariaLabel="Search insitu tests"
            />
          </div>

          <div className="insitu-tests-section__actions">
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
            getRowId={(test) => test.id}
            gridTemplateColumns={INSITU_GRID}
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

      <EditInsituTestModal
        open={modal.open}
        mode={modal.open ? modal.mode : "add"}
        logConfigurationId={logConfigurationId}
        testTypes={testTypes}
        initialTest={modal.open && modal.mode === "edit" ? modal.test : null}
        onClose={closeModal}
        onSubmit={handleSubmit}
        onTestTypesChange={setTestTypes}
      />

      <ConfirmDialog
        open={deleteConfirm.open}
        title="Delete Insitu Test"
        message={
          deleteConfirm.open
            ? `This will remove the ${deleteConfirm.test.testTypeName} test at depth ${formatCell(deleteConfirm.test.depthFrom)}. You can restore it later from Deleted Records.`
            : "This will remove the selected insitu test."
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
