"use client";

import type { CSSProperties, ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  ConfirmDialog,
  CopyIcon,
  DataTable,
  SortableColumnHeader,
  TablePagination,
  TableRowActionsMenu,
  TableSearch,
  TrashIcon,
  UiButton,
  ViewIcon,
  type ColumnDef,
} from "@/shared/components/ui";
import { DEFAULT_TABLE_PAGE_SIZE, MAX_TABLE_PAGE_SIZE, TABLE_PAGE_SIZE_OPTIONS } from "@/shared/constants/pagination";
import { API_ERROR_MESSAGES, API_MESSAGES } from "@/shared/constants/apiMessages";
import { useDebouncedValue } from "@/shared/hooks/useDebouncedValue";
import { useTableSort } from "@/shared/hooks/useTableSort";
import { showApiError, showApiSuccess } from "@/shared/utils/apiToast";
import { LOG_LIST_TABS, LOG_WORKFLOW_STATUSES } from "../data/logOptions";
import type { Log } from "../types/log";
import type { Project } from "../types/project";
import type { ProjectStatusHistoryEntry } from "../types/projectStatusHistory";
import { projectLogPath } from "../utils/projectPaths";
import { logStatusToApiValue } from "../utils/logFormUtils";
import {
  createCopyLogPayload,
  createLog,
  deleteLog,
  listProjectLogs,
  updateLog,
} from "../services/logApi";
import { listProjectStatusHistory } from "../services/projectStatusHistoryApi";
import { AddLogModal } from "./AddLogModal";
import { UpdateProjectStatusModal } from "./UpdateProjectStatusModal";

const LOG_GRID =
  "minmax(120px, 1fr) minmax(100px, 0.9fr) minmax(100px, 0.8fr) minmax(160px, 1fr) 48px";

type LogTabId = (typeof LOG_LIST_TABS)[number]["id"];

type DeleteConfirmState = { open: false } | { open: true; log: Log };

