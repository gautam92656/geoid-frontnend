"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { useEffect, useState } from "react";
import {
  SUPER_ADMIN_LOG_CONFIGURATIONS_PATH,
  SUPER_ADMIN_LOG_TEMPLATES_PATH,
  SUPER_ADMIN_USERS_PATH,
} from "../utils/paths";

export const SUPER_ADMIN_SECTIONS = [
  {
    id: "users",
    label: "User Management",
    shortLabel: "Users",
    href: SUPER_ADMIN_USERS_PATH,
    icon: "users",
  },
  {
    id: "log-configurations",
    label: "Log Configurations",
    shortLabel: "Log Configs",
    href: SUPER_ADMIN_LOG_CONFIGURATIONS_PATH,
    icon: "log-configurations",
  },
  {
    id: "log-templates",
    label: "Log Templates",
    shortLabel: "Templates",
    href: SUPER_ADMIN_LOG_TEMPLATES_PATH,
    icon: "log-templates",
  },
] as const;

export type SuperAdminSectionId = (typeof SUPER_ADMIN_SECTIONS)[number]["id"];

function SectionIcon({ name }: Readonly<{ name: (typeof SUPER_ADMIN_SECTIONS)[number]["icon"] }>) {
  const icons: Record<(typeof SUPER_ADMIN_SECTIONS)[number]["icon"], ReactNode> = {
    users: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <circle cx="9" cy="8" r="3.5" stroke="currentColor" strokeWidth="1.5" />
        <path
          d="M3.5 19c0-2.8 2.5-5 5.5-5s5.5 2.2 5.5 5"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
        <circle cx="17" cy="9" r="2.5" stroke="currentColor" strokeWidth="1.5" />
        <path
          d="M20.5 19c0-2.1-1.6-3.8-3.5-4.3"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      </svg>
    ),
    "log-configurations": (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path
          d="M4 6h16M7 12h10M10 18h4"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
        <circle cx="6" cy="6" r="1.5" fill="currentColor" />
        <circle cx="6" cy="12" r="1.5" fill="currentColor" />
        <circle cx="6" cy="18" r="1.5" fill="currentColor" />
      </svg>
    ),
    "log-templates": (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <rect x="4" y="3" width="16" height="18" rx="2" stroke="currentColor" strokeWidth="1.5" />
        <path d="M8 8h8M8 12h8M8 16h5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    ),
  };

  return <span className="settings-sidebar__icon">{icons[name]}</span>;
}

function CloseIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M6 6l12 12M18 6L6 18"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

function getSectionNavLabel(section: (typeof SUPER_ADMIN_SECTIONS)[number]) {
  return section.shortLabel;
}

function useMobileNavLabels() {
  const [useFullLabels, setUseFullLabels] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(max-width: 991px)");
    const update = () => setUseFullLabels(mediaQuery.matches);
    update();
    mediaQuery.addEventListener("change", update);
    return () => mediaQuery.removeEventListener("change", update);
  }, []);

  return useFullLabels;
}

type SuperAdminSidebarProps = Readonly<{
  activeSection: SuperAdminSectionId;
  mobileOpen?: boolean;
  onCloseMobile?: () => void;
}>;

export function SuperAdminSidebar({
  activeSection,
  mobileOpen = false,
  onCloseMobile,
}: SuperAdminSidebarProps) {
  const useFullLabels = useMobileNavLabels();

  return (
    <aside
      className={`settings-sidebar${mobileOpen ? " is-mobile-open" : ""}`}
      aria-label="Super admin navigation"
    >
      <div className="settings-sidebar__header">
        <p className="settings-sidebar__eyebrow">Super Admin</p>
        {onCloseMobile ? (
          <button
            type="button"
            className="settings-sidebar__close"
            aria-label="Close admin menu"
            onClick={onCloseMobile}
          >
            <CloseIcon />
          </button>
        ) : null}
      </div>

      <nav className="settings-sidebar__nav ui-scrollbar">
        <ul className="settings-sidebar__list">
          {SUPER_ADMIN_SECTIONS.map((section) => (
            <li key={section.id}>
              <Link
                href={section.href}
                className={`settings-sidebar__link${activeSection === section.id ? " is-active" : ""}`}
                aria-current={activeSection === section.id ? "page" : undefined}
                aria-label={section.label}
                onClick={() => onCloseMobile?.()}
              >
                <SectionIcon name={section.icon} />
                <span className="settings-sidebar__label" title={section.label}>
                  {useFullLabels ? section.label : getSectionNavLabel(section)}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </aside>
  );
}
