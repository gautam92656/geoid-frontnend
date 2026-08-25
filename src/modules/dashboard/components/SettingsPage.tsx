"use client";

import { Suspense, useState } from "react";
import { AdminLogConfigurationsSection } from "@/modules/super-admin/components/AdminLogConfigurationsSection";
import { AdminHeaderFooterTemplatesSection } from "@/modules/super-admin/components/AdminHeaderFooterTemplatesSection";
import { UsersSection } from "@/modules/super-admin/components/UsersSection";
import { useAppSelector } from "@/store/hooks";
import { AccountSettingsSection } from "./AccountSettingsSection";
import { SettingsSidebar, type SettingsSectionId } from "./SettingsSidebar";

const SECTION_TITLES: Record<SettingsSectionId, string> = {
  account: "Account",
  "user-management": "User Management",
  "log-configurations": "Log Configurations",
  "header-footer-templates": "Header & Footer Templates",
};

function HamburgerIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

type SettingsPageProps = Readonly<{
  section: SettingsSectionId;
}>;

export function SettingsPage({ section }: SettingsPageProps) {
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const isSuperAdmin = useAppSelector((state) => state.auth.user?.role === "super_admin");
  const canViewSection = isSuperAdmin || section === "account";

  return (
    <div className="settings-page">
      <div
        className={`settings-page__backdrop${mobileSidebarOpen ? " is-open" : ""}`}
        onClick={() => setMobileSidebarOpen(false)}
        aria-hidden="true"
      />

      <div className="settings-page__layout">
        <SettingsSidebar
          activeSection={section}
          mobileOpen={mobileSidebarOpen}
          onCloseMobile={() => setMobileSidebarOpen(false)}
        />

        <div className="settings-page__main">
          <header className="settings-page__header">
            <button
              type="button"
              className="settings-page__menu-btn"
              aria-label="Open settings menu"
              onClick={() => setMobileSidebarOpen(true)}
            >
              <HamburgerIcon />
            </button>
            <h1 className="settings-page__title">{SECTION_TITLES[section]}</h1>
          </header>

          <div className="settings-page__content">
            {section === "account" ? <AccountSettingsSection /> : null}
            {isSuperAdmin && section === "user-management" ? <UsersSection /> : null}
            {isSuperAdmin && section === "log-configurations" ? (
              <Suspense fallback={<p>Loading log configurations…</p>}>
                <AdminLogConfigurationsSection
                  detailBasePath="/dashboard/settings/log-configurations"
                  usersListPath="/dashboard/settings/user-management"
                />
              </Suspense>
            ) : null}
            {isSuperAdmin && section === "header-footer-templates" ? (
              <Suspense fallback={<p>Loading header &amp; footer templates…</p>}>
                <AdminHeaderFooterTemplatesSection
                  listBasePath="/dashboard/settings/header-footer-templates"
                  builderBasePath="/dashboard/settings/header-footer-templates"
                  usersListPath="/dashboard/settings/user-management"
                />
              </Suspense>
            ) : null}
            {!canViewSection ? <p>You do not have access to this settings section.</p> : null}
          </div>
        </div>
      </div>
    </div>
  );
}