function getLogSortValue(log: Log, field: string): string | number {
  switch (field) {
    case "logNumber":
      return log.logNumber;
    case "logType":
      return log.logTypeLabel;
    case "endDepth":
      return log.endDepth;
    case "logStatus":
      return log.logStatus;
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
function ChevronDownIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function LogStatusDropdown({
  status,
  onChange,
  disabled = false,
}: Readonly<{
  status: string;
  onChange: (status: string) => void;
  disabled?: boolean;
}>) {
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [menuStyle, setMenuStyle] = useState<CSSProperties>({});

  useEffect(() => {
    setMounted(true);
  }, []);

  const updateMenuPosition = useCallback(() => {
    if (!triggerRef.current) return;

    const rect = triggerRef.current.getBoundingClientRect();
    const menuHeight = menuRef.current?.offsetHeight ?? 200;
    const spaceBelow = window.innerHeight - rect.bottom;
    const openAbove = spaceBelow < menuHeight + 4 && rect.top > spaceBelow;

    let top = openAbove ? rect.top - menuHeight - 4 : rect.bottom + 4;
    const left = rect.left;

    top = Math.max(8, Math.min(top, window.innerHeight - menuHeight - 8));

    setMenuStyle({
      position: "fixed",
      top,
      left,
      minWidth: rect.width,
      zIndex: 1400,
    });
  }, []);

  useEffect(() => {
    if (!open) return;

    updateMenuPosition();

    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (rootRef.current?.contains(target) || menuRef.current?.contains(target)) return;
      setOpen(false);
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    window.addEventListener("resize", updateMenuPosition);
    window.addEventListener("scroll", updateMenuPosition, true);
    document.addEventListener("mousedown", handlePointerDown);
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("resize", updateMenuPosition);
      window.removeEventListener("scroll", updateMenuPosition, true);
      document.removeEventListener("mousedown", handlePointerDown);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, updateMenuPosition]);

  const menu = open ? (
    <div
      ref={menuRef}
      className="project-overview-logs__status-menu"
      style={menuStyle}
      role="menu"
      aria-label="Log status"
    >
      {LOG_WORKFLOW_STATUSES.map((option) => (
        <button
          key={option}
          type="button"
          role="menuitemradio"
          aria-checked={option === status}
          className={`project-overview-logs__status-option${option === status ? " is-selected" : ""}`}
          onClick={() => {
            onChange(option);
            setOpen(false);
          }}
        >
          {option}
        </button>
      ))}
    </div>
  ) : null;

  return (
    <div ref={rootRef} className={`project-overview-logs__status-dropdown${open ? " is-open" : ""}`}>
      <button
        ref={triggerRef}
        type="button"
        className="project-overview-logs__status"
        aria-haspopup="menu"
        aria-expanded={open}
        disabled={disabled}
        onClick={() => setOpen((current) => !current)}
      >
        {status}
        <ChevronDownIcon />
      </button>
      {mounted && menu ? createPortal(menu, document.body) : null}
    </div>
  );
}

function ProjectLogsPanel({ project }: Readonly<{ project: Project }>) {
  const router = useRouter();
  const [logs, setLogs] = useState<Log[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(true);
  const [activeLogTab, setActiveLogTab] = useState<LogTabId>("logs");
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search.trim());
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(DEFAULT_TABLE_PAGE_SIZE);
  const [total, setTotal] = useState(0);
  const [isAddLogOpen, setIsAddLogOpen] = useState(false);
  const [copyingLogId, setCopyingLogId] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<DeleteConfirmState>({ open: false });
  const [updatingStatusLogId, setUpdatingStatusLogId] = useState<number | null>(null);
  const hasMounted = useRef(false);
  const { sort, toggleSort, sortedData } = useTableSort(logs, getLogSortValue);

  const loadLogs = useCallback(
    async (nextPage: number, nextPageSize: number, nextSearch = debouncedSearch) => {
      setLoadingLogs(true);
      try {
        if (activeLogTab === "deleted") {
          const result = await listProjectLogs(project.id, 1, MAX_TABLE_PAGE_SIZE, {
            search: nextSearch || undefined,
            includeDeleted: true,
          });
          const deletedLogs = result.data.filter((log) => log.deletedAt);
          setLogs(deletedLogs);
          setTotal(deletedLogs.length);
          setPage(1);
          setPageSize(nextPageSize);
          return;
        }

        const result = await listProjectLogs(project.id, nextPage, nextPageSize, {
          search: nextSearch || undefined,
        });
        setLogs(result.data);
        setTotal(result.total);
        setPage(result.page);
        setPageSize(result.pageSize);
      } catch (err) {
        showApiError(err, API_ERROR_MESSAGES.LOAD_PROJECT_LOGS);
      } finally {
        setLoadingLogs(false);
      }
    },
    [activeLogTab, debouncedSearch, project.id]
  );

  useEffect(() => {
    if (!hasMounted.current) {
      hasMounted.current = true;
      void loadLogs(1, DEFAULT_TABLE_PAGE_SIZE, "");
      return;
    }

    void loadLogs(1, pageSize);
  }, [activeLogTab, debouncedSearch, loadLogs]);

  const handleAddLog = useCallback(() => {
    void loadLogs(1, pageSize);
  }, [loadLogs, pageSize]);

  const displayData = useMemo(() => {
    if (activeLogTab !== "deleted") return sortedData;
    const start = (page - 1) * pageSize;
    return sortedData.slice(start, start + pageSize);
  }, [activeLogTab, page, pageSize, sortedData]);

  const handleStatusChange = useCallback(
    async (logId: number, status: string) => {
      const existing = logs.find((log) => log.id === logId);
      if (!existing || existing.logStatus === status) return;

      setUpdatingStatusLogId(logId);
      try {
        const { data, message } = await updateLog(project.id, logId, {
          logStatus: logStatusToApiValue(status),
        });
        setLogs((current) => current.map((log) => (log.id === logId ? data : log)));
        showApiSuccess(message, API_MESSAGES.LOG_UPDATED);
      } catch (err) {
        showApiError(err, API_ERROR_MESSAGES.UPDATE_LOG);
      } finally {
        setUpdatingStatusLogId(null);
      }
    },
    [logs, project.id]
  );

  const handleViewLog = useCallback(
    (log: Log) => {
      router.push(projectLogPath(project.id, log.id.toString()));
    },
    [project.projectNo, router]
  );

  const handleCopyLog = useCallback(
    async (log: Log) => {
      if (copyingLogId != null) return;

      setCopyingLogId(log.id);
      try {
        const existingNumbers = logs.map((item) => item.logNumber);
        const { data, message } = await createLog(
          project.id,
          createCopyLogPayload(log, existingNumbers)
        );
        if (activeLogTab === "logs") {
          await loadLogs(page, pageSize);
        }
        showApiSuccess(message, API_MESSAGES.LOG_ADDED);
        if (activeLogTab === "logs") return;
        setLogs((current) => [data, ...current]);
        setTotal((current) => current + 1);
      } catch (err) {
        showApiError(err, API_ERROR_MESSAGES.ADD_LOG);
      } finally {
        setCopyingLogId(null);
      }
    },
    [activeLogTab, copyingLogId, loadLogs, logs, page, pageSize, project.id]
  );

  const requestDeleteLog = useCallback((log: Log) => {
    setDeleteConfirm({ open: true, log });
  }, []);

  const handleConfirmDelete = useCallback(async () => {
    if (!deleteConfirm.open) return;

    setDeleting(true);
    try {
      const { message } = await deleteLog(project.id, deleteConfirm.log.id);
      setDeleteConfirm({ open: false });
      await loadLogs(page, pageSize);
      showApiSuccess(message, API_MESSAGES.LOG_DELETED);
    } catch (err) {
      showApiError(err, API_ERROR_MESSAGES.DELETE_LOG);
    } finally {
      setDeleting(false);
    }
  }, [deleteConfirm, loadLogs, page, pageSize, project.id]);

  const handlePageChange = useCallback(
    (nextPage: number) => {
      if (activeLogTab === "deleted") {
        setPage(nextPage);
        return;
      }
      void loadLogs(nextPage, pageSize);
    },
    [activeLogTab, loadLogs, pageSize]
  );

  const handlePageSizeChange = useCallback(
    (nextPageSize: number) => {
      setPageSize(nextPageSize);
      setPage(1);
      if (activeLogTab === "deleted") return;
      void loadLogs(1, nextPageSize);
    },
    [activeLogTab, loadLogs]
  );

  const emptyMessage = useMemo(() => {
    if (loadingLogs) return "Loading logs…";
    if (debouncedSearch) return "No logs match your search.";
    return activeLogTab === "deleted" ? "No deleted logs." : "No logs yet.";
  }, [activeLogTab, debouncedSearch, loadingLogs]);

  const columns: ColumnDef<Log>[] = useMemo(
    () => [
      {
        id: "logNumber",
        header: (
          <ColumnHeader
            field="logNumber"
            sortField={sort.field}
            sortOrder={sort.order}
            onSort={toggleSort}
          >
            Log
          </ColumnHeader>
        ),
        cell: (log) => (
          <Link href={projectLogPath(project.id, log.id.toString())} className="data-table__link">
            {log.logNumber}
          </Link>
        ),
      },
      {
        id: "logType",
        header: (
          <ColumnHeader
            field="logType"
            sortField={sort.field}
            sortOrder={sort.order}
            onSort={toggleSort}
          >
            Type
          </ColumnHeader>
        ),
        cell: (log) => (
          <span className="data-table__text data-table__text--muted">{log.logTypeLabel}</span>
        ),
      },
      {
        id: "endDepth",
        header: (
          <ColumnHeader
            field="endDepth"
            sortField={sort.field}
            sortOrder={sort.order}
            onSort={toggleSort}
          >
            End Depth
          </ColumnHeader>
        ),
        cell: (log) => (
          <span className="data-table__text data-table__text--muted">{log.endDepth || "—"}</span>
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
        cell: (log) =>
          activeLogTab === "deleted" ? (
            <span className="data-table__text">{log.logStatus}</span>
          ) : (
            <LogStatusDropdown
              status={log.logStatus}
              disabled={updatingStatusLogId === log.id}
              onChange={(status) => void handleStatusChange(log.id, status)}
            />
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
        cell: (log) => (
          <TableRowActionsMenu
            label={`Actions for ${log.logNumber}`}
            actions={[
              {
                id: "view",
                label: "View",
                icon: <ViewIcon />,
                onClick: () => handleViewLog(log),
              },
              {
                id: "copy",
                label: "Copy",
                icon: <CopyIcon />,
                disabled: copyingLogId === log.id,
                onClick: () => void handleCopyLog(log),
              },
              {
                id: "delete",
                label: "Delete",
                icon: <TrashIcon />,
                tone: "danger",
                onClick: () => requestDeleteLog(log),
              },
            ]}
          />
        ),
        className: "data-table__col--actions",
      },
    ],
    [
      activeLogTab,
      copyingLogId,
      handleCopyLog,
      handleStatusChange,
      handleViewLog,
      project.projectNo,
      requestDeleteLog,
      sort.field,
      sort.order,
      toggleSort,
      updatingStatusLogId,
    ]
  );

  return (
    <section className="project-overview-logs asset-card asset-card--table" aria-label="Project logs">
      <div className="project-overview-logs__header">
        <h3 className="project-overview-logs__title">Logs</h3>
        <div className="project-overview-logs__tabs" role="tablist" aria-label="Log views">
          {LOG_LIST_TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={activeLogTab === tab.id}
              className={`project-overview-logs__tab${activeLogTab === tab.id ? " is-active" : ""}`}
              onClick={() => setActiveLogTab(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="asset-card__toolbar">
        <div className="asset-card__filters">
          <TableSearch
            value={search}
            onChange={setSearch}
            placeholder="Search logs…"
            ariaLabel="Search logs"
            disabled={loadingLogs}
          />
        </div>
        <UiButton variant="primary" size="sm" onClick={() => setIsAddLogOpen(true)}>
          Add Log
        </UiButton>
      </div>

      <div className="asset-card__table-wrap ui-scrollbar">
        <DataTable
          columns={columns}
          data={displayData}
          getRowId={(log) => String(log.id)}
          gridTemplateColumns={LOG_GRID}
          emptyMessage={emptyMessage}
        />
      </div>

      <TablePagination
        page={page}
        pageSize={pageSize}
        total={total}
        pageSizeOptions={TABLE_PAGE_SIZE_OPTIONS}
        onPageChange={handlePageChange}
        onPageSizeChange={handlePageSizeChange}
        loading={loadingLogs}
      />

      <AddLogModal
        open={isAddLogOpen}
        onClose={() => setIsAddLogOpen(false)}
        projectId={project.id}
        defaultLogConfigId={project.logConfigId}
        onSubmit={handleAddLog}
      />

      <ConfirmDialog
        open={deleteConfirm.open}
        title="Delete log?"
        message={
          deleteConfirm.open
            ? `This will permanently remove "${deleteConfirm.log.logNumber}". This action cannot be undone.`
            : ""
        }
        confirmLabel="Delete"
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteConfirm({ open: false })}
        loading={deleting}
        variant="danger"
      />
    </section>
  );
}

function formatTimelineDate(iso: string): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  }).format(new Date(iso));
}

function ProjectStatusHistoryPanel({
  project,
  onProjectUpdate,
}: Readonly<{
  project: Project;
  onProjectUpdate?: (project: Project) => void;
}>) {
  const [history, setHistory] = useState<ProjectStatusHistoryEntry[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [isUpdateOpen, setIsUpdateOpen] = useState(false);

  const loadHistory = useCallback(async () => {
    setLoadingHistory(true);
    try {
      const entries = await listProjectStatusHistory(project.id);
      setHistory(entries);
    } catch (err) {
      showApiError(err, API_ERROR_MESSAGES.LOAD_STATUS_HISTORY);
    } finally {
      setLoadingHistory(false);
    }
  }, [project.id]);

  useEffect(() => {
    void loadHistory();
  }, [loadHistory]);

  const handleStatusUpdate = useCallback(
    ({ project: updatedProject, entry }: { project: Project; entry: ProjectStatusHistoryEntry }) => {
      setHistory((current) => [...current, entry]);
      onProjectUpdate?.(updatedProject);
    },
    [onProjectUpdate]
  );

  return (
    <section className="project-overview-status" aria-label="Project status history">
      <div className="project-overview-status__header">
        <h3 className="project-overview-status__title">Status</h3>
        <button
          type="button"
          className="project-overview-status__update-btn"
          onClick={() => setIsUpdateOpen(true)}
        >
          Update
        </button>
      </div>

      {loadingHistory ? (
        <p className="project-overview-status__empty">Loading status history…</p>
      ) : history.length > 0 ? (
        <ul className="project-overview-status__timeline">
          {history.map((entry, index) => (
            <li key={entry.id}>
              <span className="project-overview-status__dot" aria-hidden="true" />
              {index < history.length - 1 ? (
                <span className="project-overview-status__line" aria-hidden="true" />
              ) : null}
              <div>
                <strong>{entry.status}</strong>
                <span>
                  {formatTimelineDate(entry.createdAt)} · {entry.user}
                </span>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="project-overview-status__empty">No status history yet.</p>
      )}

      <UpdateProjectStatusModal
        open={isUpdateOpen}
        onClose={() => setIsUpdateOpen(false)}
        project={project}
        onSubmit={handleStatusUpdate}
      />
    </section>
  );
}

type ProjectOverviewSectionsProps = Readonly<{
  project: Project;
  onProjectUpdate?: (project: Project) => void;
}>;

export function ProjectOverviewSections({ project, onProjectUpdate }: ProjectOverviewSectionsProps) {
  return (
    <div className="project-dashboard__overview-sections">
      <ProjectLogsPanel project={project} />
      <ProjectStatusHistoryPanel project={project} onProjectUpdate={onProjectUpdate} />
    </div>
  );
}
