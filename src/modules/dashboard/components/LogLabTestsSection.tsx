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
import { getUserLabTestTypes } from "../services/configModulesApi";
import {
  copyLogLabTest,
  createLogLabTest,
  deleteLogLabTest,
  listLogLabTests,
  listLogLabTestTypeGroups,
  restoreLogLabTest,
  updateLogLabTest,
} from "../services/logLabTestApi";
import type { LogLabTest, LogLabTestTypeGroup } from "../types/logLabTest";
import {
  LAB_TESTS_MODULE_ID,
  parseLabTestTypeOptions,
  type LabTestResultField,
  type LabTestTypeOption,
} from "../utils/configModules";
import {
  EditLabTestResultsModal,
  type LabTestResultFormPayload,
} from "./EditLabTestResultsModal";

type LogLabTestsSectionProps = Readonly<{
  projectId: number;
  logId: number;
  logConfigurationId: string;
}>;

type ListScope = "active" | "deleted";

type ModalState =
  | { open: false }
  | { open: true; mode: "add" }
  | { open: true; mode: "edit"; test: LogLabTest };

type DeleteConfirmState =
  | { open: false }
  | { open: true; test: LogLabTest };

function formatCell(value: string): string {
  return value.trim() || "—";
}

function resultFieldsForType(option: LabTestTypeOption | null): LabTestResultField[] {
  return (option?.labTestResultFields ?? []).filter((field) => field.name.trim());
}

function asStoredString(value: unknown): string {
  if (value == null) return "";
  return String(value);
}

