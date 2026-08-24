"use client";

import type { DragEvent } from "react";
import { useEffect, useId, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  Checkbox,
  FormField,
  Input,
  MultiSelect,
  ProjectModalPortal,
  Select,
  UiButton,
} from "@/shared/components/ui";
import { MAX_TABLE_PAGE_SIZE } from "@/shared/constants/pagination";
import { showApiError } from "@/shared/utils/apiToast";
import {
  LOG_REPORT_TEMPLATE_LOG_CONFIG_OPTIONS,
  formatLogReportTemplateDate,
  getLogConfigurationSummary,
  type LogReportTemplateLogType,
  type LogReportTemplateRecord,
} from "../data/logReportTemplates";
import { listHeaderFooterTemplates } from "../services/headerFooterTemplateApi";
import {
  listLogTemplates,
  reorderLogTemplates,
  updateLogTemplate,
} from "../services/logTemplateApi";
import type { HeaderFooterTemplate } from "../types/headerFooterTemplate";
import { useOwnerUserId } from "../context/LogConfigurationOwnerContext";
import { SUPER_ADMIN_LOG_TEMPLATES_PATH } from "@/modules/super-admin/utils/paths";

const DASHBOARD_BUILDER_BASE_PATH = "/dashboard/settings/log-report-templates";

type ManageLogReportTemplatesModalProps = Readonly<{
  open: boolean;
  disabled?: boolean;
  onClose: () => void;
}>;

type TabId = "logs" | "headers" | "footers";

const LOG_TYPE_FILTER_OPTIONS = [
  { value: "all", label: "All Types" },
  { value: "borelog", label: "Borelog" },
  { value: "corelog", label: "Corelog" },
] as const;

const TABS: Array<{ id: TabId; label: string }> = [
  { id: "logs", label: "Logs" },
  { id: "headers", label: "Headers" },
  { id: "footers", label: "Footers" },
];

function DragHandleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <circle cx="9" cy="7" r="1.5" />
      <circle cx="15" cy="7" r="1.5" />
      <circle cx="9" cy="12" r="1.5" />
      <circle cx="15" cy="12" r="1.5" />
      <circle cx="9" cy="17" r="1.5" />
      <circle cx="15" cy="17" r="1.5" />
    </svg>
  );
}

