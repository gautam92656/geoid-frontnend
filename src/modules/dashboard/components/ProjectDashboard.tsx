"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { Project } from "../types/project";
import { getProjectDisplayLabel, getProjectTitle } from "../utils/projectUtils";
import { ProjectDetailsForm } from "./ProjectDetailsForm";
import { ProjectOverviewSections } from "./ProjectOverviewSections";
import { ProjectSidebar, type ProjectSidebarSectionId } from "./ProjectSidebar";

const TABS = [
  { id: "overview", label: "Overview" },
  { id: "details", label: "Details" },
] as const;

type TabId = (typeof TABS)[number]["id"];

function UserIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="8" r="3.5" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M5 19c0-3.314 3.134-6 7-6s7 2.686 7 6"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

function LocationIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M12 21s6-5.686 6-10a6 6 0 10-12 0c0 4.314 6 10 6 10z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="11" r="2" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

function ProjectOverview({
  project,
  onProjectUpdate,
}: Readonly<{
  project: Project;
  onProjectUpdate?: (project: Project) => void;
}>) {
  const initial = project.name.charAt(0).toUpperCase();

  return (
    <div className="project-dashboard__overview">
      <article className="project-dashboard__info-card">
        <span className="project-dashboard__info-avatar" aria-hidden="true">
          {initial}
        </span>
        <div className="project-dashboard__info-content">
          <h2 className="project-dashboard__info-title">
            {getProjectDisplayLabel(project)}: {project.name}
          </h2>
          <div className="project-dashboard__info-meta">
            <span>
              <UserIcon />
              {project.client}
            </span>
            <span>
              <LocationIcon />
              {project.location}
            </span>
          </div>
        </div>
      </article>

      <ProjectOverviewSections project={project} onProjectUpdate={onProjectUpdate} />
    </div>
  );
}

function ProjectSectionPlaceholder({ title }: Readonly<{ title: string }>) {
  return (
    <div className="project-dashboard__empty-state">
      <p>{title}</p>
      <span>This section is coming soon.</span>
    </div>
  );
}

function getSidebarSectionTitle(section: ProjectSidebarSectionId) {
  const titles: Record<ProjectSidebarSectionId, string> = {
    overview: "Overview",
    logs: "Logs",
    "logs-quick-select": "Quick Select",
    "lab-tests": "Lab Tests",
    "report-tools": "Reports",
    "project-photos": "Photos",
    exports: "Exports",
    "client-portal": "Portal",
  };

  return titles[section];
}

type ProjectDashboardProps = Readonly<{
  project: Project;
}>;

export function ProjectDashboard({ project: initialProject }: ProjectDashboardProps) {
  const [project, setProject] = useState(initialProject);
  const [activeSection, setActiveSection] = useState<ProjectSidebarSectionId>("overview");
  const [activeTab, setActiveTab] = useState<TabId>("overview");
  const statusClass = project.status.toLowerCase().replace(/\s+/g, "-");

  useEffect(() => {
    setProject(initialProject);
  }, [initialProject]);

  return (
    <div className="project-dashboard">
      <div className="project-dashboard__layout">
        <ProjectSidebar
          activeSection={activeSection}
          onSectionChange={setActiveSection}
        />

        <div className="project-dashboard__main">
          <header className="project-dashboard__header">
            <nav className="project-dashboard__breadcrumbs" aria-label="Breadcrumb">
              <Link href="/dashboard">Home</Link>
              <span aria-hidden="true">/</span>
              <Link href="/dashboard/projects">Projects</Link>
              <span aria-hidden="true">/</span>
              <span aria-current="page">{project.projectNo}</span>
            </nav>

            <div className="project-dashboard__header-main">
              <div className="project-dashboard__header-copy">
                <div className="project-dashboard__title-row">
                  <h1 className="project-dashboard__title">{getProjectTitle(project)}</h1>
                  <span className={`project-dashboard__status project-dashboard__status--${statusClass}`}>
                    {project.status}
                  </span>
                </div>
                <p className="project-dashboard__subtitle">{project.location}</p>
              </div>

              {activeSection === "overview" ? (
                <div className="project-dashboard__tabs" role="tablist" aria-label="Project sections">
                  {TABS.map((tab) => (
                    <button
                      key={tab.id}
                      type="button"
                      role="tab"
                      aria-selected={activeTab === tab.id}
                      className={`project-dashboard__tab${activeTab === tab.id ? " is-active" : ""}`}
                      onClick={() => setActiveTab(tab.id)}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
          </header>

          <div className="project-dashboard__container">
            {activeSection === "overview" ? (
              <div className="project-dashboard__content" role="tabpanel">
                {activeTab === "overview" ? (
                  <ProjectOverview project={project} onProjectUpdate={setProject} />
                ) : null}
                {activeTab === "details" ? (
                  <ProjectDetailsForm project={project} onProjectUpdate={setProject} />
                ) : null}
              </div>
            ) : (
              <div className="project-dashboard__content">
                <ProjectSectionPlaceholder title={getSidebarSectionTitle(activeSection)} />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