function fieldValueFromTest(test: LogLabTest, field: LabTestResultField): string {
  const stored = test.resultValues ?? {};
  const byId = asStoredString(stored[field.id]).trim();
  if (byId) return byId;
  const byName = asStoredString(stored[field.name]).trim();
  if (byName) return byName;
  const alias = field.tablogsAlias?.trim() ?? "";
  if (alias) {
    const byAlias = asStoredString(stored[alias]).trim();
    if (byAlias) return byAlias;
  }
  return "";
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

function getTestSortValue(
  test: LogLabTest,
  field: string,
  resultFields: LabTestResultField[]
): string | number {
  switch (field) {
    case "sampleNo":
      return test.sampleNo;
    case "depthFrom": {
      const numeric = Number(test.depthFrom);
      return Number.isFinite(numeric) ? numeric : test.depthFrom;
    }
    case "depthTo": {
      const numeric = Number(test.depthTo);
      return Number.isFinite(numeric) ? numeric : test.depthTo;
    }
    case "results":
      return test.results;
    default: {
      const resultField = resultFields.find((entry) => `field:${entry.id}` === field);
      if (!resultField) return "";
      const value = fieldValueFromTest(test, resultField);
      const numeric = Number(value);
      return Number.isFinite(numeric) && value.trim() !== "" ? numeric : value;
    }
  }
}

export function LogLabTestsSection({
  projectId,
  logId,
  logConfigurationId,
}: LogLabTestsSectionProps) {
  const [tests, setTests] = useState<LogLabTest[]>([]);
  const [typeGroups, setTypeGroups] = useState<LogLabTestTypeGroup[]>([]);
  const [activeTypeId, setActiveTypeId] = useState("");
  const [testTypes, setTestTypes] = useState<LabTestTypeOption[]>([]);
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

  const activeType = useMemo(
    () => typeGroups.find((group) => group.testTypeId === activeTypeId) ?? null,
    [activeTypeId, typeGroups]
  );

  const selectedTypeOption = useMemo(
    () => testTypes.find((entry) => entry.id === activeTypeId) ?? null,
    [activeTypeId, testTypes]
  );

  const resultFields = useMemo(
    () => resultFieldsForType(selectedTypeOption),
    [selectedTypeOption]
  );

  const loadTypeGroups = useCallback(async () => {
    if (!projectId || !logId) return [];
    try {
      const groups = await listLogLabTestTypeGroups(projectId, logId, {
        onlyDeleted: listScope === "deleted" || undefined,
      });
      setTypeGroups(groups);
      return groups;
    } catch (err) {
      showApiError(err, API_ERROR_MESSAGES.LOAD_LAB_TESTS);
      setTypeGroups([]);
      return [];
    }
  }, [projectId, logId, listScope]);

  const loadTests = useCallback(async () => {
    if (!projectId || !logId || !activeTypeId) {
      setTests([]);
      setTotal(0);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const result = await listLogLabTests(projectId, logId, page, pageSize, {
        search: debouncedSearch || undefined,
        onlyDeleted: listScope === "deleted" || undefined,
        testTypeId: activeTypeId,
        sortBy: "id",
        sortOrder: "desc",
      });
      setTests(result.data);
      setTotal(result.total);
    } catch (err) {
      showApiError(err, API_ERROR_MESSAGES.LOAD_LAB_TESTS);
      setTests([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [projectId, logId, page, pageSize, debouncedSearch, listScope, activeTypeId]);

  const loadTestTypes = useCallback(async () => {
    if (!logConfigurationId.trim()) {
      setTestTypes([]);
      return;
    }
    try {
      const { data } = await getUserLabTestTypes(LAB_TESTS_MODULE_ID, logConfigurationId);
      setTestTypes(parseLabTestTypeOptions(data, []));
    } catch (err) {
      setTestTypes([]);
      showApiError(err, API_ERROR_MESSAGES.LOAD_CONFIG_MODULES);
    }
  }, [logConfigurationId]);

  useEffect(() => {
    void loadTestTypes();
  }, [loadTestTypes]);

  useEffect(() => {
    void (async () => {
      const groups = await loadTypeGroups();
      setActiveTypeId((current) => {
        if (current && groups.some((group) => group.testTypeId === current)) return current;
        return groups[0]?.testTypeId ?? "";
      });
    })();
  }, [loadTypeGroups]);

  useEffect(() => {
    void loadTests();
  }, [loadTests]);

  const { sort, toggleSort, sortedData } = useTableSort(
    tests,
    (test, field) => getTestSortValue(test, field, resultFields),
    { field: null, order: "asc" }
  );

  useEffect(() => {
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    if (page > totalPages) setPage(totalPages);
  }, [page, pageSize, total]);

  const emptyMessage = loading
    ? "Loading lab test results…"
    : listScope === "deleted"
      ? debouncedSearch
        ? "No deleted records match your search."
        : "No deleted records for this test type."
      : debouncedSearch
        ? "No lab test results match your search."
        : "No results for this test type yet. Use Add Results to create one.";

  const openAddModal = () => {
    setListScope("active");
    setModal({ open: true, mode: "add" });
  };

  const openEditModal = (test: LogLabTest) => {
    setModal({ open: true, mode: "edit", test });
  };

  const closeModal = () => setModal({ open: false });

  const handleSubmit = async (payloads: LabTestResultFormPayload[]) => {
    if (!payloads.length) return;

    if (modal.open && modal.mode === "edit") {
      await updateLogLabTest(projectId, logId, modal.test.id, payloads[0]);
      showApiSuccess(undefined, "Lab test result updated.");
    } else {
      for (const payload of payloads) {
        await createLogLabTest(projectId, logId, payload);
      }
      showApiSuccess(
        undefined,
        payloads.length === 1
          ? "Lab test result saved."
          : `${payloads.length} lab test results saved.`
      );
      setPage(1);
      setActiveTypeId(payloads[0].testTypeId);
    }

    const savedTypeId = payloads[0]?.testTypeId ?? "";
    const groups = await loadTypeGroups();
    if (savedTypeId) {
      setActiveTypeId(savedTypeId);
    } else if (!groups.some((group) => group.testTypeId === activeTypeId)) {
      setActiveTypeId(groups[0]?.testTypeId ?? "");
    }
    if (!savedTypeId || savedTypeId === activeTypeId) {
      await loadTests();
    }
  };

  const handleCopy = async (test: LogLabTest) => {
    setActionBusy(true);
    try {
      await copyLogLabTest(projectId, logId, test.id);
      setListScope("active");
      setPage(1);
      showApiSuccess(undefined, "Lab test result copied.");
      await loadTypeGroups();
      await loadTests();
    } catch (err) {
      showApiError(err, API_ERROR_MESSAGES.SAVE_LAB_TEST);
    } finally {
      setActionBusy(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirm.open) return;
    setActionBusy(true);
    try {
      await deleteLogLabTest(projectId, logId, deleteConfirm.test.id);
      setDeleteConfirm({ open: false });
      showApiSuccess(undefined, "Lab test result deleted.");
      const groups = await loadTypeGroups();
      if (!groups.some((group) => group.testTypeId === activeTypeId)) {
        setActiveTypeId(groups[0]?.testTypeId ?? "");
      }
      await loadTests();
    } catch (err) {
      showApiError(err, API_ERROR_MESSAGES.DELETE_LAB_TEST);
    } finally {
      setActionBusy(false);
    }
  };

  const handleRestore = async (test: LogLabTest) => {
    setActionBusy(true);
    try {
      await restoreLogLabTest(projectId, logId, test.id);
      showApiSuccess(undefined, "Lab test result restored.");
      await loadTypeGroups();
      await loadTests();
    } catch (err) {
      showApiError(err, API_ERROR_MESSAGES.RESTORE_LAB_TEST);
    } finally {
      setActionBusy(false);
    }
  };

  const columns = useMemo<ColumnDef<LogLabTest>[]>(() => {
    const resultColumns: ColumnDef<LogLabTest>[] =
      resultFields.length > 0
        ? resultFields.map((field) => ({
            id: `field:${field.id}`,
            header: (
              <ColumnHeader
                field={`field:${field.id}`}
                sortField={sort.field}
                sortOrder={sort.order}
                onSort={toggleSort}
              >
                {field.name.trim()}
              </ColumnHeader>
            ),
            cell: (test) => (
              <span className="data-table__text">
                {formatCell(fieldValueFromTest(test, field))}
              </span>
            ),
          }))
        : [
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
              cell: (test) => (
                <span className="data-table__text">{formatCell(test.results)}</span>
              ),
            },
          ];

    return [
      {
        id: "sampleNo",
        header: (
          <ColumnHeader
            field="sampleNo"
            sortField={sort.field}
            sortOrder={sort.order}
            onSort={toggleSort}
          >
            Sample No
          </ColumnHeader>
        ),
        cell: (test) => <span className="data-table__text">{formatCell(test.sampleNo)}</span>,
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
      ...resultColumns,
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
              label={`Actions for ${formatCell(test.sampleNo || test.depthFrom)}`}
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
              label={`Actions for ${formatCell(test.sampleNo || test.depthFrom)}`}
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
    ];
  }, [actionBusy, listScope, resultFields, sort.field, sort.order, toggleSort]);

  const gridTemplateColumns = useMemo(() => {
    const resultCols =
      resultFields.length > 0
        ? resultFields.map(() => "minmax(120px, 1fr)").join(" ")
        : "minmax(160px, 1fr)";
    return `140px 120px 120px ${resultCols} 72px`;
  }, [resultFields.length]);

  return (
    <section className="log-lab-tests-section" aria-label="Lab Tests">
      <div className="asset-card asset-card--table log-lab-tests-section__card">
        <div className="asset-card__toolbar log-lab-tests-section__toolbar">
          <div className="log-lab-tests-section__intro">
            <h3 className="log-lab-tests-section__title">Lab test results</h3>
            <p className="log-lab-tests-section__copy">
              Results are grouped by lab test type after you save them.
            </p>
          </div>
          <div className="log-lab-tests-section__actions">
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
              disabled={!logConfigurationId.trim() || actionBusy}
            >
              Add Results
            </UiButton>
          </div>
        </div>

        {typeGroups.length > 0 ? (
          <div
            className="log-lab-tests-section__tabs ui-scrollbar"
            role="tablist"
            aria-label="Lab test types"
          >
            {typeGroups.map((group) => (
              <button
                key={group.testTypeId}
                type="button"
                role="tab"
                aria-selected={activeTypeId === group.testTypeId}
                className={`log-lab-tests-section__tab${
                  activeTypeId === group.testTypeId ? " is-active" : ""
                }`}
                onClick={() => {
                  setActiveTypeId(group.testTypeId);
                  setPage(1);
                }}
              >
                {group.testTypeName}
              </button>
            ))}
          </div>
        ) : null}

        {typeGroups.length === 0 ? (
          <div className="log-lab-tests-section__empty">
            <p>No lab test results yet.</p>
            <span>Use Add Results, choose a lab test type, and save. A tab for that type will appear here.</span>
          </div>
        ) : (
          <>
            <div className="asset-card__toolbar drilling-entity-list__toolbar log-lab-tests-section__list-toolbar">
              <div className="asset-card__filters">
                <TableSearch
                  value={search}
                  onChange={(value) => {
                    setSearch(value);
                    setPage(1);
                  }}
                  placeholder={`Search ${activeType?.testTypeName ?? "results"}…`}
                  ariaLabel="Search lab test results"
                />
              </div>
            </div>

            <div className="asset-card__table-wrap ui-scrollbar">
              <DataTable
                columns={columns}
                data={sortedData}
                getRowId={(test) => test.id}
                gridTemplateColumns={gridTemplateColumns}
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
          </>
        )}
      </div>

      <EditLabTestResultsModal
        open={modal.open}
        mode={modal.open ? modal.mode : "add"}
        projectId={projectId}
        logId={logId}
        logConfigurationId={logConfigurationId}
        testTypes={testTypes}
        initialTest={modal.open && modal.mode === "edit" ? modal.test : null}
        onClose={closeModal}
        onSubmit={handleSubmit}
        onTestTypesChange={setTestTypes}
      />

      <ConfirmDialog
        open={deleteConfirm.open}
        title="Delete Lab Test Result"
        message={
          deleteConfirm.open
            ? `This will remove the ${deleteConfirm.test.testTypeName} result at depth ${formatCell(deleteConfirm.test.depthFrom)}. You can restore it later from Deleted Records.`
            : "This will remove the selected lab test result."
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
