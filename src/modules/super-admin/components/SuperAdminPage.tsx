"use client";

import { Suspense, useState } from "react";
import { UsersSection } from "./UsersSection";
import { AdminLogConfigurationsSection } from "./AdminLogConfigurationsSection";
import { SuperAdminSidebar, type SuperAdminSectionId } from "./SuperAdminSidebar";

const SECTION_TITLES: Record<SuperAdminSectionId, string> = {
  users: "User Management",
  "log-configurations": "Log Configurations",
};

function HamburgerIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

type SuperAdminPageProps = Readonly<{
  section: SuperAdminSectionId;
}>;

export function SuperAdminPage({ section }: SuperAdminPageProps) {
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  return (
    <div className="settings-page">
      <div
        className={`settings-page__backdrop${mobileSidebarOpen ? " is-open" : ""}`}
        onClick={() => setMobileSidebarOpen(false)}
        aria-hidden="true"
      />

      <div className="settings-page__layout">
        <SuperAdminSidebar
          activeSection={section}
          mobileOpen={mobileSidebarOpen}
          onCloseMobile={() => setMobileSidebarOpen(false)}
        />

        <div className="settings-page__main">
          <header className="settings-page__header">
            <button
              type="button"
              className="settings-page__menu-btn"
              aria-label="Open admin menu"
              onClick={() => setMobileSidebarOpen(true)}
            >
              <HamburgerIcon />
            </button>
            <h1 className="settings-page__title">{SECTION_TITLES[section]}</h1>
          </header>

          <div className="settings-page__content">
            {section === "users" ? <UsersSection /> : null}
            {section === "log-configurations" ? (
              <Suspense fallback={<p>Loading log configurations…</p>}>
                <AdminLogConfigurationsSection />
              </Suspense>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
