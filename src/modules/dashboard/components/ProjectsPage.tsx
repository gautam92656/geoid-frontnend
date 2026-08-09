"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Container } from "react-bootstrap";
import {
  ArchiveIcon,
  Badge,
  Checkbox,
  ConfirmDialog,
  CopyIcon,
  DataTable,
  DownloadIcon,
  EditIcon,
  PageHeader,
  PageLoader,
  RefreshIcon,
  Select,
  SortableColumnHeader,
  TableRowActionsMenu,
  TableToolbar,
  TablePagination,
  TableSearch,
  TrashIcon,
  UiButton,
  UnarchiveIcon,
  ViewIcon,
  type ColumnDef,
  type ToolbarAction,
} from "@/shared/components/ui";
import { DEFAULT_TABLE_PAGE_SIZE, MAX_TABLE_PAGE_SIZE, TABLE_PAGE_SIZE_OPTIONS } from "@/shared/constants/pagination";
import { useDebouncedValue } from "@/shared/hooks/useDebouncedValue";
import { useTableSort } from "@/shared/hooks/useTableSort";
import { formatDisplayDate } from "@/shared/utils/formatDate";
import { API_ERROR_MESSAGES, API_MESSAGES } from "@/shared/constants/apiMessages";
import { showApiError, showApiSuccess } from "@/shared/utils/apiToast";
import {
  PROJECT_PAGE_TABS,
  PROJECT_STATUS_FILTER_OPTIONS,
  getProjectListScope,
  isProjectListTab,
  type ProjectListScope,
  type ProjectPageTabId,
} from "../data/projectOptions";
import { archiveProject, createProject, deleteProject, listProjects, unarchiveProject } from "../services/projectApi";
import type { Project } from "../types/project";
import { projectStatusToApiValue, projectToCopyPayload } from "../utils/projectFormUtils";
import { projectDetailPath } from "../utils/projectPaths";
import { PROJECT_EXPORT_COLUMNS } from "../data/exportColumns";
import { AddProjectModal } from "./AddProjectModal";
import { ExportCsvModal } from "./ExportCsvModal";
import { ProjectSchedule } from "./ProjectSchedule";
import type { TableRowAction } from "@/shared/components/ui/TableRowActionsMenu";

const PROJECT_GRID_BASE =
  "40px minmax(130px, 1fr) minmax(160px, 1.2fr) minmax(180px, 1.4fr) minmax(120px, 1fr) minmax(90px, 0.7fr) minmax(130px, 0.8fr) minmax(130px, 0.8fr)";

const PROJECT_GRID_LIST     = `${PROJECT_GRID_BASE} 56px`;
const PROJECT_GRID_ARCHIVED = `${PROJECT_GRID_BASE} minmax(130px, 0.8fr) 56px`;
const PROJECT_GRID_DELETED  = `${PROJECT_GRID_BASE} minmax(130px, 0.8fr)`;

type DeleteConfirmState =
  | { open: false }
  | { open: true; mode: "single"; project: Project }
  | { open: true; mode: "bulk"; count: number };

function getProjectSortValue(project: Project, field: string): string | number {
  switch (field) {
    case "projectNumber":
      return project.projectNo;
    case "name":
      return project.name;
    case "location":
      return project.location;
    case "client":
      return project.client;
    case "status":
      return project.status;
    case "createdAt":
      return project.createdAt;
    case "updatedAt":
      return project.updatedAt;
    case "archivedAt":
      return project.archivedAt ?? "";
    case "deletedAt":
      return project.deletedAt ?? "";
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
}: Readonly<{
  children: ReactNode;
  field: string;
  sortField: string | null;
  sortOrder: "asc" | "desc";
  onSort: (field: string) => void;
}>) {
  return (
    <SortableColumnHeader
      field={field}
      activeField={sortField}
      activeOrder={sortOrder}
      onSort={onSort}
    >
      {children}
    </SortableColumnHeader>
  );
}

function getStatusVariant(status: string): "success" | "warning" | "neutral" {
  const normalized = status.toLowerCase();
  if (normalized === "complete" || normalized === "completed") return "success";
  if (
    normalized === "onsite works" ||
    normalized === "in progress" ||
    normalized === "lab testing" ||
    normalized === "reporting"
  ) {
    return "warning";
  }
  return "neutral";
}

