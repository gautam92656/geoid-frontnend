"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Badge,
  Checkbox,
  ConfirmDialog,
  DataTable,
  EditIcon,
  PlusIcon,
  RefreshIcon,
  SortableColumnHeader,
  TableRowActionsMenu,
  TableSearch,
  TableToolbar,
  TrashIcon,
  UiButton,
  type ColumnDef,
  type ToolbarAction,
} from "@/shared/components/ui";
import { MAX_TABLE_PAGE_SIZE } from "@/shared/constants/pagination";
import { API_ERROR_MESSAGES, API_MESSAGES } from "@/shared/constants/apiMessages";
import { useTableSort } from "@/shared/hooks/useTableSort";
import { showApiError, showApiSuccess } from "@/shared/utils/apiToast";
import { ACTIVE_INACTIVE_TABS } from "../data/statusOptions";
import { useLogConfigurationOwnerUserId } from "../context/LogConfigurationOwnerContext";
import {
  deleteLogConfiguration,
  listLogConfigurations,
} from "../services/logConfigurationApi";
import type { LogConfiguration } from "../types/logConfiguration";
import { logConfigurationDetailPath } from "../utils/logConfigurationPaths";
import { AddLogConfigurationModal } from "./AddLogConfigurationModal";

const LOG_CONFIG_GRID = "40px minmax(240px, 1fr) minmax(100px, max-content) 48px";

type StatusTabId = (typeof ACTIVE_INACTIVE_TABS)[number]["id"];

type DeleteConfirmState =
  | { open: false }
  | { open: true; mode: "single"; configuration: LogConfiguration }
  | { open: true; mode: "bulk"; count: number };

