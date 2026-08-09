"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Container } from "react-bootstrap";
import {
  DataTable,
  SortableColumnHeader,
  TablePagination,
  TableSearch,
  type ColumnDef,
} from "@/shared/components/ui";
import { useTableSort } from "@/shared/hooks/useTableSort";import {
  DEFAULT_TABLE_PAGE_SIZE,
  MAX_TABLE_PAGE_SIZE,
  TABLE_PAGE_SIZE_OPTIONS,
} from "@/shared/constants/pagination";
import { useDebouncedValue } from "@/shared/hooks/useDebouncedValue";
import { API_ERROR_MESSAGES } from "@/shared/constants/apiMessages";
import { showApiError } from "@/shared/utils/apiToast";
import { listProjects } from "../services/projectApi";
import { getProjectDisplayLabel } from "../utils/projectUtils";
import { projectDetailPath } from "../utils/projectPaths";
import type { Project } from "../types/project";
import { ProjectSchedule } from "./ProjectSchedule";

const PROJECT_SECTION_GRID =
  "minmax(180px, 1.1fr) minmax(200px, 1.4fr) minmax(220px, 1.5fr)";

const TABS = [
  { id: "projects", label: "Projects" },
  { id: "schedule", label: "Project Schedule" },
] as const;

type TabId = (typeof TABS)[number]["id"];

function getProjectSortValue(project: Project, field: string): string | number {
  switch (field) {
    case "projectNumber":
      return project.projectNo;
    case "name":
      return project.name;
    case "location":
      return project.location;
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

export function ProjectsSection() {  const [activeTab, setActiveTab] = useState<TabId>("projects");
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search.trim());
  const [projects, setProjects] = useState<Project[]>([]);
  const [scheduleProjects, setScheduleProjects] = useState<Project[]>([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(DEFAULT_TABLE_PAGE_SIZE);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [scheduleLoading, setScheduleLoading] = useState(false);
  const hasMounted = useRef(false);
  const { sort, toggleSort, sortedData } = useTableSort(projects, getProjectSortValue);

  const loadProjects = useCallback(
    async (nextPage: number, nextPageSize: number, nextSearch = debouncedSearch) => {
      setLoading(true);
      try {
        const result = await listProjects(nextPage, nextPageSize, nextSearch || undefined);
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
    [debouncedSearch]
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
    if (!hasMounted.current) {
      hasMounted.current = true;
      void loadProjects(1, DEFAULT_TABLE_PAGE_SIZE, "");
      return;
    }

    void loadProjects(1, pageSize);
  }, [debouncedSearch, loadProjects]);

  useEffect(() => {
    if (activeTab !== "schedule") return;
    void loadScheduleProjects();
  }, [activeTab, loadScheduleProjects]);

  const emptyMessage = search.trim()
    ? "No projects match your search."
    : "No projects yet.";

  const columns: ColumnDef<Project>[] = useMemo(
    () => [
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
            {getProjectDisplayLabel(project)}
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
    ],
    [sort.field, sort.order, toggleSort]
  );

  const handlePageChange = useCallback(
    (nextPage: number) => {
      void loadProjects(nextPage, pageSize);
    },
    [loadProjects, pageSize]
  );

  const handlePageSizeChange = useCallback(
    (nextPageSize: number) => {
      void loadProjects(1, nextPageSize);
    },
    [loadProjects]
  );

  return (
    <section className="dashboard-workspace">
      <Container fluid className="dashboard-workspace__container">
        <div className="dashboard-workspace__panel">
          <div className="dashboard-workspace__tabs" role="tablist" aria-label="Project views">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={activeTab === tab.id}
                className={`dashboard-workspace__tab${activeTab === tab.id ? " is-active" : ""}`}
                onClick={() => setActiveTab(tab.id)}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="dashboard-projects-card asset-card--table">
            {activeTab === "projects" ? (
              <>
                <div className="asset-card__toolbar">
                  <div className="asset-card__filters">
                    <TableSearch
                      value={search}
                      onChange={setSearch}
                      placeholder="Search project number, project name, or location"
                      ariaLabel="Search projects"
                      disabled={loading}
                    />
                  </div>
                </div>

                <div className="asset-card__table-wrap ui-scrollbar">
                  <DataTable
                    columns={columns}
                    data={sortedData}
                    getRowId={(project) => String(project.id)}
                    gridTemplateColumns={PROJECT_SECTION_GRID}
                    emptyMessage={
                      loading
                        ? "Loading projects…"
                        : emptyMessage
                    }
                  />
                </div>

                <TablePagination
                  page={page}
                  pageSize={pageSize}
                  total={total}
                  pageSizeOptions={TABLE_PAGE_SIZE_OPTIONS}
                  onPageChange={handlePageChange}
                  onPageSizeChange={handlePageSizeChange}
                  loading={loading}
                />
              </>
            ) : (
              <ProjectSchedule projects={scheduleProjects} loading={scheduleLoading} />
            )}
          </div>
        </div>
      </Container>
    </section>
  );
}
