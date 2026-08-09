"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { PageLoader, UiButton } from "@/shared/components/ui";
import { ApiError } from "@/shared/services/apiClient";
import { API_ERROR_MESSAGES } from "@/shared/constants/apiMessages";
import { showApiError } from "@/shared/utils/apiToast";
import { getLog } from "../services/logApi";
import { resolveProject } from "../services/projectApi";
import type { Log } from "../types/log";
import type { Project } from "../types/project";
import { UpdateLogPage } from "./UpdateLogPage";

type UpdateLogRouteProps = Readonly<{
  projectId: string;
  logId: string;
}>;

function parsePositiveInt(value: string): number | null {
  const parsed = Number(value.trim());
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

export function UpdateLogRoute({ projectId, logId }: UpdateLogRouteProps) {
  const [project, setProject] = useState<Project | null>(null);
  const [log, setLog] = useState<Log | null>(null);
  const [loading, setLoading] = useState(true);
  const [missing, setMissing] = useState(false);

  const load = useCallback(async () => {
    const trimmedProjectId = projectId.trim();
    const numericLogId = parsePositiveInt(logId);

    if (!trimmedProjectId || numericLogId == null) {
      setMissing(true);
      setLoading(false);
      return;
    }

    setLoading(true);
    setMissing(false);

    try {
      const projectData = await resolveProject(trimmedProjectId);
      const logData = await getLog(projectData.id, numericLogId);
      setProject(projectData);
      setLog(logData);
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) {
        setProject(null);
        setLog(null);
        setMissing(true);
        return;
      }

      showApiError(err, API_ERROR_MESSAGES.LOAD_LOG);
      setProject(null);
      setLog(null);
    } finally {
      setLoading(false);
    }
  }, [logId, projectId]);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) {
    return (
      <main>
        <PageLoader label="Loading log…" variant="page" />
      </main>
    );
  }

  if (missing || !project || !log) {
    return (
      <main>
        <div className="project-dashboard">
          <p className="dashboard-projects-card__placeholder">
            {missing
              ? "Project or log not found. It may have been deleted or you may not have access."
              : "Unable to load this log."}
          </p>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <UiButton type="button" variant="outline" size="sm" onClick={() => void load()}>
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

  return (
    <main>
      <UpdateLogPage project={project} log={log} />
    </main>
  );
}
