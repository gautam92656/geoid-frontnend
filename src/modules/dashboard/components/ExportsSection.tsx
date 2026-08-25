"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import toast from "react-hot-toast";
import {
  Badge,
  Checkbox,
  DataTable,
  DownloadIcon,
  PageLoader,
  Select,
  SortableColumnHeader,
  TablePagination,
  TableSearch,
  UiButton,
  type ColumnDef,
  type SelectOption,
} from "@/shared/components/ui";
import {
  DEFAULT_TABLE_PAGE_SIZE,
  TABLE_PAGE_SIZE_OPTIONS,
} from "@/shared/constants/pagination";
import { API_ERROR_MESSAGES } from "@/shared/constants/apiMessages";
import { useAuth } from "@/modules/auth/hooks/useAuth";
import { useDebouncedValue } from "@/shared/hooks/useDebouncedValue";
import { useTableSort } from "@/shared/hooks/useTableSort";
import { formatDisplayDate } from "@/shared/utils/formatDate";
import { showApiError } from "@/shared/utils/apiToast";
import { LOG_CREATION_STATUSES, LOG_WORKFLOW_STATUSES } from "../data/logOptions";
import { getLogConfiguration } from "../services/logConfigurationApi";
import { listProjectLogs } from "../services/logApi";
import type { Log } from "../types/log";
import type { LogTemplateRecord } from "../types/logTemplate";
import type { Project } from "../types/project";
import { projectLogPath } from "../utils/projectPaths";
import {
  buildLogReportExportJobs,
  createLogReportExportConfigCache,
  loadLogReportExportCatalogs,
  resolveLogReportModuleConfig,
  resolveTemplateDisplayName,
  type LogReportExportCatalogs,
  type LogReportExportSheetJob,
} from "../utils/logReportExportData";
import {
  appendLogReportSheetToPdf,
  downloadLogReportPdf,
  type LogReportPdfDoc,
} from "../utils/logReportPdfExport";
import { LogReportExportCapture } from "./LogReportExportCapture";

const EXPORT_GRID =
  "40px minmax(130px, 1.1fr) minmax(140px, 1fr) minmax(160px, 1.2fr) minmax(160px, 1.2fr) minmax(110px, 0.8fr)";

const CAPTURE_TIMEOUT_MS = 60000;

const STATUS_FILTER_OPTIONS: SelectOption[] = [
  { value: "all", label: "All statuses" },
  ...Array.from(new Set<string>([...LOG_WORKFLOW_STATUSES, ...LOG_CREATION_STATUSES])).map(
    (status) => ({ value: status, label: status })
  ),
];

type ExportLogRow = Log & {
  borelogTemplateName: string;
  corelogTemplateName: string;
  dateLogged: string;
};

type ExportsSectionProps = Readonly<{
  project: Project;
}>;

function formatLogDate(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return "—";
  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) return "—";
  return formatDisplayDate(trimmed);
}

function templateNameForType(
  templates: LogTemplateRecord[],
  preferredId?: string | null
): string {
  return resolveTemplateDisplayName(templates, preferredId);
}

