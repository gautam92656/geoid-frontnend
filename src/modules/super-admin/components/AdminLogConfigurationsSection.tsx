"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormField, Select } from "@/shared/components/ui";
import { MAX_TABLE_PAGE_SIZE } from "@/shared/constants/pagination";
import { API_ERROR_MESSAGES } from "@/shared/constants/apiMessages";
import { showApiError } from "@/shared/utils/apiToast";
import { LogConfigurationsSection } from "@/modules/dashboard/components";
import { LogConfigurationOwnerProvider } from "@/modules/dashboard/context/LogConfigurationOwnerContext";
import { getAdminUser, listAdminUsers } from "../services/adminUserApi";
import type { AdminUser } from "../types/user";
import {
  SUPER_ADMIN_LOG_CONFIGURATIONS_PATH,
  SUPER_ADMIN_USERS_PATH,
  superAdminLogConfigurationsPath,
} from "../utils/paths";

function userLabel(user: AdminUser): string {
  const name = `${user.firstName} ${user.lastName}`.trim();
  const company = user.companyName?.trim();
  if (company) return `${name} — ${company}`;
  return `${name} (${user.email})`;
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

type AdminLogConfigurationsSectionProps = Readonly<{
  detailBasePath?: string;
  usersListPath?: string;
}>;

export function AdminLogConfigurationsSection({
  detailBasePath = SUPER_ADMIN_LOG_CONFIGURATIONS_PATH,
  usersListPath = SUPER_ADMIN_USERS_PATH,
}: AdminLogConfigurationsSectionProps = {}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const selectedUserId = parseUserId(searchParams.get("userId"));

  const [users, setUsers] = useState<AdminUser[]>([]);
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [loadingSelectedUser, setLoadingSelectedUser] = useState(false);

  const configsPathForUser = useCallback(
    (userId: number) =>
      detailBasePath === SUPER_ADMIN_LOG_CONFIGURATIONS_PATH
        ? superAdminLogConfigurationsPath(userId)
        : withUserId(detailBasePath, userId),
    [detailBasePath]
  );

  const loadUsers = useCallback(async () => {
    setLoadingUsers(true);
    try {
      const result = await listAdminUsers(1, MAX_TABLE_PAGE_SIZE, { role: "user" });
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
              {/* <Link href={usersListPath} className="admin-log-configurations__back">
                ← Back to users
              </Link> */}
              <h2 className="settings-section__card-title">
                {selectedUserName
                  ? `Log configurations · ${selectedUserName}`
                  : "Log configurations"}
              </h2>
              {/* <p className="settings-section__card-description">
                Each user has their own templates and modules. Choose a user, then manage their
                configurations.
              </p> */}
            </div>
          </div>

          <div className="admin-log-configurations__user-field">
            <FormField label="User">
              <Select
                value={selectedUserId != null ? String(selectedUserId) : ""}
                onChange={(value) => {
                  const nextId = parseUserId(value);
                  router.replace(
                    nextId != null ? configsPathForUser(nextId) : detailBasePath
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
            {!loadingUsers && users.length === 0 ? (
              <p className="admin-log-configurations__empty">
                No users found. Create a user first, then open View on that user to manage their
                configurations.
              </p>
            ) : null}
            {!selectedUserId ? (
              <p className="admin-log-configurations__empty">
                Select a user above, or open <strong>View</strong> from User Management actions.
              </p>
            ) : null}
          </div>
        </div>
      </div>

      {selectedUserId != null && selectedUser ? (
        <LogConfigurationOwnerProvider value={selectedUserId}>
          <LogConfigurationsSection detailBasePath={detailBasePath} />
        </LogConfigurationOwnerProvider>
      ) : selectedUserId != null && loadingSelectedUser ? (
        <p className="admin-log-configurations__empty">Loading user configurations…</p>
      ) : null}
    </div>
  );
}
