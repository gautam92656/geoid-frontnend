"use client";

import type { ReactNode } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  Badge,
  Checkbox,
  ConfirmDialog,
  DataTable,
  EditIcon,
  PlusIcon,
  RefreshIcon,
  SortableColumnHeader,
  TablePagination,
  TableRowActionsMenu,
  TableSearch,
  TableToolbar,
  TrashIcon,
  UiButton,
  ViewIcon,
  type ColumnDef,
  type ToolbarAction,
} from "@/shared/components/ui";
import { useTableSort } from "@/shared/hooks/useTableSort";
import { useDebouncedValue } from "@/shared/hooks/useDebouncedValue";
import { formatDisplayDate } from "@/shared/utils/formatDate";
import { API_ERROR_MESSAGES, API_MESSAGES } from "@/shared/constants/apiMessages";
import { showApiError, showApiSuccess } from "@/shared/utils/apiToast";
import { DEFAULT_TABLE_PAGE_SIZE, TABLE_PAGE_SIZE_OPTIONS } from "@/shared/constants/pagination";
import {
  createAdminUser,
  deleteAdminUser,
  formToCreateUserPayload,
  formToUpdateUserPayload,
  listAdminUsers,
  updateAdminUser,
} from "../services/adminUserApi";
import type { AdminUser, AdminUserFormState, UserRole } from "../types/user";
import { superAdminLogConfigurationsPath } from "../utils/paths";
import { AddUserModal } from "./AddUserModal";

const USER_GRID =
  "40px minmax(130px, 1fr) minmax(130px, 1fr) minmax(160px, 1.2fr) minmax(100px, 0.8fr) minmax(90px, 0.7fr) minmax(110px, 0.8fr) minmax(110px, 0.8fr) 48px";

const ROLE_TABS = [
  { id: "all", label: "All" },
  { id: "user", label: "Users" },
  { id: "super_admin", label: "Super Admins" },
] as const;

type RoleTabId = (typeof ROLE_TABS)[number]["id"];

type DeleteConfirmState =
  | { open: false }
  | { open: true; mode: "single"; user: AdminUser }
  | { open: true; mode: "bulk"; count: number };

function getUserSortValue(user: AdminUser, field: string): string | number {
  switch (field) {
    case "name":
      return `${user.firstName} ${user.lastName}`.trim();
    case "companyName":
      return user.companyName ?? "";
    case "email":
      return user.email;
    case "role":
      return user.role;
    case "isEmailVerified":
      return user.isEmailVerified ? 1 : 0;
    case "createdAt":
      return user.createdAt;
    case "updatedAt":
      return user.updatedAt;
    default:
      return "";
  }
}

function roleLabel(role: AdminUser["role"]) {
  return role === "super_admin" ? "Super Admin" : "User";
}

function ColumnHeader({
  children,
  field,
  sortField,
  sortOrder,
  onSort,
  sortable = true,
}: Readonly<{
  children: ReactNode;
  field: string;
  sortField: string | null;
  sortOrder: "asc" | "desc";
  onSort: (field: string) => void;
  sortable?: boolean;
}>) {
  return (
    <SortableColumnHeader
      field={field}
      activeField={sortField}
      activeOrder={sortOrder}
      onSort={onSort}
      sortable={sortable}
    >
      {children}
    </SortableColumnHeader>
  );
}