export function ProjectsPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<ProjectPageTabId>("list");
  const [projects, setProjects] = useState<Project[]>([]);
  const [scheduleProjects, setScheduleProjects] = useState<Project[]>([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(DEFAULT_TABLE_PAGE_SIZE);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [scheduleLoading, setScheduleLoading] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search.trim());
  const [statusFilter, setStatusFilter] = useState("all");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [exportOpen, setExportOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [copying, setCopying] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<DeleteConfirmState>({ open: false });
  const hasMounted = useRef(false);
  const { sort, toggleSort, sortedData } = useTableSort(projects, getProjectSortValue);

  const exportRows = useMemo(() => {
    if (selectedIds.size === 0) return sortedData;
    return sortedData.filter((project) => selectedIds.has(project.id));
  }, [selectedIds, sortedData]);

  const selectedCount = selectedIds.size;
  const currentListScope = useMemo(
    () => getProjectListScope(activeTab) ?? "active",
    [activeTab]
  );
  const isListView = isProjectListTab(activeTab);

  const loadProjects = useCallback(
    async (
      nextPage: number,
      nextPageSize: number,
      scope: ProjectListScope = currentListScope,
      nextSearch = debouncedSearch,
      nextStatus = statusFilter
    ) => {
      setLoading(true);
      try {
        const statusParam =
          scope === "active" && nextStatus !== "all"
            ? projectStatusToApiValue(nextStatus)
            : undefined;
        const result = await listProjects(
          nextPage,
          nextPageSize,
          nextSearch || undefined,
          statusParam,
          undefined,
          "desc",
          scope
        );
        setProjects(result.data);
        setTotal(result.total);
        setPage(nextPage);
        setPageSize(nextPageSize);
      } catch (err) {
        showApiError(err, API_ERROR_MESSAGES.LOAD_PROJECTS);
      } finally {
        setLoading(false);
      }
    },
    [currentListScope, debouncedSearch, statusFilter]
  );

  const loadScheduleProjects = useCallback(async () => {
    setScheduleLoading(true);
    try {
      const result = await listProjects(1, MAX_TABLE_PAGE_SIZE);
      setScheduleProjects(result.data);
    } catch (err) {
      showApiError(err, API_ERROR_MESSAGES.LOAD_PROJECT_SCHEDULE);
    } finally {
      setScheduleLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isListView) return;

    if (!hasMounted.current) {
      hasMounted.current = true;
      void loadProjects(1, DEFAULT_TABLE_PAGE_SIZE, currentListScope, "", "all");
      return;
    }

    setSelectedIds(new Set());
    void loadProjects(1, pageSize, currentListScope);
  }, [
    currentListScope,
    debouncedSearch,
    isListView,
    loadProjects,
    pageSize,
    statusFilter,
  ]);

  useEffect(() => {
    if (activeTab !== "schedule") return;
    void loadScheduleProjects();
  }, [activeTab, loadScheduleProjects]);

  const allSelected = projects.length > 0 && selectedIds.size === projects.length;
  const someSelected = selectedIds.size > 0 && !allSelected;

  const toggleAll = useCallback(() => {
    setSelectedIds((current) =>
      current.size === projects.length ? new Set() : new Set(projects.map((project) => project.id))
    );
  }, [projects]);

  const toggleOne = useCallback((id: number) => {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const handleRefresh = useCallback(() => {
    if (loading) return;
    setSelectedIds(new Set());
    void loadProjects(page, pageSize, currentListScope);
  }, [currentListScope, loadProjects, loading, page, pageSize]);

  const handleSearchChange = useCallback((value: string) => {
    setSearch(value);
  }, []);

  const handleStatusFilterChange = useCallback((value: string) => {
    setStatusFilter(value);
  }, []);

  const handlePageChange = useCallback(
    (nextPage: number) => {
      setSelectedIds(new Set());
      void loadProjects(nextPage, pageSize, currentListScope);
    },
    [currentListScope, loadProjects, pageSize]
  );

  const handlePageSizeChange = useCallback(
    (nextPageSize: number) => {
      setSelectedIds(new Set());
      void loadProjects(1, nextPageSize, currentListScope);
    },
    [currentListScope, loadProjects]
  );

  const openAddModal = useCallback(() => {
    setEditingProject(null);
    setModalOpen(true);
  }, []);

  const openEditModal = useCallback((project: Project) => {
    setEditingProject(project);
    setModalOpen(true);
  }, []);

  const closeModal = useCallback(() => {
    setModalOpen(false);
    setEditingProject(null);
  }, []);

  const handleProjectSaved = useCallback(
    async (_project: Project) => {
      setSelectedIds(new Set());
      await loadProjects(editingProject ? page : 1, pageSize, "active");
    },
    [editingProject, loadProjects, page, pageSize]
  );

  const existingProjectNos = useMemo(
    () => projects.map((project) => project.projectNo),
    [projects]
  );

  const openProject = useCallback(
    (project: Project) => {
      router.push(projectDetailPath(project.id));
    },
    [router]
  );

  const handleCopyProject = useCallback(
    async (project: Project) => {
      if (copying) return;

      const payload = projectToCopyPayload(project);
      if (!payload) {
        showApiError(undefined, "Cannot copy project without a client.");
        return;
      }

      setCopying(true);
      try {
        const { message } = await createProject(payload);
        setSelectedIds(new Set());
        await loadProjects(1, pageSize, "active");
        showApiSuccess(message, API_MESSAGES.PROJECT_ADDED);
      } catch (err) {
        showApiError(err, API_ERROR_MESSAGES.COPY_PROJECT);
      } finally {
        setCopying(false);
      }
    },
    [copying, loadProjects, pageSize]
  );

  const handleArchiveProject = useCallback(
    async (project: Project) => {
      setDeleting(true);
      try {
        const { message } = await archiveProject(project.id);
        setSelectedIds((current) => {
          const next = new Set(current);
          next.delete(project.id);
          return next;
        });

        const nextTotal = Math.max(0, total - 1);
        const nextTotalPages = Math.max(1, Math.ceil(nextTotal / pageSize));
        const nextPage = Math.min(page, nextTotalPages);
        await loadProjects(nextPage, pageSize, currentListScope);

        showApiSuccess(message, API_MESSAGES.PROJECT_ARCHIVED);
      } catch (err) {
        showApiError(err, API_ERROR_MESSAGES.ARCHIVE_PROJECT);
      } finally {
        setDeleting(false);
      }
    },
    [currentListScope, loadProjects, page, pageSize, total]
  );

  const handleUnarchiveProject = useCallback(
    async (project: Project) => {
      setDeleting(true);
      try {
        const { message } = await unarchiveProject(project.id);
        const nextTotal = Math.max(0, total - 1);
        const nextTotalPages = Math.max(1, Math.ceil(nextTotal / pageSize));
        const nextPage = Math.min(page, nextTotalPages);
        await loadProjects(nextPage, pageSize, currentListScope);
        showApiSuccess(message, API_MESSAGES.PROJECT_RESTORED);
      } catch (err) {
        showApiError(err, API_ERROR_MESSAGES.RESTORE_PROJECT);
      } finally {
        setDeleting(false);
      }
    },
    [currentListScope, loadProjects, page, pageSize, total]
  );

  const requestDeleteProject = useCallback((project: Project) => {
    setDeleteConfirm({ open: true, mode: "single", project });
  }, []);

  const requestDeleteSelected = useCallback(() => {
    if (selectedCount === 0) return;
    setDeleteConfirm({ open: true, mode: "bulk", count: selectedCount });
  }, [selectedCount]);

  const performDelete = useCallback(
    async (ids: number[]) => {
      if (ids.length === 0) return;

      setDeleting(true);
      try {
        const results = await Promise.all(ids.map((id) => deleteProject(id)));
        setSelectedIds(new Set());

        const nextTotal = Math.max(0, total - ids.length);
        const nextTotalPages = Math.max(1, Math.ceil(nextTotal / pageSize));
        const nextPage = Math.min(page, nextTotalPages);
        await loadProjects(nextPage, pageSize, currentListScope);

        const message = results.find((result) => result.message)?.message;
        showApiSuccess(
          message,
          ids.length === 1 ? API_MESSAGES.PROJECT_DELETED : API_MESSAGES.PROJECTS_DELETED
        );
        setDeleteConfirm({ open: false });
      } catch (err) {
        showApiError(err, API_ERROR_MESSAGES.DELETE_PROJECTS);
      } finally {
        setDeleting(false);
      }
    },
    [currentListScope, loadProjects, page, pageSize, total]
  );

  const confirmDeleteProject = useCallback(async () => {
    if (!deleteConfirm.open) return;

    if (deleteConfirm.mode === "single") {
      await performDelete([deleteConfirm.project.id]);
      return;
    }

    await performDelete([...selectedIds]);
  }, [deleteConfirm, performDelete, selectedIds]);

  const toolbarActions: ToolbarAction[] = useMemo(() => {
    const actions: ToolbarAction[] = [];

    if (activeTab === "list" || activeTab === "archived") {
      actions.push({
        id: "delete",
        label:
          selectedCount > 0
            ? `Delete ${selectedCount} selected project${selectedCount === 1 ? "" : "s"}`
            : "Delete selected projects",
        icon: <TrashIcon />,
        onClick: requestDeleteSelected,
        disabled: selectedCount === 0 || deleting || loading,
      });
    }

    actions.push(
      {
        id: "export",
        label:
          selectedCount > 0
            ? `Export ${selectedCount} selected project${selectedCount === 1 ? "" : "s"}`
            : `Export ${exportRows.length} project${exportRows.length === 1 ? "" : "s"}`,
        icon: <DownloadIcon />,
        onClick: () => setExportOpen(true),
        disabled: exportRows.length === 0 || loading,
      },
      {
        id: "refresh",
        label: loading ? "Refreshing projects" : "Refresh projects",
        icon: <RefreshIcon />,
        onClick: handleRefresh,
        disabled: loading,
      }
    );

    return actions;
  }, [
    activeTab,
    deleting,
    exportRows.length,
    handleRefresh,
    loading,
    requestDeleteSelected,
    selectedCount,
  ]);

  const emptyMessage = useMemo(() => {
    if (loading) return "Loading projects…";
    if (activeTab === "archived") {
      return debouncedSearch ? "No archived projects match your search." : "No archived projects.";
    }
    if (activeTab === "deleted") {
      return debouncedSearch ? "No deleted projects match your search." : "No deleted projects.";
    }
    if (debouncedSearch || statusFilter !== "all") {
      return "No projects match your search or filters.";
    }
    return "No projects yet. Add your first project to get started.";
  }, [activeTab, debouncedSearch, loading, statusFilter]);

  const deleteDialogTitle =
    deleteConfirm.open && deleteConfirm.mode === "bulk"
      ? `Delete ${deleteConfirm.count} projects?`
      : "Delete project?";

  const deleteDialogMessage =
    deleteConfirm.open && deleteConfirm.mode === "bulk"
      ? `This will permanently remove ${deleteConfirm.count} selected projects. This action cannot be undone.`
      : deleteConfirm.open
        ? `This will permanently remove "${deleteConfirm.project.name}". This action cannot be undone.`
        : "";

  const columns: ColumnDef<Project>[] = useMemo(() => {
    const baseColumns: ColumnDef<Project>[] = [
      {
        id: "select",
        header: (
          <Checkbox
            checked={allSelected}
            indeterminate={someSelected}
            onChange={toggleAll}
            aria-label="Select all projects"
          />
        ),
        cell: (project) => (
          <Checkbox
            checked={selectedIds.has(project.id)}
            onChange={() => toggleOne(project.id)}
            aria-label={`Select ${project.name}`}
          />
        ),
        className: "data-table__col--checkbox",
      },
      {
        id: "projectNumber",
        header: (
          <ColumnHeader
            field="projectNumber"
            sortField={sort.field}
            sortOrder={sort.order}
            onSort={toggleSort}
          >
            Project Number
          </ColumnHeader>
        ),
        cell: (project) => (
          <Link href={projectDetailPath(project.id)} className="data-table__link">
            {project.projectNo}
          </Link>
        ),
      },
      {
        id: "name",
        header: (
          <ColumnHeader field="name" sortField={sort.field} sortOrder={sort.order} onSort={toggleSort}>
            Project Name
          </ColumnHeader>
        ),
        cell: (project) => <span className="data-table__text">{project.name}</span>,
      },
      {
        id: "location",
        header: (
          <ColumnHeader
            field="location"
            sortField={sort.field}
            sortOrder={sort.order}
            onSort={toggleSort}
          >
            Location
          </ColumnHeader>
        ),
        cell: (project) => (
          <span className="data-table__text" title={project.location}>
            {project.location}
          </span>
        ),
      },
      {
        id: "client",
        header: (
          <ColumnHeader
            field="client"
            sortField={sort.field}
            sortOrder={sort.order}
            onSort={toggleSort}
          >
            Client
          </ColumnHeader>
        ),
        cell: (project) => <span className="data-table__text">{project.client}</span>,
      },
      {
        id: "status",
        header: (
          <ColumnHeader
            field="status"
            sortField={sort.field}
            sortOrder={sort.order}
            onSort={toggleSort}
          >
            Status
          </ColumnHeader>
        ),
        cell: (project) => (
          <Badge variant={getStatusVariant(project.status)}>{project.status}</Badge>
        ),
      },
      {
        id: "createdAt",
        header: (
          <ColumnHeader
            field="createdAt"
            sortField={sort.field}
            sortOrder={sort.order}
            onSort={toggleSort}
          >
            Created At
          </ColumnHeader>
        ),
        cell: (project) => (
          <span className="data-table__text data-table__text--muted">
            {formatDisplayDate(project.createdAt)}
          </span>
        ),
      },
      {
        id: "updatedAt",
        header: (
          <ColumnHeader
            field="updatedAt"
            sortField={sort.field}
            sortOrder={sort.order}
            onSort={toggleSort}
          >
            Updated At
          </ColumnHeader>
        ),
        cell: (project) => (
          <span className="data-table__text data-table__text--muted">
            {formatDisplayDate(project.updatedAt)}
          </span>
        ),
      },
    ];

    if (activeTab === "archived") {
      baseColumns.push({
        id: "archivedAt",
        header: (
          <ColumnHeader
            field="archivedAt"
            sortField={sort.field}
            sortOrder={sort.order}
            onSort={toggleSort}
          >
            Archived At
          </ColumnHeader>
        ),
        cell: (project) => (
          <span className="data-table__text data-table__text--muted">
            {project.archivedAt ? formatDisplayDate(project.archivedAt) : "—"}
          </span>
        ),
      });
    }

    if (activeTab === "deleted") {
      baseColumns.push({
        id: "deletedAt",
        header: (
          <ColumnHeader
            field="deletedAt"
            sortField={sort.field}
            sortOrder={sort.order}
            onSort={toggleSort}
          >
            Deleted At
          </ColumnHeader>
        ),
        cell: (project) => (
          <span className="data-table__text data-table__text--muted">
            {project.deletedAt ? formatDisplayDate(project.deletedAt) : "—"}
          </span>
        ),
      });
    }

    if (activeTab !== "deleted") {
      baseColumns.push({
        id: "actions",
        header: "Actions",
        cell: (project) => {
          const actions: TableRowAction[] = [
            {
              id: "view",
              label: "View",
              icon: <ViewIcon />,
              onClick: () => openProject(project),
            },
          ];

          if (activeTab === "list") {
            actions.push(
              {
                id: "copy",
                label: "Copy",
                icon: <CopyIcon />,
                onClick: () => {
                  void handleCopyProject(project);
                },
              },
              {
                id: "edit",
                label: "Edit",
                icon: <EditIcon />,
                onClick: () => openEditModal(project),
              },
              {
                id: "archive",
                label: "Archive",
                icon: <ArchiveIcon />,
                onClick: () => {
                  void handleArchiveProject(project);
                },
              },
              {
                id: "delete",
                label: "Delete",
                icon: <TrashIcon />,
                tone: "danger",
                onClick: () => requestDeleteProject(project),
              }
            );
          } else if (activeTab === "archived") {
            actions.push(
              {
                id: "unarchive",
                label: "Un-archive",
                icon: <UnarchiveIcon />,
                onClick: () => {
                  void handleUnarchiveProject(project);
                },
              },
              {
                id: "delete",
                label: "Delete",
                icon: <TrashIcon />,
                tone: "danger",
                onClick: () => requestDeleteProject(project),
              }
            );
          }

          return (
            <TableRowActionsMenu label={`Actions for ${project.name}`} actions={actions} />
          );
        },
        className: "data-table__col--actions",
      });
    }

    return baseColumns;
  }, [
      activeTab,
      allSelected,
      someSelected,
      selectedIds,
      sort.field,
      sort.order,
      toggleAll,
      toggleOne,
      toggleSort,
      openProject,
      openEditModal,
      handleCopyProject,
      handleArchiveProject,
      handleUnarchiveProject,
      requestDeleteProject,
    ]
  );

  return (
    <section className="asset-page asset-page--projects">
      <Container fluid className="asset-page__container">
        <PageHeader
          title="Projects"
          subtitle="Manage and open your geotechnical projects"
          action={
            <UiButton variant="primary" size="sm" onClick={openAddModal}>
              Add Project
            </UiButton>
          }
        />

        <div className="asset-card asset-card--table">
          <div className="asset-card__tabs" role="tablist" aria-label="Project views">
            {PROJECT_PAGE_TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={activeTab === tab.id}
                className={`asset-card__tab${activeTab === tab.id ? " is-active" : ""}`}
                onClick={() => setActiveTab(tab.id)}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div key={activeTab} className="page-enter">
            {isListView ? (
              <div className="asset-card__toolbar">
                <div className="asset-card__filters">
                  <TableSearch
                    value={search}
                    onChange={handleSearchChange}
                    placeholder={
                      activeTab === "archived"
                        ? "Search archived projects…"
                        : activeTab === "deleted"
                          ? "Search deleted projects…"
                          : "Search projects…"
                    }
                    ariaLabel="Search projects"
                    disabled={loading}
                  />
                  {activeTab === "list" ? (
                    <div className="asset-card__filter-select">
                      <Select
                        value={statusFilter}
                        onChange={handleStatusFilterChange}
                        options={PROJECT_STATUS_FILTER_OPTIONS}
                        floatingMenu
                        disabled={loading}
                      />
                    </div>
                  ) : null}
                </div>

                <TableToolbar actions={toolbarActions} />
                {selectedIds.size > 0 ? (
                  <span className="asset-card__selection">{selectedIds.size} selected</span>
                ) : null}
              </div>
            ) : null}

            <div className="asset-card__table-wrap ui-scrollbar">
              {isListView ? (
                loading ? (
                  <PageLoader label="Loading projects…" variant="section" />
                ) : (
                  <DataTable
                    columns={columns}
                    data={sortedData}
                    getRowId={(project) => String(project.id)}
                    gridTemplateColumns={
                      activeTab === "archived"
                        ? PROJECT_GRID_ARCHIVED
                        : activeTab === "deleted"
                          ? PROJECT_GRID_DELETED
                          : PROJECT_GRID_LIST
                    }
                    emptyMessage={emptyMessage}
                  />
                )
              ) : (
                <ProjectSchedule projects={scheduleProjects} loading={scheduleLoading} />
              )}
            </div>

            {isListView ? (
              <TablePagination
                page={page}
                pageSize={pageSize}
                total={total}
                pageSizeOptions={TABLE_PAGE_SIZE_OPTIONS}
                onPageChange={handlePageChange}
                onPageSizeChange={handlePageSizeChange}
                loading={loading}
              />
            ) : null}
          </div>
        </div>
      </Container>

      <AddProjectModal
        open={modalOpen}
        onClose={closeModal}
        onSubmit={(project) => {
          void handleProjectSaved(project);
        }}
        existingProjectNos={existingProjectNos}
        editingProject={editingProject}
      />

      <ConfirmDialog
        open={deleteConfirm.open}
        title={deleteDialogTitle}
        message={deleteDialogMessage}
        confirmLabel="Delete"
        loading={deleting}
        variant="danger"
        onConfirm={() => {
          void confirmDeleteProject();
        }}
        onCancel={() => setDeleteConfirm({ open: false })}
      />

      <ExportCsvModal
        open={exportOpen}
        onClose={() => setExportOpen(false)}
        title="Export Projects"
        filename="projects"
        columns={PROJECT_EXPORT_COLUMNS}
        data={exportRows}
        selectedCount={selectedCount}
      />
    </section>
  );
}
