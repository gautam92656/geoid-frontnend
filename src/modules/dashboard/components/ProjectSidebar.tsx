"use client";

import type { ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { useEffect } from "react";
import {
  COMPANY_LOGO_ALT,
  COMPANY_LOGO_HEIGHT,
  COMPANY_LOGO_PATH,
  COMPANY_LOGO_WIDTH,
} from "@/shared/constants/branding";

export const PROJECT_SIDEBAR_SECTIONS = [
  { id: "overview", label: "Overview", icon: "overview" },
  { id: "logs", label: "Logs", icon: "logs" },
  { id: "logs-quick-select", label: "Quick Select", icon: "logs-quick-select" },
  { id: "lab-tests", label: "Lab Tests", icon: "lab-tests" },
  { id: "report-tools", label: "Reports", icon: "report-tools" },
  { id: "project-photos", label: "Photos", icon: "project-photos" },
  { id: "exports", label: "Exports", icon: "exports" },
  { id: "client-portal", label: "Portal", icon: "client-portal" },
] as const;

export type ProjectSidebarSectionId = (typeof PROJECT_SIDEBAR_SECTIONS)[number]["id"];

function SidebarIcon({ name }: Readonly<{ name: (typeof PROJECT_SIDEBAR_SECTIONS)[number]["icon"] }>) {
  const icons: Record<(typeof PROJECT_SIDEBAR_SECTIONS)[number]["icon"], ReactNode> = {
    overview: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path
          d="M3 10.5L12 3l9 7.5V20a1 1 0 01-1 1h-5v-6H9v6H4a1 1 0 01-1-1v-9.5z"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
      </svg>
    ),
    logs: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path
          d="M7 4h10a2 2 0 012 2v14l-4-2-4 2-4-2-4 2V6a2 2 0 012-2z"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
        <path d="M9 8h6M9 12h6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    ),
    "logs-quick-select": (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M4 6h16M4 12h16M4 18h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    ),
    "lab-tests": (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path
          d="M10 3h4v5l5 9a2 2 0 01-1.732 3H6.732A2 2 0 015 17l5-9V3z"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
        <path d="M8 14h8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    ),
    "report-tools": (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path
          d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
        <rect x="9" y="3" width="6" height="4" rx="1" stroke="currentColor" strokeWidth="1.5" />
        <path d="M9 12h6M9 16h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    ),
    "project-photos": (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <rect x="3" y="5" width="18" height="14" rx="2" stroke="currentColor" strokeWidth="1.5" />
        <circle cx="8.5" cy="10.5" r="1.5" stroke="currentColor" strokeWidth="1.5" />
        <path d="M21 15l-5-5-4 4-2-2-5 5" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      </svg>
    ),
    exports: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path
          d="M12 3v12M8 11l4 4 4-4M5 21h14"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
    "client-portal": (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M4 19V5M4 19h16M8 15V9M12 17V7M16 13V11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    ),
  };

  return <span className="project-sidebar__icon">{icons[name]}</span>;
}

type ProjectSidebarProps = Readonly<{
  activeSection: ProjectSidebarSectionId;
  onSectionChange: (section: ProjectSidebarSectionId) => void;
}>;

export function ProjectSidebar({ activeSection, onSectionChange }: ProjectSidebarProps) {
  useEffect(() => {
    return () => {
      document.body.classList.remove("project-sidebar-expanded");
    };
  }, []);

  const setExpanded = (expanded: boolean) => {
    document.body.classList.toggle("project-sidebar-expanded", expanded);
  };

  return (
    <aside
      className="project-sidebar"
      aria-label="Project navigation"
      onMouseEnter={() => setExpanded(true)}
      onMouseLeave={() => setExpanded(false)}
      onFocusCapture={() => setExpanded(true)}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
          setExpanded(false);
        }
      }}
    >
      <div className="project-sidebar__brand">
        <Link href="/dashboard" className="project-sidebar__brand-link" aria-label="GeoID home">
          <Image
            src={COMPANY_LOGO_PATH}
            alt=""
            width={COMPANY_LOGO_WIDTH}
            height={COMPANY_LOGO_HEIGHT}
            className="project-sidebar__brand-mark"
          />
          <span className="project-sidebar__brand-text">GeoID</span>
        </Link>
      </div>

      <nav className="project-sidebar__nav ui-scrollbar">
        <ul className="project-sidebar__list">
          {PROJECT_SIDEBAR_SECTIONS.map((section) => (
            <li key={section.id}>
              <button
                type="button"
                className={`project-sidebar__link${activeSection === section.id ? " is-active" : ""}`}
                aria-current={activeSection === section.id ? "page" : undefined}
                aria-label={section.label}
                title={section.label}
                onClick={() => onSectionChange(section.id)}
              >
                <SidebarIcon name={section.icon} />
                <span className="project-sidebar__label">{section.label}</span>
              </button>
            </li>
          ))}
        </ul>
      </nav>
    </aside>
  );
}
