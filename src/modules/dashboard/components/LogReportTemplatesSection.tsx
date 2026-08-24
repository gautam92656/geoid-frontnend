"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ConfirmDialog,
  DataTable,
  EditIcon,
  PlusIcon,
  RefreshIcon,
  TableRowActionsMenu,
  TableToolbar,
  TrashIcon,
  UiButton,
  type ColumnDef,
  type ToolbarAction,
} from "@/shared/components/ui";
import { API_ERROR_MESSAGES, API_MESSAGES } from "@/shared/constants/apiMessages";
import { showApiError, showApiSuccess } from "@/shared/utils/apiToast";
import { useOwnerUserId } from "../context/LogConfigurationOwnerContext";
import {
  createLogTemplate,
  deleteLogTemplate,
  listLogTemplates,
  updateLogTemplate,
} from "../services/logTemplateApi";
import type { LogTemplateLogType, LogTemplateRecord } from "../types/logTemplate";

const DEFAULT_BUILDER_BASE_PATH = "/dashboard/settings/log-report-templates";
const GRID = "minmax(200px, 1.6fr) minmax(100px, 0.7fr) 72px 48px";

type LogReportTemplatesSectionProps = Readonly<{
  builderBasePath?: string;
}>;

type DeleteConfirmState =
  | { open: false }
  | { open: true; mode: "single"; template: LogTemplateRecord }
  | { open: true; mode: "bulk"; count: number };