function getExportLogSortValue(row: ExportLogRow, field: string): string | number {
  switch (field) {
    case "logNumber":
      return row.logNumber;
    case "dateLogged":
      return row.dateLogged;
    case "borelogTemplate":
      return row.borelogTemplateName;
    case "corelogTemplate":
      return row.corelogTemplateName;
    case "logStatus":
      return row.logStatus;
    default:
      return "";
  }
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

export function ExportsSection({ project }: ExportsSectionProps) {
  const { user } = useAuth();
  const [logs, setLogs] = useState<Log[]>([]);
  const [catalogs, setCatalogs] = useState<LogReportExportCatalogs | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search.trim());
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_TABLE_PAGE_SIZE);
  const [total, setTotal] = useState(0);
  const [selectedLogs, setSelectedLogs] = useState<Map<number, Log>>(new Map());
  const [exporting, setExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState("");
  const [captureJob, setCaptureJob] = useState<LogReportExportSheetJob | null>(null);
  const captureWaiterRef = useRef<((sheet: HTMLElement) => void) | null>(null);
  const hasMounted = useRef(false);

  const loadLogs = useCallback(
    async (nextPage: number, nextPageSize: number, nextSearch = debouncedSearch) => {
      setLoading(true);
      try {
        const result = await listProjectLogs(project.id, nextPage, nextPageSize, {
          search: nextSearch || undefined,
          status: statusFilter !== "all" ? statusFilter : undefined,
        });
        setLogs(result.data);
        setTotal(result.total);
        setPage(result.page);
        setPageSize(result.pageSize);
      } catch (err) {
        showApiError(err, API_ERROR_MESSAGES.LOAD_PROJECT_LOGS);
        setLogs([]);
        setTotal(0);
      } finally {
        setLoading(false);
      }
    },
    [debouncedSearch, project.id, statusFilter]
  );

  useEffect(() => {
    if (!hasMounted.current) {
      hasMounted.current = true;
      void loadLogs(1, DEFAULT_TABLE_PAGE_SIZE, "");
      return;
    }
    setSelectedLogs(new Map());
    void loadLogs(1, pageSize);
  }, [debouncedSearch, loadLogs, statusFilter]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const next = await loadLogReportExportCatalogs([]);
        if (!cancelled) setCatalogs(next);
      } catch (err) {
        if (!cancelled) {
          showApiError(err, API_ERROR_MESSAGES.LOAD_LOG_REPORT_TEMPLATES);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!catalogs) return;

    const missingIds = [
      ...new Set(logs.map((log) => log.logConfigId.trim()).filter(Boolean)),
    ].filter((id) => !catalogs.configurations.has(id));
    if (missingIds.length === 0) return;

    let cancelled = false;
    void (async () => {
      const extras = await Promise.all(
        missingIds.map((id) => getLogConfiguration(id).catch(() => null))
      );
      if (cancelled) return;
      setCatalogs((current) => {
        if (!current) return current;
        const next = new Map(current.configurations);
        for (const config of extras) {
          if (config) next.set(config.id, config);
        }
        return { ...current, configurations: next };
      });
    })();

    return () => {
      cancelled = true;
    };
  }, [catalogs, logs]);

  const rows: ExportLogRow[] = useMemo(
    () =>
      logs.map((log) => {
        const report = resolveLogReportModuleConfig(catalogs?.configurations.get(log.logConfigId));
        return {
          ...log,
          dateLogged: log.drillingDate || log.createdAt,
          borelogTemplateName: templateNameForType(
            catalogs?.borelogTemplates ?? [],
            report?.borelogTemplate
          ),
          corelogTemplateName: templateNameForType(
            catalogs?.corelogTemplates ?? [],
            report?.corelogTemplate
          ),
        };
      }),
    [catalogs, logs]
  );

  const { sort, toggleSort, sortedData } = useTableSort(rows, getExportLogSortValue, {
    field: "logNumber",
    order: "asc",
  });

  const allSelected =
    sortedData.length > 0 && sortedData.every((row) => selectedLogs.has(row.id));
  const someSelected =
    sortedData.some((row) => selectedLogs.has(row.id)) && !allSelected;

  const toggleAll = useCallback(() => {
    setSelectedLogs((current) => {
      const next = new Map(current);
      if (sortedData.length > 0 && sortedData.every((row) => next.has(row.id))) {
        for (const row of sortedData) next.delete(row.id);
        return next;
      }
      for (const row of sortedData) next.set(row.id, row);
      return next;
    });
  }, [sortedData]);

  const toggleOne = useCallback((log: Log) => {
    setSelectedLogs((current) => {
      const next = new Map(current);
      if (next.has(log.id)) next.delete(log.id);
      else next.set(log.id, log);
      return next;
    });
  }, []);

  const waitForCapture = useCallback((job: LogReportExportSheetJob) => {
    return new Promise<HTMLElement>((resolve, reject) => {
      const timeout = window.setTimeout(() => {
        captureWaiterRef.current = null;
        reject(new Error("Timed out generating the log report."));
      }, CAPTURE_TIMEOUT_MS);
      captureWaiterRef.current = (sheet) => {
        window.clearTimeout(timeout);
        resolve(sheet);
      };
      setCaptureJob(job);
    });
  }, []);

  const handleCaptureReady = useCallback((sheet: HTMLElement) => {
    const waiter = captureWaiterRef.current;
    captureWaiterRef.current = null;
    waiter?.(sheet);
  }, []);

  const handleExport = useCallback(async () => {
    const selected = [...selectedLogs.values()];
    if (selected.length === 0 || exporting) return;

    setExporting(true);
    setExportProgress("Preparing templates…");
    const toastId = toast.loading("Preparing log reports…");

    try {
      const exportCatalogs = await loadLogReportExportCatalogs(selected);

      const configCache = createLogReportExportConfigCache();
      let pdf: LogReportPdfDoc | null = null;
      let pageSheets = 0;

      for (const [index, log] of selected.entries()) {
        setExportProgress(`Loading ${log.logNumber} (${index + 1} of ${selected.length})…`);
        toast.loading(`Exporting ${log.logNumber} (${index + 1} of ${selected.length})…`, {
          id: toastId,
        });

        const jobs = await buildLogReportExportJobs({
          project,
          log,
          catalogs: exportCatalogs,
          companyName: user?.companyName,
          companyLogoUrl: user?.companyLogoUrl,
          companyEmail: user?.email,
          phoneCode: user?.phoneCode,
          phoneNumber: user?.phoneNumber,
          configCache,
        });

        for (const job of jobs) {
          setExportProgress(
            `Rendering ${job.logNumber} ${job.previewType === "corelog" ? "corelog" : "borelog"}…`
          );
          const sheet = await waitForCapture(job);
          pdf = await appendLogReportSheetToPdf(pdf, sheet, {
            pageWidthPx: job.pageWidthPx,
            pageHeightPx: job.pageHeightPx,
          });
          if (pdf) pageSheets += 1;
        }
      }

      setCaptureJob(null);

      if (!pdf || pageSheets === 0) {
        toast.error("No log reports could be generated for the selected logs.", { id: toastId });
        return;
      }

      const fileName =
        selected.length === 1
          ? selected[0].logNumber || "Log"
          : `${project.projectNo || project.name || "Project"}_logs`;
      downloadLogReportPdf(pdf, fileName);
      toast.success(
        selected.length === 1
          ? "PDF downloaded."
          : `${selected.length} log reports downloaded as one PDF.`,
        { id: toastId }
      );
    } catch (err) {
      console.error("Failed to export selected log reports", err);
      toast.error("Failed to export PDF. Please try again.", { id: toastId });
    } finally {
      captureWaiterRef.current = null;
      setCaptureJob(null);
      setExporting(false);
      setExportProgress("");
    }
  }, [
    exporting,
    project,
    selectedLogs,
    user?.companyLogoUrl,
    user?.companyName,
    user?.email,
    user?.phoneCode,
    user?.phoneNumber,
    waitForCapture,
  ]);

  const columns: ColumnDef<ExportLogRow>[] = useMemo(
    () => [
      {
        id: "select",
        header: (
          <Checkbox
            checked={allSelected}
            indeterminate={someSelected}
            onChange={toggleAll}
            aria-label="Select all logs on this page"
            disabled={exporting}
          />
        ),
        cell: (log) => (
          <Checkbox
            checked={selectedLogs.has(log.id)}
            onChange={() => toggleOne(log)}
            aria-label={`Select ${log.logNumber}`}
            disabled={exporting}
          />
        ),
        className: "data-table__col--checkbox",
      },
      {
        id: "logNumber",
        header: (
          <ColumnHeader
            field="logNumber"
            sortField={sort.field}
            sortOrder={sort.order}
            onSort={toggleSort}
          >
            Log name
          </ColumnHeader>
        ),
        cell: (log) => (
          <Link href={projectLogPath(project.id, log.id.toString())} className="data-table__link">
            {log.logNumber}
          </Link>
        ),
      },
      {
        id: "dateLogged",
        header: (
          <ColumnHeader
            field="dateLogged"
            sortField={sort.field}
            sortOrder={sort.order}
            onSort={toggleSort}
          >
            Date logged
          </ColumnHeader>
        ),
        cell: (log) => (
          <span className="data-table__text data-table__text--muted">
            {formatLogDate(log.dateLogged)}
          </span>
        ),
      },
      {
        id: "borelogTemplate",
        header: (
          <ColumnHeader
            field="borelogTemplate"
            sortField={sort.field}
            sortOrder={sort.order}
            onSort={toggleSort}
          >
            Borelog template
          </ColumnHeader>
        ),
        cell: (log) => (
          <span className="data-table__text">{log.borelogTemplateName}</span>
        ),
      },
      {
        id: "corelogTemplate",
        header: (
          <ColumnHeader
            field="corelogTemplate"
            sortField={sort.field}
            sortOrder={sort.order}
            onSort={toggleSort}
          >
            Corelog template
          </ColumnHeader>
        ),
        cell: (log) => (
          <span className="data-table__text">{log.corelogTemplateName}</span>
        ),
      },
      {
        id: "logStatus",
        header: (
          <ColumnHeader
            field="logStatus"
            sortField={sort.field}
            sortOrder={sort.order}
            onSort={toggleSort}
          >
            Status
          </ColumnHeader>
        ),
        cell: (log) => <Badge variant="neutral">{log.logStatus || "—"}</Badge>,
      },
    ],
    [
      allSelected,
      exporting,
      project.id,
      selectedLogs,
      someSelected,
      sort.field,
      sort.order,
      toggleAll,
      toggleOne,
      toggleSort,
    ]
  );

  const emptyMessage = (() => {
    if (loading) return "Loading logs…";
    if (debouncedSearch || statusFilter !== "all") return "No logs match your filters.";
    return "No logs yet.";
  })();

  const selectedCount = selectedLogs.size;

  return (
    <div className="exports-section">
      <div className="exports-section__header">
        <div className="exports-section__copy">
          <h2 className="exports-section__title">Exports</h2>
          <p className="exports-section__subtitle">
            Select logs and download each one as the report type it was saved with
            (borelog or corelog) in a single PDF.
          </p>
        </div>
      </div>

      <div className="asset-card asset-card--table exports-section__card">
        <div className="asset-card__toolbar exports-section__toolbar">
          <div className="asset-card__filters exports-section__filters">
            <TableSearch
              value={search}
              onChange={setSearch}
              placeholder="Search logs…"
              ariaLabel="Search logs"
              disabled={loading || exporting}
            />
            <div className="asset-card__filter-select">
              <Select
                value={statusFilter}
                onChange={setStatusFilter}
                options={STATUS_FILTER_OPTIONS}
                floatingMenu
                disabled={loading || exporting}
              />
            </div>
          </div>

          <div className="exports-section__actions">
            {selectedCount > 0 ? (
              <span className="asset-card__selection">{selectedCount} selected</span>
            ) : null}
            <UiButton
              type="button"
              variant="primary"
              size="sm"
              onClick={() => void handleExport()}
              disabled={selectedCount === 0 || exporting}
            >
              <DownloadIcon />
              {exporting ? "Exporting…" : "Export"}
            </UiButton>
          </div>
        </div>

        <div className="asset-card__table-wrap ui-scrollbar">
          {loading ? (
            <PageLoader label="Loading logs…" variant="section" />
          ) : (
            <DataTable
              columns={columns}
              data={sortedData}
              getRowId={(log) => String(log.id)}
              gridTemplateColumns={EXPORT_GRID}
              emptyMessage={emptyMessage}
            />
          )}
        </div>

        <TablePagination
          page={page}
          pageSize={pageSize}
          total={total}
          pageSizeOptions={TABLE_PAGE_SIZE_OPTIONS}
          loading={loading || exporting}
          onPageChange={(nextPage) => void loadLogs(nextPage, pageSize)}
          onPageSizeChange={(nextPageSize) => {
            setPageSize(nextPageSize);
            setPage(1);
            void loadLogs(1, nextPageSize);
          }}
        />
      </div>

      {exporting ? (
        <div className="exports-section__overlay" role="status" aria-live="polite">
          <div className="exports-section__overlay-card">
            <PageLoader label={exportProgress || "Generating PDF…"} variant="section" />
            <p className="exports-section__overlay-copy">
              Generating a combined PDF for the selected logs. Keep this tab open until the
              download starts.
            </p>
          </div>
        </div>
      ) : null}

      <LogReportExportCapture
        project={project}
        job={captureJob}
        onReady={handleCaptureReady}
      />
    </div>
  );
}