function StarIcon({ filled }: { filled: boolean }) {
  if (filled) {
    return (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
      </svg>
    );
  }
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function reportTypeLabel(reportType: HeaderFooterTemplate["reportType"]): string {
  if (reportType === "borelog") return "Borelog";
  if (reportType === "corelog") return "Corelog";
  return "All Types";
}

function reorderTemplates(
  templates: LogReportTemplateRecord[],
  sourceId: string,
  targetId: string
): LogReportTemplateRecord[] {
  if (sourceId === targetId) return templates;
  const sourceIndex = templates.findIndex((entry) => entry.id === sourceId);
  const targetIndex = templates.findIndex((entry) => entry.id === targetId);
  if (sourceIndex < 0 || targetIndex < 0) return templates;
  const next = [...templates];
  const [moved] = next.splice(sourceIndex, 1);
  next.splice(targetIndex, 0, moved);
  return next;
}

function HeaderFooterTable({
  title,
  description,
  rows,
  loading,
}: Readonly<{
  title: string;
  description: string;
  rows: HeaderFooterTemplate[];
  loading?: boolean;
}>) {
  return (
    <div className="log-report-templates-modal__section">
      <div className="log-report-templates-modal__section-header">
        <div>
          <h3 className="log-report-templates-modal__section-title">
            {title} <span className="log-report-templates-modal__count">({rows.length})</span>
          </h3>
          <p className="log-report-templates-modal__section-description">{description}</p>
        </div>
      </div>

      <div className="log-report-templates-modal__table-wrap">
        <table className="log-report-templates-modal__table">
          <thead>
            <tr>
              <th scope="col">Name</th>
              <th scope="col">Type</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={2} className="log-report-templates-modal__empty-cell">
                  Loading {title.toLowerCase()}…
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={2} className="log-report-templates-modal__empty-cell">
                  No {title.toLowerCase()} found.
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={row.id}>
                  <td>{row.name}</td>
                  <td>
                    {row.reportType ? (
                      <span
                        className={`log-report-templates-modal__log-type log-report-templates-modal__log-type--${row.reportType}`}
                      >
                        {reportTypeLabel(row.reportType)}
                      </span>
                    ) : (
                      reportTypeLabel(row.reportType)
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function ManageLogReportTemplatesModal({
  open,
  disabled,
  onClose,
}: ManageLogReportTemplatesModalProps) {
  const formId = useId();
  const router = useRouter();
  const pathname = usePathname();
  const ownerUserId = useOwnerUserId();
  const builderBasePath = pathname.startsWith("/super-admin")
    ? `${SUPER_ADMIN_LOG_TEMPLATES_PATH}/log-report-templates`
    : DASHBOARD_BUILDER_BASE_PATH;
  const [activeTab, setActiveTab] = useState<TabId>("logs");
  const [showDeleted, setShowDeleted] = useState(false);
  const [logTypeFilter, setLogTypeFilter] = useState<"all" | LogReportTemplateLogType>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [templates, setTemplates] = useState<LogReportTemplateRecord[]>([]);
  const [headers, setHeaders] = useState<HeaderFooterTemplate[]>([]);
  const [footers, setFooters] = useState<HeaderFooterTemplate[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.stopImmediatePropagation();
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown, true);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown, true);
    };
  }, [onClose, open]);

  useEffect(() => {
    if (!open) return;
    setActiveTab("logs");
    setShowDeleted(false);
    setLogTypeFilter("all");
    setSearchQuery("");
    setSelectedIds([]);
    setDraggingId(null);
    setDragOverId(null);
    setHeaders([]);
    setFooters([]);

    let cancelled = false;
    setLoading(true);
    void Promise.all([
      listLogTemplates(ownerUserId),
      listHeaderFooterTemplates(1, MAX_TABLE_PAGE_SIZE, {
        kind: "header",
        sortBy: "name",
        sortOrder: "asc",
        ownerUserId,
      }),
      listHeaderFooterTemplates(1, MAX_TABLE_PAGE_SIZE, {
        kind: "footer",
        sortBy: "name",
        sortOrder: "asc",
        ownerUserId,
      }),
    ])
      .then(([payload, headersPayload, footersPayload]) => {
        if (cancelled) return;
        setTemplates(
          [...payload.borelog, ...payload.corelog].map((template) => ({
            id: template.id,
            name: template.name,
            logType: template.logType,
            isDefault: template.isDefault,
            createdAt: template.createdAt,
            logConfigurationIds: [...template.logConfigurationIds],
          }))
        );
        setHeaders(headersPayload.data);
        setFooters(footersPayload.data);
      })
      .catch((error) => {
        showApiError(error, "Failed to load templates");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open, ownerUserId]);

  const openBuilder = (templateId: string) => {
    onClose();
    const query = ownerUserId != null ? `?userId=${ownerUserId}` : "";
    router.push(`${builderBasePath}/${templateId}/builder${query}`);
  };

  const filteredTemplates = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return templates.filter((template) => {
      if (logTypeFilter !== "all" && template.logType !== logTypeFilter) return false;
      if (!query) return true;
      return template.name.toLowerCase().includes(query);
    });
  }, [logTypeFilter, searchQuery, templates]);

  const allVisibleSelected =
    filteredTemplates.length > 0 &&
    filteredTemplates.every((template) => selectedIds.includes(template.id));

  const toggleSelectAllVisible = () => {
    if (allVisibleSelected) {
      const visibleIds = new Set(filteredTemplates.map((template) => template.id));
      setSelectedIds((current) => current.filter((id) => !visibleIds.has(id)));
      return;
    }
    setSelectedIds((current) => {
      const next = new Set(current);
      for (const template of filteredTemplates) next.add(template.id);
      return [...next];
    });
  };

  const toggleSelected = (id: string) => {
    setSelectedIds((current) =>
      current.includes(id) ? current.filter((entry) => entry !== id) : [...current, id]
    );
  };

  const setDefaultForLogType = (templateId: string, logType: LogReportTemplateLogType) => {
    setTemplates((current) =>
      current.map((template) => {
        if (template.logType !== logType) return template;
        return { ...template, isDefault: template.id === templateId };
      })
    );
    void updateLogTemplate(templateId, { isDefault: true, logType }, ownerUserId).catch(
      (error) => {
        showApiError(error, "Failed to set default template");
      }
    );
  };

  const updateLogConfigurations = (templateId: string, logConfigurationIds: string[]) => {
    setTemplates((current) =>
      current.map((template) =>
        template.id === templateId ? { ...template, logConfigurationIds } : template
      )
    );
    void updateLogTemplate(templateId, { logConfigurationIds }, ownerUserId).catch((error) => {
      showApiError(error, "Failed to update log configurations");
    });
  };

  const persistReorder = (next: LogReportTemplateRecord[]) => {
    setTemplates(next);
    void reorderLogTemplates(
      next.map((template) => template.id),
      ownerUserId
    ).catch((error) => {
      showApiError(error, "Failed to reorder templates");
    });
  };

  if (!open) return null;

  return (
    <ProjectModalPortal open={open}>
      <div className="project-modal project-modal--stacked" role="presentation">
        <button
          type="button"
          className="project-modal__backdrop"
          aria-label="Close manage templates dialog"
          onClick={onClose}
        />
        <div
          className="project-modal__dialog project-modal__dialog--scroll project-modal__dialog--fields log-report-templates-modal"
          role="dialog"
          aria-modal="true"
          aria-labelledby={`${formId}-title`}
        >
          <div className="project-modal__header log-report-templates-modal__header">
            <div>
              <h2 id={`${formId}-title`} className="project-modal__title">
                Log Report Templates
              </h2>
              <p className="project-modal__subtitle">
                Manage your log report templates for borelog and corelog types
              </p>
            </div>
            <div className="log-report-templates-modal__header-actions">
              {/* <UiButton
                type="button"
                variant="outline"
                size="sm"
                disabled={disabled}
                onClick={() => setShowDeleted((current) => !current)}
              >
                {showDeleted ? "Back to Templates" : "Deleted Records"}
              </UiButton> */}
              <button
                type="button"
                className="log-report-templates-modal__close"
                aria-label="Close"
                onClick={onClose}
              >
                ×
              </button>
            </div>
          </div>

          <div className="project-modal__body ui-scrollbar log-report-templates-modal__body">
            {showDeleted ? (
              <div className="log-report-templates-modal__empty">
                <p className="log-report-templates-modal__empty-title">No deleted records</p>
                <p className="log-report-templates-modal__section-description">
                  Deleted templates will appear here.
                </p>
              </div>
            ) : (
              <>
                <div className="log-report-templates-modal__tabs" role="tablist" aria-label="Template sections">
                  {TABS.map((tab) => (
                    <button
                      key={tab.id}
                      type="button"
                      role="tab"
                      aria-selected={activeTab === tab.id}
                      className={`log-report-templates-modal__tab${
                        activeTab === tab.id ? " is-active" : ""
                      }`}
                      onClick={() => setActiveTab(tab.id)}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>

                {activeTab === "logs" ? (
                  <div className="log-report-templates-modal__section">
                    <div className="log-report-templates-modal__section-header">
                      <div>
                        <h3 className="log-report-templates-modal__section-title">
                          Templates{" "}
                          <span className="log-report-templates-modal__count">
                            ({filteredTemplates.length})
                          </span>
                        </h3>
                        <p className="log-report-templates-modal__section-description">
                          Manage borelog and corelog report templates
                        </p>
                      </div>

                      <div className="log-report-templates-modal__filters">
                        <FormField label="Log Type" htmlFor={`${formId}-log-type`}>
                          <Select
                            id={`${formId}-log-type`}
                            value={logTypeFilter}
                            disabled={disabled}
                            options={LOG_TYPE_FILTER_OPTIONS}
                            onChange={(value) =>
                              setLogTypeFilter(
                                value === "borelog" || value === "corelog" ? value : "all"
                              )
                            }
                          />
                        </FormField>
                        <FormField label="Search templates" htmlFor={`${formId}-search`}>
                          <Input
                            id={`${formId}-search`}
                            variant="ui"
                            type="search"
                            placeholder="Type to search..."
                            value={searchQuery}
                            disabled={disabled}
                            onChange={(event) => setSearchQuery(event.target.value)}
                          />
                        </FormField>
                      </div>
                    </div>

                    <div className="log-report-templates-modal__table-wrap">
                      <table className="log-report-templates-modal__table">
                        <thead>
                          <tr>
                            <th scope="col" className="log-report-templates-modal__col-check">
                              <Checkbox
                                checked={allVisibleSelected}
                                disabled={disabled || filteredTemplates.length === 0}
                                onChange={toggleSelectAllVisible}
                                aria-label="Select all visible templates"
                              />
                            </th>
                            <th scope="col" className="log-report-templates-modal__col-drag" />
                            <th scope="col">Template Name</th>
                            <th scope="col">Log Type</th>
                            <th scope="col" className="log-report-templates-modal__col-center">
                              Default
                            </th>
                            <th scope="col">Created</th>
                            <th scope="col">
                              <span className="log-report-templates-modal__th-with-help">
                                Log Configuration
                                <span
                                  className="log-report-templates-modal__help"
                                  title="Choose which log configurations can use this template."
                                >
                                  ?
                                </span>
                              </span>
                            </th>
                            <th scope="col" className="log-report-templates-modal__col-actions">
                              Actions
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {loading ? (
                            <tr>
                              <td colSpan={8} className="log-report-templates-modal__empty-cell">
                                Loading templates…
                              </td>
                            </tr>
                          ) : filteredTemplates.length === 0 ? (
                            <tr>
                              <td colSpan={8} className="log-report-templates-modal__empty-cell">
                                No templates match your filters.
                              </td>
                            </tr>
                          ) : (
                            filteredTemplates.map((template) => {
                              const isSelected = selectedIds.includes(template.id);
                              return (
                                <tr
                                  key={template.id}
                                  className={`${dragOverId === template.id ? " is-drag-over" : ""}${
                                    isSelected ? " is-selected" : ""
                                  }`}
                                  onDragOver={(event: DragEvent<HTMLTableRowElement>) => {
                                    event.preventDefault();
                                    setDragOverId(template.id);
                                  }}
                                  onDrop={(event: DragEvent<HTMLTableRowElement>) => {
                                    event.preventDefault();
                                    if (draggingId) {
                                      persistReorder(
                                        reorderTemplates(templates, draggingId, template.id)
                                      );
                                    }
                                    setDraggingId(null);
                                    setDragOverId(null);
                                  }}
                                >
                                  <td className="log-report-templates-modal__col-check">
                                    <Checkbox
                                      checked={isSelected}
                                      disabled={disabled}
                                      onChange={() => toggleSelected(template.id)}
                                      aria-label={`Select ${template.name}`}
                                    />
                                  </td>
                                  <td className="log-report-templates-modal__col-drag">
                                    <button
                                      type="button"
                                      className="log-report-templates-modal__drag"
                                      draggable={!disabled}
                                      aria-label={`Reorder ${template.name}`}
                                      disabled={disabled}
                                      onDragStart={() => setDraggingId(template.id)}
                                      onDragEnd={() => {
                                        setDraggingId(null);
                                        setDragOverId(null);
                                      }}
                                    >
                                      <DragHandleIcon />
                                    </button>
                                  </td>
                                  <td>
                                    <div className="log-report-templates-modal__name">
                                      <span>{template.name}</span>
                                      {template.isDefault ? (
                                        <span className="log-report-templates-modal__default-badge">
                                          Default
                                        </span>
                                      ) : null}
                                    </div>
                                  </td>
                                  <td>
                                    <span
                                      className={`log-report-templates-modal__log-type log-report-templates-modal__log-type--${template.logType}`}
                                    >
                                      {template.logType === "borelog" ? "Borelog" : "Corelog"}
                                    </span>
                                  </td>
                                  <td className="log-report-templates-modal__col-center">
                                    <button
                                      type="button"
                                      className={`log-report-templates-modal__star${
                                        template.isDefault ? " is-active" : ""
                                      }`}
                                      disabled={disabled}
                                      aria-label={
                                        template.isDefault
                                          ? `${template.name} is default`
                                          : `Set ${template.name} as default`
                                      }
                                      onClick={() =>
                                        setDefaultForLogType(template.id, template.logType)
                                      }
                                    >
                                      <StarIcon filled={template.isDefault} />
                                    </button>
                                  </td>
                                  <td>{formatLogReportTemplateDate(template.createdAt)}</td>
                                  <td>
                                    <MultiSelect
                                      id={`${formId}-config-${template.id}`}
                                      value={template.logConfigurationIds}
                                      disabled={disabled}
                                      search
                                      floatingMenu
                                      placeholder="Select Log Configuration/s"
                                      options={[...LOG_REPORT_TEMPLATE_LOG_CONFIG_OPTIONS]}
                                      onChange={(value) =>
                                        updateLogConfigurations(template.id, value)
                                      }
                                    />
                                    <span className="log-report-templates-modal__sr-only">
                                      {getLogConfigurationSummary(template.logConfigurationIds)}
                                    </span>
                                  </td>
                                  <td className="log-report-templates-modal__col-actions">
                                    <UiButton
                                      type="button"
                                      variant="secondary"
                                      size="sm"
                                      disabled={disabled}
                                      onClick={() => openBuilder(template.id)}
                                    >
                                      Edit
                                    </UiButton>
                                  </td>
                                </tr>
                              );
                            })
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : null}

                {activeTab === "headers" ? (
                  <HeaderFooterTable
                    title="Headers"
                    description="Header templates available for log reports"
                    rows={headers}
                    loading={loading}
                  />
                ) : null}

                {activeTab === "footers" ? (
                  <HeaderFooterTable
                    title="Footers"
                    description="Footer templates available for log reports"
                    rows={footers}
                    loading={loading}
                  />
                ) : null}
              </>
            )}
          </div>
        </div>
      </div>
    </ProjectModalPortal>
  );
}