function StarIcon({ filled }: { filled: boolean }) {
  if (filled) {
    return (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
      </svg>
    );
  }
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function LogReportTemplatesSection({
  builderBasePath = DEFAULT_BUILDER_BASE_PATH,
}: LogReportTemplatesSectionProps = {}) {
  const router = useRouter();
  const ownerUserId = useOwnerUserId();
  const [templates, setTemplates] = useState<LogTemplateRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [creating, setCreating] = useState(false);
  const [logTypeFilter, setLogTypeFilter] = useState<"all" | LogTemplateLogType>("all");
  const [deleteConfirm, setDeleteConfirm] = useState<DeleteConfirmState>({ open: false });

  const withOwnerQuery = useCallback(
    (path: string) => {
      if (ownerUserId == null) return path;
      const separator = path.includes("?") ? "&" : "?";
      return `${path}${separator}userId=${ownerUserId}`;
    },
    [ownerUserId]
  );

  const loadTemplates = useCallback(async () => {
    setLoading(true);
    try {
      const list = await listLogTemplates(ownerUserId);
      setTemplates([...list.borelog, ...list.corelog]);
    } catch (err) {
      showApiError(err, API_ERROR_MESSAGES.LOAD_LOG_REPORT_TEMPLATES);
    } finally {
      setLoading(false);
    }
  }, [ownerUserId]);

  useEffect(() => {
    void loadTemplates();
  }, [loadTemplates]);

  const filtered = useMemo(() => {
    if (logTypeFilter === "all") return templates;
    return templates.filter((template) => template.logType === logTypeFilter);
  }, [logTypeFilter, templates]);

  const openBuilder = useCallback(
    (templateId: string) => {
      router.push(withOwnerQuery(`${builderBasePath}/${templateId}/builder`));
    },
    [builderBasePath, router, withOwnerQuery]
  );

  const handleCreate = useCallback(
    async (logType: LogTemplateLogType) => {
      setCreating(true);
      try {
        const { data, message } = await createLogTemplate(
          {
            name: logType === "corelog" ? "Corelog Template" : "Borelog Template",
            logType,
          },
          ownerUserId
        );
        showApiSuccess(message, API_MESSAGES.LOG_REPORT_TEMPLATE_ADDED);
        openBuilder(String(data.id));
      } catch (err) {
        showApiError(err, API_ERROR_MESSAGES.ADD_LOG_REPORT_TEMPLATE);
      } finally {
        setCreating(false);
      }
    },
    [openBuilder, ownerUserId]
  );

  const toggleDefault = useCallback(
    async (template: LogTemplateRecord) => {
      try {
        const { data, message } = await updateLogTemplate(
          String(template.id),
          { isDefault: !template.isDefault },
          ownerUserId
        );
        setTemplates((current) =>
          current.map((entry) => {
            if (String(entry.id) === String(data.id)) return data;
            if (entry.logType === data.logType && data.isDefault) {
              return { ...entry, isDefault: false };
            }
            return entry;
          })
        );
        showApiSuccess(message, API_MESSAGES.LOG_REPORT_TEMPLATE_UPDATED);
      } catch (err) {
        showApiError(err, API_ERROR_MESSAGES.UPDATE_LOG_REPORT_TEMPLATE);
      }
    },
    [ownerUserId]
  );

  const performDelete = useCallback(
    async (ids: string[]) => {
      if (ids.length === 0) return;
      setDeleting(true);
      try {
        await Promise.all(ids.map((id) => deleteLogTemplate(id, ownerUserId)));
        setTemplates((current) => current.filter((template) => !ids.includes(String(template.id))));
        showApiSuccess(
          undefined,
          ids.length > 1
            ? API_MESSAGES.LOG_REPORT_TEMPLATES_DELETED
            : API_MESSAGES.LOG_REPORT_TEMPLATE_DELETED
        );
        setDeleteConfirm({ open: false });
      } catch (err) {
        showApiError(err, API_ERROR_MESSAGES.DELETE_LOG_REPORT_TEMPLATE);
      } finally {
        setDeleting(false);
      }
    },
    [ownerUserId]
  );

  const toolbarActions: ToolbarAction[] = useMemo(
    () => [
      {
        id: "refresh",
        label: "Refresh",
        icon: <RefreshIcon />,
        onClick: () => {
          void loadTemplates();
        },
      },
    ],
    [loadTemplates]
  );

  const columns: ColumnDef<LogTemplateRecord>[] = useMemo(
    () => [
      {
        id: "name",
        header: "Name",
        cell: (template) => (
          <button
            type="button"
            className="data-table__link"
            onClick={() => openBuilder(String(template.id))}
          >
            {template.name}
          </button>
        ),
      },
      {
        id: "logType",
        header: "Type",
        cell: (template) => (template.logType === "corelog" ? "Corelog" : "Borelog"),
      },
      {
        id: "default",
        header: "Default",
        cell: (template) => (
          <button
            type="button"
            className="ui-button ui-button--ghost ui-button--sm"
            title={template.isDefault ? "Unset default" : "Set as default"}
            onClick={() => void toggleDefault(template)}
          >
            <StarIcon filled={template.isDefault} />
          </button>
        ),
      },
      {
        id: "actions",
        header: "Actions",
        cell: (template) => (
          <TableRowActionsMenu
            label={`Actions for ${template.name}`}
            actions={[
              {
                id: "edit",
                label: "Edit layout",
                icon: <EditIcon />,
                onClick: () => openBuilder(String(template.id)),
              },
              {
                id: "delete",
                label: "Delete",
                icon: <TrashIcon />,
                tone: "danger",
                onClick: () => setDeleteConfirm({ open: true, mode: "single", template }),
              },
            ]}
          />
        ),
      },
    ],
    [openBuilder, toggleDefault]
  );

  return (
    <div className="settings-section">
      <div className="settings-section__card">
        <div className="settings-section__card-header">
          <div className="settings-section__card-copy">
            <h2 className="settings-section__card-title">Log report templates</h2>
            <p className="settings-section__card-description">
              Column layouts used when generating this user&apos;s borelog / corelog PDF reports.
            </p>
          </div>
          <div className="settings-section__card-actions" style={{ display: "flex", gap: 8 }}>
            <UiButton
              type="button"
              variant="outline"
              size="sm"
              disabled={creating}
              onClick={() => void handleCreate("borelog")}
            >
              <PlusIcon /> Borelog
            </UiButton>
            <UiButton
              type="button"
              variant="outline"
              size="sm"
              disabled={creating}
              onClick={() => void handleCreate("corelog")}
            >
              <PlusIcon /> Corelog
            </UiButton>
          </div>
        </div>

        <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
          {(["all", "borelog", "corelog"] as const).map((value) => (
            <UiButton
              key={value}
              type="button"
              size="sm"
              variant={logTypeFilter === value ? "secondary" : "outline"}
              onClick={() => setLogTypeFilter(value)}
            >
              {value === "all" ? "All" : value === "borelog" ? "Borelog" : "Corelog"}
            </UiButton>
          ))}
        </div>

        <TableToolbar actions={toolbarActions} />
        {loading ? (
          <p className="data-table__empty">Loading templates…</p>
        ) : (
          <DataTable
            columns={columns}
            data={filtered}
            getRowId={(template) => String(template.id)}
            gridTemplateColumns={GRID}
            emptyMessage="No log report templates for this user yet."
          />
        )}
      </div>

      <ConfirmDialog
        open={deleteConfirm.open}
        title="Delete template?"
        message={
          deleteConfirm.open && deleteConfirm.mode === "single"
            ? `Delete “${deleteConfirm.template.name}”? This cannot be undone.`
            : ""
        }
        confirmLabel="Delete"
        loading={deleting}
        onCancel={() => setDeleteConfirm({ open: false })}
        onConfirm={() => {
          if (!deleteConfirm.open || deleteConfirm.mode !== "single") return;
          void performDelete([String(deleteConfirm.template.id)]);
        }}
      />
    </div>
  );
}
