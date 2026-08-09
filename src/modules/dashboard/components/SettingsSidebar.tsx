"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { useEffect, useState } from "react";

export const SETTINGS_SECTIONS = [
  {
    id: "account",
    label: "Account",
    href: "/dashboard/settings/account",
    icon: "account",
  },
  {
    id: "user-management",
    label: "User Management",
    shortLabel: "Users",
    href: "/dashboard/settings/user-management",
    icon: "user-management",
  },
  {
    id: "log-configurations",
    label: "Log Configurations",
    href: "/dashboard/settings/log-configurations",
    icon: "log-configurations",
  },
  {
    id: "header-footer-templates",
    label: "Header & Footer Templates",
    shortLabel: "Header/Footer",
    href: "/dashboard/settings/header-footer-templates",
    icon: "header-footer-templates",
  },
] as const;

export type SettingsSectionId = (typeof SETTINGS_SECTIONS)[number]["id"];

function SettingsIcon({ name }: Readonly<{ name: (typeof SETTINGS_SECTIONS)[number]["icon"] }>) {
  const icons: Record<(typeof SETTINGS_SECTIONS)[number]["icon"], ReactNode> = {
    account: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <circle cx="12" cy="8" r="3.5" stroke="currentColor" strokeWidth="1.5" />
        <path
          d="M5 19c0-3.314 3.134-6 7-6s7 2.686 7 6"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      </svg>
    ),
    "user-management": (
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
    "header-footer-templates": (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <rect x="3" y="4" width="18" height="16" rx="2" stroke="currentColor" strokeWidth="1.5" />
        <path d="M3 9h18M3 15h18" stroke="currentColor" strokeWidth="1.5" />
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

function getSectionNavLabel(section: (typeof SETTINGS_SECTIONS)[number]) {
  return "shortLabel" in section ? section.shortLabel : section.label;
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

type SettingsSidebarProps = Readonly<{
  activeSection: SettingsSectionId;
  mobileOpen?: boolean;
  onCloseMobile?: () => void;
}>;

export function SettingsSidebar({ activeSection, mobileOpen = false, onCloseMobile }: SettingsSidebarProps) {
  const useFullLabels = useMobileNavLabels();

  return (
    <aside
      className={`settings-sidebar${mobileOpen ? " is-mobile-open" : ""}`}
      aria-label="Settings navigation"
    >
      <div className="settings-sidebar__header">
        <p className="settings-sidebar__eyebrow">Settings</p>
        {onCloseMobile ? (
          <button
            type="button"
            className="settings-sidebar__close"
            aria-label="Close settings menu"
            onClick={onCloseMobile}
          >
            <CloseIcon />
          </button>
        ) : null}
      </div>

      <nav className="settings-sidebar__nav ui-scrollbar">
        <ul className="settings-sidebar__list">
          {SETTINGS_SECTIONS.map((section) => (
            <li key={section.id}>
              <Link
                href={section.href}
                className={`settings-sidebar__link${activeSection === section.id ? " is-active" : ""}`}
                aria-current={activeSection === section.id ? "page" : undefined}
                aria-label={section.label}
                onClick={() => onCloseMobile?.()}
              >
                <SettingsIcon name={section.icon} />
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
