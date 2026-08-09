"use client";

import { useEffect, useState } from "react";
import { listProjects } from "../../services/projectApi";
import type { Project } from "../../types/project";

type BuilderDataPreviewProps = Readonly<{
  selectedProject: Project | null;
  onProjectChange: (project: Project | null) => void;
}>;

export function BuilderDataPreview({
  selectedProject,
  onProjectChange,
}: BuilderDataPreviewProps) {
  const [open, setOpen] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || projects.length > 0) return;
    let cancelled = false;
    setLoading(true);
    void listProjects(1, 50)
      .then((result) => {
        if (!cancelled) setProjects(result.data);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, projects.length]);

  return (
    <div className="hf-builder__test-panel">
      {/* <button
        type="button"
        className="hf-builder__test-panel-head"
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
      >
        <span className="hf-builder__test-panel-title">
          <ScienceIcon />
          Test with Real Data
          {selectedProject ? (
            <span className="hf-builder__test-project">
              {selectedProject.projectNo} — {selectedProject.name}
            </span>
          ) : null}
        </span>
        <ChevronIcon open={open} />
      </button> */}

      {open ? (
        <div className="hf-builder__test-panel-body">
          <label className="hf-builder__field">
            <span>Project</span>
            <select
              value={selectedProject?.id ?? ""}
              disabled={loading}
              onChange={(event) => {
                const id = Number(event.target.value);
                onProjectChange(projects.find((project) => project.id === id) ?? null);
              }}
            >
              <option value="">{loading ? "Loading projects…" : "Use sample values"}</option>
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.projectNo} — {project.name}
                </option>
              ))}
            </select>
          </label>
          <p>
            Live preview resolves project and location variables from the selected project.
            Log-specific variables continue to use renderer sample values.
          </p>
        </div>
      ) : null}
    </div>
  );
}

function ScienceIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M9 3v6l-5 9a2 2 0 0 0 1.7 3h12.6a2 2 0 0 0 1.7-3l-5-9V3"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      <path d="M8 3h8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      style={{ transform: open ? "rotate(180deg)" : undefined }}
    >
      <path d="M7 10l5 5 5-5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}
