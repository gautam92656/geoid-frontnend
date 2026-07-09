"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Container } from "react-bootstrap";

const PROJECTS = [
  {
    id: "13659",
    name: "Geotechnical Investigation Report",
    location: "Lot 1103 Darmain Drive Greenvale",
  },
  {
    id: "13658",
    name: "Geotechnical Investigation Report",
    location: "Lot 1102 Darmain Drive Greenvale",
  },
  {
    id: "13657",
    name: "Geotechnical Investigation Report",
    location: "Lot 1101 Darmain Drive Greenvale",
  },
  {
    id: "13656",
    name: "Geotechnical Investigation Report",
    location: "Lot 1100 Darmain Drive Greenvale",
  },
] as const;

const TABS = [
  { id: "projects", label: "Projects" },
  { id: "schedule", label: "Project Schedule" },
] as const;

type TabId = (typeof TABS)[number]["id"];

function LocationIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M12 21s7-4.5 7-10a7 7 0 10-14 0c0 5.5 7 10 7 10z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="11" r="2.5" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

function ChevronRightIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M9 6l6 6-6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M5 12l5 5L19 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

export function ProjectsSection() {
  const [activeTab, setActiveTab] = useState<TabId>("projects");
  const [search, setSearch] = useState("");

  const filteredProjects = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return PROJECTS;

    return PROJECTS.filter(
      (project) =>
        project.id.includes(query) ||
        project.name.toLowerCase().includes(query) ||
        project.location.toLowerCase().includes(query)
    );
  }, [search]);

  return (
    <section className="dashboard-workspace">
      <Container fluid className="dashboard-workspace__container">
        <div className="dashboard-workspace__layout">
          <div className="dashboard-workspace__main">
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

            <div className="dashboard-projects-card">
              {activeTab === "projects" ? (
                <>
                  <div className="dashboard-projects-card__header">
                    <h2 className="dashboard-projects-card__title">Projects</h2>
                    <div className="dashboard-projects-card__actions">
                      <span className="dashboard-projects-card__recent">Recently Viewed</span>
                      <button type="button" className="dashboard-projects-card__filter-btn">
                        <CheckIcon />
                        All Projects
                      </button>
                    </div>
                  </div>

                  <div className="dashboard-projects-card__search">
                    <input
                      type="search"
                      placeholder="Search projects..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      aria-label="Search projects"
                    />
                  </div>

                  <ul className="dashboard-projects-list">
                    {filteredProjects.map((project) => (
                      <li key={project.id}>
                        <button type="button" className="dashboard-projects-list__item">
                          <div className="dashboard-projects-list__content">
                            <span className="dashboard-projects-list__name">
                              {project.id}: {project.name}
                            </span>
                            <span className="dashboard-projects-list__location">
                              <LocationIcon />
                              {project.location}
                            </span>
                          </div>
                          <ChevronRightIcon />
                        </button>
                      </li>
                    ))}
                  </ul>
                </>
              ) : (
                <div className="dashboard-projects-card__placeholder">
                  <h2 className="dashboard-projects-card__title">Project Schedule</h2>
                  <p>Calendar view coming soon.</p>
                </div>
              )}
            </div>
          </div>

          <aside className="dashboard-workspace__sidebar">
            <div className="dashboard-sidebar-card">
              <h3 className="dashboard-sidebar-card__title">Status Activity</h3>
              <p className="dashboard-sidebar-card__empty">No new notifications</p>
            </div>

            <div className="dashboard-sidebar-card dashboard-sidebar-card--knowledge">
              <div className="dashboard-sidebar-card__icon" aria-hidden="true">
                i
              </div>
              <h3 className="dashboard-sidebar-card__title">Knowledge Base</h3>
              <p className="dashboard-sidebar-card__text">
                Contact support to learn more about our products and get professional help
              </p>
              <Link href="/dashboard/knowledge-base" className="dashboard-sidebar-card__btn">
                View Now
              </Link>
            </div>
          </aside>
        </div>
      </Container>
    </section>
  );
}
