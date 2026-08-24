"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { FormField, Select } from "@/shared/components/ui";
import { MAX_TABLE_PAGE_SIZE } from "@/shared/constants/pagination";
import { API_ERROR_MESSAGES } from "@/shared/constants/apiMessages";
import { showApiError } from "@/shared/utils/apiToast";
import { HeaderFooterTemplatesSection } from "@/modules/dashboard/components/HeaderFooterTemplatesSection";
import { OwnerUserIdProvider } from "@/modules/dashboard/context/LogConfigurationOwnerContext";
import { getAdminUser, listAdminUsers } from "../services/adminUserApi";
import type { AdminUser } from "../types/user";
import { SUPER_ADMIN_USERS_PATH } from "../utils/paths";

const SETTINGS_HEADER_FOOTER_PATH = "/dashboard/settings/header-footer-templates";

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

function withUserId(basePath: string, ownerUserId: number): string {
  const separator = basePath.includes("?") ? "&" : "?";
  return `${basePath}${separator}userId=${ownerUserId}`;
}

type AdminHeaderFooterTemplatesSectionProps = Readonly<{
  listBasePath?: string;
  builderBasePath?: string;
  usersListPath?: string;
}>;

export function AdminHeaderFooterTemplatesSection({
  listBasePath = SETTINGS_HEADER_FOOTER_PATH,
  builderBasePath = SETTINGS_HEADER_FOOTER_PATH,
  usersListPath = SUPER_ADMIN_USERS_PATH,
}: AdminHeaderFooterTemplatesSectionProps = {}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const selectedUserId = parseUserId(searchParams.get("userId"));

  const [users, setUsers] = useState<AdminUser[]>([]);
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [loadingSelectedUser, setLoadingSelectedUser] = useState(false);

  const pathForUser = useCallback(
    (userId: number) => withUserId(listBasePath, userId),
    [listBasePath]
  );

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
          router.replace(usersListPath);
        }
      } finally {
        if (!cancelled) setLoadingSelectedUser(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [router, selectedUserId, users, usersListPath]);

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

  return (
    <div className="admin-log-configurations">
      <div className="settings-section">
        <div className="settings-section__card admin-log-configurations__user-card">
          <div className="settings-section__card-header">
            <div className="settings-section__card-copy">
              <h2 className="settings-section__card-title">
                {selectedUserName
                  ? `Header & footer templates · ${selectedUserName}`
                  : "Header & footer templates"}
              </h2>
              <p className="settings-section__card-description">
                Choose a user, then manage that user&apos;s header and footer report templates.
              </p>
            </div>
          </div>

          <div className="admin-log-configurations__user-field">
            <FormField label="User">
              <Select
                value={selectedUserId != null ? String(selectedUserId) : ""}
                onChange={(value) => {
                  const nextId = parseUserId(value);
                  router.replace(nextId != null ? pathForUser(nextId) : listBasePath);
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
            {!loadingUsers && users.length === 0 ? (
              <p className="admin-log-configurations__empty">
                No users found. Create a user first, then manage their templates.
              </p>
            ) : null}
            {!selectedUserId ? (
              <p className="admin-log-configurations__empty">
                Select a user above to view and edit their header &amp; footer templates.
              </p>
            ) : null}
          </div>
        </div>
      </div>

      {selectedUserId != null && selectedUser ? (
        <OwnerUserIdProvider value={selectedUserId}>
          <HeaderFooterTemplatesSection builderBasePath={builderBasePath} />
        </OwnerUserIdProvider>
      ) : selectedUserId != null && loadingSelectedUser ? (
        <p className="admin-log-configurations__empty">Loading user templates…</p>
      ) : null}
    </div>
  );
}