export function UsersSection() {
  const router = useRouter();
  const pathname = usePathname();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [search, setSearch] = useState("");
  const [roleTab, setRoleTab] = useState<RoleTabId>("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_TABLE_PAGE_SIZE);
  const [total, setTotal] = useState(0);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<AdminUser | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<DeleteConfirmState>({ open: false });
  const debouncedSearch = useDebouncedValue(search, 300);

  const loadUsers = useCallback(
    async (nextPage = page, nextPageSize = pageSize, nextRoleTab = roleTab) => {
      setLoading(true);
      try {
        const roleFilter: UserRole | undefined =
          nextRoleTab === "all" ? undefined : nextRoleTab;
        const result = await listAdminUsers(nextPage, nextPageSize, {
          search: debouncedSearch,
          role: roleFilter,
        });
        setUsers(result.data);
        setTotal(result.total);
        setPage(result.page);
        setPageSize(result.pageSize);
      } catch (err) {
        showApiError(err, API_ERROR_MESSAGES.LOAD_USERS);
      } finally {
        setLoading(false);
      }
    },
    [debouncedSearch, page, pageSize, roleTab]
  );

  useEffect(() => {
    setSelectedIds(new Set());
    void loadUsers(1, pageSize, roleTab);
  }, [debouncedSearch, roleTab]); // eslint-disable-line react-hooks/exhaustive-deps

  const { sort, toggleSort, sortedData } = useTableSort(users, getUserSortValue, {
    field: "createdAt",
    order: "desc",
  });

  const allSelected = sortedData.length > 0 && selectedIds.size === sortedData.length;
  const someSelected = selectedIds.size > 0 && !allSelected;

  const toggleAll = useCallback(() => {
    setSelectedIds((current) =>
      current.size === sortedData.length ? new Set() : new Set(sortedData.map((user) => user.id))
    );
  }, [sortedData]);

  const toggleOne = useCallback((id: number) => {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const openAddModal = useCallback(() => {
    setEditingUser(null);
    setModalOpen(true);
  }, []);

  const openEditModal = useCallback((user: AdminUser) => {
    setEditingUser(user);
    setModalOpen(true);
  }, []);

  const openUserConfigurations = useCallback(
    (user: AdminUser) => {
      const inSettings = pathname.startsWith("/dashboard/settings");
      const path = inSettings
        ? `/dashboard/settings/log-configurations?userId=${user.id}`
        : superAdminLogConfigurationsPath(user.id);
      router.push(path);
    },
    [pathname, router]
  );

  const closeModal = useCallback(() => {
    setModalOpen(false);
    setEditingUser(null);
  }, []);

  const handleCreateUser = useCallback(
    async (form: AdminUserFormState) => {
      setSubmitting(true);
      try {
        const { message } = await createAdminUser(await formToCreateUserPayload(form));
        setModalOpen(false);
        setEditingUser(null);
        setSelectedIds(new Set());
        await loadUsers(1, pageSize, roleTab);
        showApiSuccess(message, API_MESSAGES.USER_ADDED);
      } catch (err) {
        showApiError(err, API_ERROR_MESSAGES.ADD_USER);
        throw err;
      } finally {
        setSubmitting(false);
      }
    },
    [loadUsers, pageSize, roleTab]
  );

  const handleUpdateUser = useCallback(
    async (form: AdminUserFormState) => {
      if (!editingUser) return;

      setSubmitting(true);
      try {
        const { message } = await updateAdminUser(
          editingUser.id,
          await formToUpdateUserPayload(form)
        );
        setModalOpen(false);
        setEditingUser(null);
        await loadUsers(page, pageSize, roleTab);
        showApiSuccess(message, API_MESSAGES.USER_UPDATED);
      } catch (err) {
        showApiError(err, API_ERROR_MESSAGES.UPDATE_USER);
        throw err;
      } finally {
        setSubmitting(false);
      }
    },
    [editingUser, loadUsers, page, pageSize, roleTab]
  );

  const performDelete = useCallback(
    async (ids: number[]) => {
      if (ids.length === 0) return;

      setDeleting(true);
      try {
        const results = await Promise.all(ids.map((id) => deleteAdminUser(id)));
        setSelectedIds(new Set());

        const nextTotal = Math.max(0, total - ids.length);
        const nextTotalPages = Math.max(1, Math.ceil(nextTotal / pageSize));
        const nextPage = Math.min(page, nextTotalPages);
        await loadUsers(nextPage, pageSize, roleTab);

        const message = results.find((result) => result.message)?.message;
        showApiSuccess(
          message,
          ids.length === 1 ? API_MESSAGES.USER_DELETED : API_MESSAGES.USERS_DELETED
        );
        setDeleteConfirm({ open: false });
      } catch (err) {
        showApiError(err, API_ERROR_MESSAGES.DELETE_USERS);
      } finally {
        setDeleting(false);
      }
    },
    [loadUsers, page, pageSize, roleTab, total]
  );

  const requestDeleteUser = useCallback((user: AdminUser) => {
    setDeleteConfirm({ open: true, mode: "single", user });
  }, []);

  const requestDeleteSelected = useCallback(() => {
    if (selectedIds.size === 0) return;
    setDeleteConfirm({ open: true, mode: "bulk", count: selectedIds.size });
  }, [selectedIds.size]);

  const handleConfirmDelete = useCallback(async () => {
    if (!deleteConfirm.open) return;

    if (deleteConfirm.mode === "single") {
      await performDelete([deleteConfirm.user.id]);
      return;
    }

    await performDelete([...selectedIds]);
  }, [deleteConfirm, performDelete, selectedIds]);

  const handleRefresh = useCallback(() => {
    setSelectedIds(new Set());
    void loadUsers(page, pageSize, roleTab);
  }, [loadUsers, page, pageSize, roleTab]);

  const handleSearchChange = useCallback((value: string) => {
    setSearch(value);
  }, []);

  const toolbarActions: ToolbarAction[] = useMemo(
    () => [
      {
        id: "delete",
        label: "Delete",
        icon: <TrashIcon />,
        onClick: requestDeleteSelected,
        disabled: selectedIds.size === 0,
      },
      {
        id: "refresh",
        label: "Refresh",
        icon: <RefreshIcon />,
        onClick: handleRefresh,
      },
    ],
    [handleRefresh, requestDeleteSelected, selectedIds.size]
  );

  const columns: ColumnDef<AdminUser>[] = useMemo(
    () => [
      {
        id: "select",
        header: (
          <Checkbox
            checked={allSelected}
            indeterminate={someSelected}
            onChange={toggleAll}
            aria-label="Select all users"
          />
        ),
        cell: (user) => (
          <Checkbox
            checked={selectedIds.has(user.id)}
            onChange={() => toggleOne(user.id)}
            aria-label={`Select ${user.firstName} ${user.lastName}`}
          />
        ),
        className: "data-table__col--checkbox",
      },
      {
        id: "name",
        header: (
          <ColumnHeader field="name" sortField={sort.field} sortOrder={sort.order} onSort={toggleSort}>
            Name
          </ColumnHeader>
        ),
        cell: (user) => `${user.firstName} ${user.lastName}`.trim(),
      },
      {
        id: "company",
        header: (
          <ColumnHeader
            field="companyName"
            sortField={sort.field}
            sortOrder={sort.order}
            onSort={toggleSort}
          >
            Company
          </ColumnHeader>
        ),
        cell: (user) => user.companyName || "—",
      },
      {
        id: "email",
        header: (
          <ColumnHeader field="email" sortField={sort.field} sortOrder={sort.order} onSort={toggleSort}>
            Email
          </ColumnHeader>
        ),
        cell: (user) => user.email,
      },
      {
        id: "role",
        header: (
          <ColumnHeader field="role" sortField={sort.field} sortOrder={sort.order} onSort={toggleSort}>
            Role
          </ColumnHeader>
        ),
        cell: (user) => (
          <Badge variant={user.role === "super_admin" ? "warning" : "neutral"}>
            {roleLabel(user.role)}
          </Badge>
        ),
      },
      {
        id: "verified",
        header: (
          <ColumnHeader
            field="isEmailVerified"
            sortField={sort.field}
            sortOrder={sort.order}
            onSort={toggleSort}
          >
            Verified
          </ColumnHeader>
        ),
        cell: (user) => (
          <Badge variant={user.isEmailVerified ? "success" : "warning"}>
            {user.isEmailVerified ? "Verified" : "Pending"}
          </Badge>
        ),
      },
      {
        id: "createdAt",
        header: (
          <ColumnHeader
            field="createdAt"
            sortField={sort.field}
            sortOrder={sort.order}
            onSort={toggleSort}
          >
            Created
          </ColumnHeader>
        ),
        cell: (user) => formatDisplayDate(user.createdAt),
      },
      {
        id: "updatedAt",
        header: (
          <ColumnHeader
            field="updatedAt"
            sortField={sort.field}
            sortOrder={sort.order}
            onSort={toggleSort}
          >
            Updated
          </ColumnHeader>
        ),
        cell: (user) => formatDisplayDate(user.updatedAt),
      },
      {
        id: "actions",
        header: (
          <ColumnHeader
            field="actions"
            sortField={sort.field}
            sortOrder={sort.order}
            onSort={toggleSort}
            sortable={false}
          >
            Actions
          </ColumnHeader>
        ),
        cell: (user) => {
          const actions = [
            ...(user.role === "user"
              ? [
                  {
                    id: "view",
                    label: "View",
                    icon: <ViewIcon />,
                    onClick: () => openUserConfigurations(user),
                  },
                ]
              : []),
            {
              id: "edit",
              label: "Edit",
              icon: <EditIcon />,
              onClick: () => openEditModal(user),
            },
            {
              id: "delete",
              label: "Delete",
              icon: <TrashIcon />,
              tone: "danger" as const,
              onClick: () => requestDeleteUser(user),
            },
          ];

          return (
            <TableRowActionsMenu
              label={`Actions for ${user.firstName} ${user.lastName}`}
              actions={actions}
            />
          );
        },
        className: "data-table__col--actions",
      },
    ],
    [
      allSelected,
      openEditModal,
      openUserConfigurations,
      requestDeleteUser,
      selectedIds,
      someSelected,
      sort.field,
      sort.order,
      toggleAll,
      toggleOne,
      toggleSort,
    ]
  );

  const deleteDialogTitle =
    deleteConfirm.open && deleteConfirm.mode === "bulk"
      ? `Delete ${deleteConfirm.count} users?`
      : "Delete user?";

  const deleteDialogMessage =
    deleteConfirm.open && deleteConfirm.mode === "bulk"
      ? `This will permanently remove ${deleteConfirm.count} selected users. This action cannot be undone.`
      : deleteConfirm.open
        ? `This will permanently remove "${deleteConfirm.user.firstName} ${deleteConfirm.user.lastName}". This action cannot be undone.`
        : "";

  return (
    <>
      <div className="settings-section">
        <div className="settings-section__card settings-log-config asset-card--table">
          <div className="settings-section__card-header">
            <div className="settings-section__card-copy">
              <h2 className="settings-section__card-title">Users</h2>
              <p className="settings-section__card-description">
                Create, edit, and manage platform users and super admin access.
              </p>
            </div>
            <UiButton variant="primary" size="sm" onClick={openAddModal} disabled={loading}>
              <PlusIcon />
              Add User
            </UiButton>
          </div>

          <div
            className="settings-section__tabs"
            role="tablist"
            aria-label="User roles"
          >
            {ROLE_TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={roleTab === tab.id}
                className={`settings-section__tab${roleTab === tab.id ? " is-active" : ""}`}
                onClick={() => {
                  setRoleTab(tab.id);
                  setSelectedIds(new Set());
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="asset-card__toolbar settings-log-config__toolbar">
            <div className="asset-card__filters settings-log-config__filters">
              <TableSearch
                value={search}
                onChange={handleSearchChange}
                placeholder="Search users…"
                ariaLabel="Search users"
                disabled={loading}
              />
            </div>
            <TableToolbar actions={toolbarActions} />
            {selectedIds.size > 0 ? (
              <span className="asset-card__selection">{selectedIds.size} selected</span>
            ) : null}
          </div>

          <div className="asset-card__table-wrap ui-scrollbar">
            <DataTable
              columns={columns}
              data={sortedData}
              getRowId={(user) => String(user.id)}
              gridTemplateColumns={USER_GRID}
              emptyMessage={
                loading
                  ? "Loading users…"
                  : debouncedSearch || roleTab !== "all"
                    ? "No users match your filters."
                    : "No users yet. Add your first user to get started."
              }
            />
          </div>

          <TablePagination
            page={page}
            pageSize={pageSize}
            total={total}
            pageSizeOptions={TABLE_PAGE_SIZE_OPTIONS}
            onPageChange={(nextPage) => {
              setSelectedIds(new Set());
              void loadUsers(nextPage, pageSize, roleTab);
            }}
            onPageSizeChange={(nextPageSize) => {
              setSelectedIds(new Set());
              void loadUsers(1, nextPageSize, roleTab);
            }}
            loading={loading}
          />
        </div>
      </div>

      <AddUserModal
        open={modalOpen}
        onClose={closeModal}
        onSubmit={editingUser ? handleUpdateUser : handleCreateUser}
        users={users}
        editingUser={editingUser}
        submitting={submitting}
      />

      <ConfirmDialog
        open={deleteConfirm.open}
        title={deleteDialogTitle}
        message={deleteDialogMessage}
        confirmLabel="Delete"
        loading={deleting}
        variant="danger"
        onConfirm={() => void handleConfirmDelete()}
        onCancel={() => setDeleteConfirm({ open: false })}
      />
    </>
  );
}