function getLogConfigurationSortValue(config: LogConfiguration, field: string): string | number {
  switch (field) {
    case "name":
      return config.name;
    case "status":
      return config.status;
    default:
      return "";
  }
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

export function LogConfigurationsSection({
  detailBasePath = "/dashboard/settings/log-configurations",
}: Readonly<{
  detailBasePath?: string;
}> = {}) {
  const router = useRouter();
  const ownerUserId = useLogConfigurationOwnerUserId();
  const [configurations, setConfigurations] = useState<LogConfiguration[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState<StatusTabId>("active");
  const [search, setSearch] = useState("");
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<DeleteConfirmState>({ open: false });

  const getDetailPath = useCallback(
    (configurationId: string) =>
      logConfigurationDetailPath(configurationId, detailBasePath, ownerUserId),
    [detailBasePath, ownerUserId]
  );

  const loadConfigurations = useCallback(async () => {
    setLoading(true);
    try {
      const result = await listLogConfigurations(1, MAX_TABLE_PAGE_SIZE, { ownerUserId });
      setConfigurations(result.data);
    } catch (err) {
      showApiError(err, API_ERROR_MESSAGES.LOAD_LOG_CONFIGURATIONS);
    } finally {
      setLoading(false);
    }
  }, [ownerUserId]);

  useEffect(() => {
    void loadConfigurations();
  }, [loadConfigurations]);

  const filteredConfigurations = useMemo(() => {
    const query = search.trim().toLowerCase();
    return configurations.filter((config) => {
      if (config.status !== activeTab) return false;
      if (!query) return true;
      return config.name.toLowerCase().includes(query);
    });
  }, [activeTab, configurations, search]);

  const { sort, toggleSort, sortedData } = useTableSort(
    filteredConfigurations,
    getLogConfigurationSortValue,
    { field: "name", order: "asc" }
  );

  const existingConfigurationNames = useMemo(
    () => configurations.map((config) => config.name),
    [configurations]
  );

  const allSelected = sortedData.length > 0 && selectedIds.size === sortedData.length;
  const someSelected = selectedIds.size > 0 && !allSelected;

  const toggleAll = useCallback(() => {
    setSelectedIds((current) =>
      current.size === sortedData.length ? new Set() : new Set(sortedData.map((config) => config.id))
    );
  }, [sortedData]);

  const toggleOne = useCallback((id: string) => {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const openConfiguration = useCallback(
    (configuration: LogConfiguration) => {
      router.push(getDetailPath(configuration.id));
    },
    [getDetailPath, router]
  );

  const requestDeleteConfiguration = useCallback((configuration: LogConfiguration) => {
    setDeleteConfirm({ open: true, mode: "single", configuration });
  }, []);

  const requestDeleteSelected = useCallback(() => {
    if (selectedIds.size === 0) return;
    setDeleteConfirm({ open: true, mode: "bulk", count: selectedIds.size });
  }, [selectedIds.size]);

  const performDelete = useCallback(
    async (ids: string[]) => {
      if (ids.length === 0) return;

      setDeleting(true);
      try {
        const results = await Promise.all(
          ids.map((id) => deleteLogConfiguration(id, ownerUserId))
        );
        setConfigurations((current) => current.filter((config) => !ids.includes(config.id)));
        setSelectedIds(new Set());

        const message = results.find((result) => result.message)?.message;
        showApiSuccess(message, API_MESSAGES.LOG_CONFIGURATION_DELETED);
        setDeleteConfirm({ open: false });
      } catch (err) {
        showApiError(err, API_ERROR_MESSAGES.DELETE_LOG_CONFIGURATION);
      } finally {
        setDeleting(false);
      }
    },
    [ownerUserId]
  );

  const handleConfirmDelete = useCallback(async () => {
    if (!deleteConfirm.open) return;

    if (deleteConfirm.mode === "single") {
      await performDelete([deleteConfirm.configuration.id]);
      return;
    }

    await performDelete([...selectedIds]);
  }, [deleteConfirm, performDelete, selectedIds]);

  const handleRefresh = useCallback(() => {
    setSelectedIds(new Set());
    void loadConfigurations();
  }, [loadConfigurations]);

  const handleConfigurationCreated = useCallback(
    (configuration: LogConfiguration) => {
      setConfigurations((current) => [...current, configuration]);
      setActiveTab(configuration.status);
      setSelectedIds(new Set());
      router.push(getDetailPath(configuration.id));
    },
    [getDetailPath, router]
  );

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

  const columns: ColumnDef<LogConfiguration>[] = useMemo(
    () => [
      {
        id: "select",
        header: (
          <Checkbox
            checked={allSelected}
            indeterminate={someSelected}
            onChange={toggleAll}
            aria-label="Select all log configurations"
          />
        ),
        cell: (config) => (
          <Checkbox
            checked={selectedIds.has(config.id)}
            onChange={() => toggleOne(config.id)}
            aria-label={`Select ${config.name}`}
          />
        ),
        className: "data-table__col--checkbox",
      },
      {
        id: "name",
        header: (
          <ColumnHeader field="name" sortField={sort.field} sortOrder={sort.order} onSort={toggleSort}>
            Log Configuration Name
          </ColumnHeader>
        ),
        cell: (config) => (
          <Link
            href={getDetailPath(config.id)}
            className="data-table__link"
            onClick={(event) => event.stopPropagation()}
          >
            {config.name}
          </Link>
        ),
      },
      {
        id: "status",
        header: (
          <ColumnHeader field="status" sortField={sort.field} sortOrder={sort.order} onSort={toggleSort}>
            Status
          </ColumnHeader>
        ),
        cell: (config) => (
          <Badge variant={config.status === "active" ? "success" : "neutral"}>
            {config.status === "active" ? "Active" : "Inactive"}
          </Badge>
        ),
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
        cell: (config) => (
          <TableRowActionsMenu
            label={`Actions for ${config.name}`}
            actions={[
              {
                id: "open",
                label: "Manage",
                icon: <EditIcon />,
                onClick: () => openConfiguration(config),
              },
              {
                id: "delete",
                label: "Delete",
                icon: <TrashIcon />,
                tone: "danger",
                onClick: () => requestDeleteConfiguration(config),
              },
            ]}
          />
        ),
        className: "data-table__col--actions",
      },
    ],
    [
      allSelected,
      getDetailPath,
      openConfiguration,
      requestDeleteConfiguration,
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
      ? `Delete ${deleteConfirm.count} log configurations?`
      : "Delete log configuration?";

  const deleteDialogMessage =
    deleteConfirm.open && deleteConfirm.mode === "bulk"
      ? `This will permanently remove ${deleteConfirm.count} selected log configurations. This action cannot be undone.`
      : deleteConfirm.open
        ? `This will permanently remove "${deleteConfirm.configuration.name}". This action cannot be undone.`
        : "";

  return (
    <>
      <div className="settings-section">
        <div className="settings-section__card settings-log-config asset-card--table">
          <div className="settings-section__card-header">
            <div className="settings-section__card-copy">
              <h2 className="settings-section__card-title">Log Configurations</h2>
              <p className="settings-section__card-description">
                Customize how information is logged across projects and locations.
              </p>
            </div>
            <UiButton
              variant="primary"
              size="sm"
              onClick={() => setAddModalOpen(true)}
              disabled={loading}
            >
              <PlusIcon />
              Add Configuration
            </UiButton>
          </div>

          <div className="asset-card__toolbar settings-log-config__toolbar">
            <div className="asset-card__filters settings-log-config__filters">
              <div
                className="settings-log-config__tabs"
                role="tablist"
                aria-label="Log configuration status"
              >
                {ACTIVE_INACTIVE_TABS.map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    role="tab"
                    aria-selected={activeTab === tab.id}
                    className={`settings-log-config__tab${activeTab === tab.id ? " is-active" : ""}`}
                    onClick={() => {
                      setActiveTab(tab.id);
                      setSelectedIds(new Set());
                    }}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              <TableSearch
                value={search}
                onChange={setSearch}
                placeholder="Search log configurations…"
                ariaLabel="Search log configurations"
                disabled={loading}
              />
            </div>

            <TableToolbar actions={toolbarActions} />
          </div>

          <div className="asset-card__table-wrap">
            <DataTable
              columns={columns}
              data={sortedData}
              getRowId={(config) => config.id}
              gridTemplateColumns={LOG_CONFIG_GRID}
              emptyMessage={
                loading
                  ? "Loading log configurations…"
                  : search.trim()
                    ? "No log configurations match your search."
                    : `No ${activeTab} log configurations yet.`
              }
            />
          </div>
        </div>
      </div>

      <AddLogConfigurationModal
        open={addModalOpen}
        onClose={() => setAddModalOpen(false)}
        existingNames={existingConfigurationNames}
        onCreated={handleConfigurationCreated}
      />

      <ConfirmDialog
        open={deleteConfirm.open}
        title={deleteDialogTitle}
        message={deleteDialogMessage}
        confirmLabel="Delete"
        variant="danger"
        loading={deleting}
        onConfirm={() => void handleConfirmDelete()}
        onCancel={() => setDeleteConfirm({ open: false })}
      />
    </>
  );
}
