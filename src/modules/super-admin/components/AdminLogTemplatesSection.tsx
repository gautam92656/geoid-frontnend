"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { FormField, Select } from "@/shared/components/ui";
import { MAX_TABLE_PAGE_SIZE } from "@/shared/constants/pagination";
import { API_ERROR_MESSAGES } from "@/shared/constants/apiMessages";
import { showApiError } from "@/shared/utils/apiToast";
import { HeaderFooterTemplatesSection } from "@/modules/dashboard/components/HeaderFooterTemplatesSection";
import { LogReportTemplatesSection } from "@/modules/dashboard/components/LogReportTemplatesSection";
import { OwnerUserIdProvider } from "@/modules/dashboard/context/LogConfigurationOwnerContext";
import { getAdminUser, listAdminUsers } from "../services/adminUserApi";
import type { AdminUser } from "../types/user";
import {
  SUPER_ADMIN_LOG_TEMPLATES_PATH,
  SUPER_ADMIN_USERS_PATH,
  superAdminHeaderFooterTemplatesPath,
  superAdminLogReportTemplatesPath,
  superAdminLogTemplatesPath,
} from "../utils/paths";

function userLabel(user: AdminUser): string {
  const name = `${user.firstName} ${user.lastName}`.trim();
  const company = user.companyName?.trim();
  const role = user.role === "super_admin" ? "Super Admin" : null;
  const base = company ? `${name} — ${company}` : `${name} (${user.email})`;
  return role ? `${base} · ${role}` : base;
}

function parseUserId(value: string | null): number | null {
  if (!value) return null;
  const id = Number.parseInt(value, 10);
  return Number.isFinite(id) && id > 0 ? id : null;
}

type TemplateTab = "log-report" | "header-footer";

export function AdminLogTemplatesSection() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const selectedUserId = parseUserId(searchParams.get("userId"));
  const tabParam = searchParams.get("tab");
  const activeTab: TemplateTab =
    tabParam === "header-footer" ? "header-footer" : "log-report";

  const [users, setUsers] = useState<AdminUser[]>([]);
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [loadingSelectedUser, setLoadingSelectedUser] = useState(false);

  const loadUsers = useCallback(async () => {
    setLoadingUsers(true);
    try {
      const result = await listAdminUsers(1, MAX_TABLE_PAGE_SIZE);
      setUsers(result.data);
    } catch (err) {
      showApiError(err, API_ERROR_MESSAGES.LOAD_USERS);
    } finally {
      setLoadingUsers(false);
    }
  }, []);

  useEffect(() => {
    void loadUsers();
  }, [loadUsers]);

  useEffect(() => {
    if (selectedUserId == null) {
      setSelectedUser(null);
      return;
    }

    let cancelled = false;
    setLoadingSelectedUser(true);

    void (async () => {
      try {
        const fromList = users.find((user) => user.id === selectedUserId);
        if (fromList) {
          if (!cancelled) setSelectedUser(fromList);
          return;
        }
        const user = await getAdminUser(selectedUserId);
        if (!cancelled) setSelectedUser(user);
      } catch (err) {
        if (!cancelled) {
          setSelectedUser(null);
          showApiError(err, API_ERROR_MESSAGES.LOAD_USERS);
          router.replace(SUPER_ADMIN_USERS_PATH);
        }
      } finally {
        if (!cancelled) setLoadingSelectedUser(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [router, selectedUserId, users]);

  const userOptions = useMemo(
    () =>
      users.map((user) => ({
        value: String(user.id),
        label: userLabel(user),
      })),
    [users]
  );

  const selectedUserName = selectedUser
    ? `${selectedUser.firstName} ${selectedUser.lastName}`.trim()
    : null;

  const setTab = (tab: TemplateTab) => {
    if (selectedUserId == null) return;
    router.replace(superAdminLogTemplatesPath(selectedUserId, tab));
  };

  return (
    <div className="admin-log-configurations">
      <div className="settings-section">
        <div className="settings-section__card admin-log-configurations__user-card">
          <div className="settings-section__card-header">
            <div className="settings-section__card-copy">
              <h2 className="settings-section__card-title">
                {selectedUserName
                  ? `Log templates · ${selectedUserName}`
                  : "Log templates"}
              </h2>
              <p className="settings-section__card-description">
                Manage each user&apos;s log report layouts and header / footer templates.
              </p>
            </div>
          </div>

          <div className="admin-log-configurations__user-field">
            <FormField label="User">
              <Select
                value={selectedUserId != null ? String(selectedUserId) : ""}
                onChange={(value) => {
                  const nextId = parseUserId(value);
                  router.replace(
                    nextId != null
                      ? superAdminLogTemplatesPath(nextId, activeTab)
                      : SUPER_ADMIN_LOG_TEMPLATES_PATH
                  );
                }}
                options={userOptions}
                placeholder={loadingUsers ? "Loading users…" : "Select a user"}
                search
                searchPlaceholder="Search users…"
                disabled={loadingUsers || userOptions.length === 0}
              />
            </FormField>
            {selectedUser ? (
              <p className="admin-log-configurations__user-meta">
                {selectedUser.email}
                {selectedUser.companyName ? ` · ${selectedUser.companyName}` : ""}
              </p>
            ) : null}
            {!selectedUserId ? (
              <p className="admin-log-configurations__empty">
                Select a user above, or open <strong>Templates</strong> from User Management.
              </p>
            ) : null}
          </div>

          {selectedUserId != null ? (
            <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
              <button
                type="button"
                className={`settings-sidebar__link${activeTab === "log-report" ? " is-active" : ""}`}
                onClick={() => setTab("log-report")}
              >
                Log report templates
              </button>
              <button
                type="button"
                className={`settings-sidebar__link${activeTab === "header-footer" ? " is-active" : ""}`}
                onClick={() => setTab("header-footer")}
              >
                Header &amp; footer
              </button>
            </div>
          ) : null}
        </div>
      </div>

      {selectedUserId != null && selectedUser ? (
        <OwnerUserIdProvider value={selectedUserId}>
          {activeTab === "log-report" ? (
            <LogReportTemplatesSection
              builderBasePath={superAdminLogReportTemplatesPath()}
            />
          ) : (
            <HeaderFooterTemplatesSection
              builderBasePath={superAdminHeaderFooterTemplatesPath()}
            />
          )}
        </OwnerUserIdProvider>
      ) : selectedUserId != null && loadingSelectedUser ? (
        <p className="admin-log-configurations__empty">Loading user templates…</p>
      ) : null}
    </div>
  );
}
