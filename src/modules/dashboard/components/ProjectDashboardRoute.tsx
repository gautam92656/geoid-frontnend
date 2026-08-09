"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { UiButton, PageLoader } from "@/shared/components/ui";
import { ApiError } from "@/shared/services/apiClient";
import { API_ERROR_MESSAGES } from "@/shared/constants/apiMessages";
import { showApiError } from "@/shared/utils/apiToast";
import { resolveProject } from "../services/projectApi";
import type { Project } from "../types/project";
import { ProjectDashboard } from "./ProjectDashboard";

type ProjectDashboardRouteProps = Readonly<{
  projectId: string;
}>;

export function ProjectDashboardRoute({ projectId }: ProjectDashboardRouteProps) {
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [missing, setMissing] = useState(false);

  const loadProject = useCallback(async () => {
    const trimmedId = projectId.trim();
    if (!trimmedId) {
      setMissing(true);
      setLoading(false);
      return;
    }

    setLoading(true);
    setMissing(false);

    try {
      const data = await resolveProject(trimmedId);
      setProject(data);
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) {
        setProject(null);
        setMissing(true);
        return;
      }

      showApiError(err, API_ERROR_MESSAGES.LOAD_PROJECT);
      setProject(null);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    void loadProject();
  }, [loadProject]);

  if (loading) {
    return (
      <main>
        <PageLoader label="Loading project…" variant="page" />
      </main>
    );
  }

  if (missing) {
    return (
      <main>
        <div className="project-dashboard">
          <p className="dashboard-projects-card__placeholder">
            Project not found. It may have been deleted or you may not have access.
          </p>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <UiButton type="button" variant="outline" size="sm" onClick={() => void loadProject()}>
              Try again
            </UiButton>
            <Link href="/dashboard/projects" className="data-table__link">
              Back to projects
            </Link>
          </div>
        </div>
      </main>
    );
  }

  if (!project) {
    return (
      <main>
        <div className="project-dashboard">
          <p className="dashboard-projects-card__placeholder">
            Unable to load this project.
          </p>
          <UiButton type="button" variant="outline" size="sm" onClick={() => void loadProject()}>
            Try again
          </UiButton>
        </div>
      </main>
    );
  }

  return (
    <main>
      <ProjectDashboard project={project} />
    </main>
  );
}
