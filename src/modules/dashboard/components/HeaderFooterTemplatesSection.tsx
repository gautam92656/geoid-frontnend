"use client";

import type { ReactNode } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Badge,
  Checkbox,
  ConfirmDialog,
  DataTable,
  EditIcon,
  PlusIcon,
  ProjectModalPortal,
  RefreshIcon,
  SortableColumnHeader,
  TableRowActionsMenu,
  TableSearch,
  TableToolbar,
  TrashIcon,
  UiButton,
  ViewIcon,
  type ColumnDef,
  type ToolbarAction,
} from "@/shared/components/ui";
import { MAX_TABLE_PAGE_SIZE } from "@/shared/constants/pagination";
import { API_ERROR_MESSAGES, API_MESSAGES } from "@/shared/constants/apiMessages";
import { useTableSort } from "@/shared/hooks/useTableSort";
import { formatDisplayDate } from "@/shared/utils/formatDate";
import { showApiError, showApiSuccess } from "@/shared/utils/apiToast";
import {
  deleteHeaderFooterTemplate,
  formToHeaderFooterTemplatePayload,
  listHeaderFooterTemplates,
  updateHeaderFooterTemplate,
} from "../services/headerFooterTemplateApi";
import type {
  HeaderFooterTemplate,
  HeaderFooterTemplateFormState,
  HeaderFooterTemplateKind,
} from "../types/headerFooterTemplate";
import { useOwnerUserId } from "../context/LogConfigurationOwnerContext";
import { AddHeaderFooterTemplateModal } from "./AddHeaderFooterTemplateModal";

const DEFAULT_BUILDER_BASE_PATH = "/dashboard/settings/header-footer-templates";

type HeaderFooterTemplatesSectionProps = Readonly<{
  builderBasePath?: string;
}>;

const TEMPLATE_GRID =
  "40px minmax(220px, 1.4fr) minmax(110px, 0.7fr) minmax(120px, 0.8fr) 48px";

const KIND_TABS = [
  { id: "all", label: "All" },
  { id: "header", label: "Headers" },
  { id: "footer", label: "Footers" },
] as const;

type KindTabId = (typeof KIND_TABS)[number]["id"];

type DeleteConfirmState =
  | { open: false }
  | { open: true; mode: "single"; template: HeaderFooterTemplate }
  | { open: true; mode: "bulk"; count: number };

type ModalState = { open: false } | { open: true; editingTemplate: HeaderFooterTemplate };

function getTemplateSortValue(template: HeaderFooterTemplate, field: string): string | number {
  switch (field) {
    case "name":
      return template.name;
    case "reportType":
      return template.reportType ?? "";
    case "updatedAt":
      return template.updatedAt;
    case "kind":
      return template.kind;
    default:
      return "";
  }
}

function kindLabel(kind: HeaderFooterTemplateKind): string {
  return kind === "header" ? "Header" : "Footer";
}

function reportTypeLabel(reportType: HeaderFooterTemplate["reportType"]): string {
  if (reportType === "borelog") return "Borelog";
  if (reportType === "corelog") return "Corelog";
  return "Not Set";
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

function ChevronDownIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function DesignIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M4 20h4l10-10-4-4L4 16v4zM14 6l4 4"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function HeaderFooterTemplatesSection({
  builderBasePath = DEFAULT_BUILDER_BASE_PATH,
}: HeaderFooterTemplatesSectionProps = {}) {
  const router = useRouter();
  const ownerUserId = useOwnerUserId();
  const [templates, setTemplates] = useState<HeaderFooterTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [activeTab, setActiveTab] = useState<KindTabId>("all");
  const [search, setSearch] = useState("");
  const [newMenuOpen, setNewMenuOpen] = useState(false);
  const newMenuRef = useRef<HTMLDivElement>(null);
  const [modal, setModal] = useState<ModalState>({ open: false });
  const [viewTemplate, setViewTemplate] = useState<HeaderFooterTemplate | null>(null);
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
      const result = await listHeaderFooterTemplates(1, MAX_TABLE_PAGE_SIZE, {
        sortBy: "updatedAt",
        sortOrder: "desc",
        ownerUserId,
      });
      setTemplates(result.data);
    } catch (err) {
      showApiError(err, API_ERROR_MESSAGES.LOAD_HEADER_FOOTER_TEMPLATES);
    } finally {
      setLoading(false);
    }
  }, [ownerUserId]);

  useEffect(() => {
    void loadTemplates();
  }, [loadTemplates]);

  useEffect(() => {
    if (!newMenuOpen) return;

    const handlePointerDown = (event: MouseEvent) => {
      if (!newMenuRef.current?.contains(event.target as Node)) {
        setNewMenuOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setNewMenuOpen(false);
    };

    document.addEventListener("mousedown", handlePointerDown);
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [newMenuOpen]);

  const filteredTemplates = useMemo(() => {
    const query = search.trim().toLowerCase();
    return templates.filter((template) => {
      if (activeTab !== "all" && template.kind !== activeTab) return false;
      if (!query) return true;
      const haystack = [
        template.name,
        kindLabel(template.kind),
        reportTypeLabel(template.reportType),
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(query);
    });
  }, [activeTab, search, templates]);

  const { sort, toggleSort, sortedData } = useTableSort(
    filteredTemplates,
    getTemplateSortValue,
    { field: "updatedAt", order: "desc" }
  );

  const allSelected = sortedData.length > 0 && selectedIds.size === sortedData.length;
  const someSelected = selectedIds.size > 0 && !allSelected;

  const toggleAll = useCallback(() => {
    setSelectedIds((current) =>
      current.size === sortedData.length
        ? new Set()
        : new Set(sortedData.map((template) => template.id))
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

  const openNewBuilder = useCallback(
    (kind: HeaderFooterTemplateKind) => {
      setNewMenuOpen(false);
      router.push(withOwnerQuery(`${builderBasePath}/new/builder?kind=${kind}`));
    },
    [builderBasePath, router, withOwnerQuery]
  );

  const openEditModal = useCallback((template: HeaderFooterTemplate) => {
    setModal({ open: true, editingTemplate: template });
  }, []);

  const closeModal = useCallback(() => {
    setModal({ open: false });
  }, []);

  const requestDeleteTemplate = useCallback((template: HeaderFooterTemplate) => {
    setDeleteConfirm({ open: true, mode: "single", template });
  }, []);

  const requestDeleteSelected = useCallback(() => {
    if (selectedIds.size === 0) return;
    setDeleteConfirm({ open: true, mode: "bulk", count: selectedIds.size });
  }, [selectedIds.size]);

  const performDelete = useCallback(async (ids: number[]) => {
    if (ids.length === 0) return;

    setDeleting(true);
    try {
      const results = await Promise.all(
        ids.map((id) => deleteHeaderFooterTemplate(id, ownerUserId))
      );
      setTemplates((current) => current.filter((template) => !ids.includes(template.id)));
      setSelectedIds(new Set());

      const message = results.find((result) => result.message)?.message;
      showApiSuccess(
        message,
        ids.length > 1
          ? API_MESSAGES.HEADER_FOOTER_TEMPLATES_DELETED
          : API_MESSAGES.HEADER_FOOTER_TEMPLATE_DELETED
      );
      setDeleteConfirm({ open: false });
    } catch (err) {
      showApiError(err, API_ERROR_MESSAGES.DELETE_HEADER_FOOTER_TEMPLATES);
    } finally {
      setDeleting(false);
    }
  }, [ownerUserId]);

  const handleConfirmDelete = useCallback(async () => {
    if (!deleteConfirm.open) return;

    if (deleteConfirm.mode === "single") {
      await performDelete([deleteConfirm.template.id]);
      return;
    }

    await performDelete([...selectedIds]);
  }, [deleteConfirm, performDelete, selectedIds]);

  const handleRefresh = useCallback(() => {
    setSelectedIds(new Set());
    void loadTemplates();
  }, [loadTemplates]);

  const openBuilder = useCallback(
    (templateId: number) => {
      router.push(withOwnerQuery(`${builderBasePath}/${templateId}/builder`));
    },
    [builderBasePath, router, withOwnerQuery]
  );

  const handleSubmit = useCallback(
    async (form: HeaderFooterTemplateFormState) => {
      if (!modal.open) return;

      setSubmitting(true);
      try {
        const { data, message } = await updateHeaderFooterTemplate(
          modal.editingTemplate.id,
          formToHeaderFooterTemplatePayload(form),
          ownerUserId
        );
        setTemplates((current) =>
          current.map((template) => (template.id === data.id ? data : template))
        );
        showApiSuccess(message, API_MESSAGES.HEADER_FOOTER_TEMPLATE_UPDATED);
        setSelectedIds(new Set());
        closeModal();
      } catch (err) {
        showApiError(err, API_ERROR_MESSAGES.UPDATE_HEADER_FOOTER_TEMPLATE);
      } finally {
        setSubmitting(false);
      }
    },
    [closeModal, modal, ownerUserId]
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

  const columns: ColumnDef<HeaderFooterTemplate>[] = useMemo(
    () => [
      {
        id: "select",
        header: (
          <Checkbox
            checked={allSelected}
            indeterminate={someSelected}
            onChange={toggleAll}
            aria-label="Select all templates"
          />
        ),
        cell: (template) => (
          <Checkbox
            checked={selectedIds.has(template.id)}
            onChange={() => toggleOne(template.id)}
            aria-label={`Select ${template.name}`}
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
        cell: (template) => (
          <button
            type="button"
            className="data-table__link"
            onClick={() => setViewTemplate(template)}
          >
            {template.name}
          </button>
        ),
      },
      {
        id: "reportType",
        header: (
          <ColumnHeader
            field="reportType"
            sortField={sort.field}
            sortOrder={sort.order}
            onSort={toggleSort}
          >
            Type
          </ColumnHeader>
        ),
        cell: (template) => (
          <Badge variant={template.reportType ? "neutral" : "warning"}>
            {reportTypeLabel(template.reportType)}
          </Badge>
        ),
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
            Last Modified
          </ColumnHeader>
        ),
        cell: (template) => formatDisplayDate(template.updatedAt),
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
        cell: (template) => (
          <TableRowActionsMenu
            label={`Actions for ${template.name}`}
            actions={[
              {
                id: "design",
                label: "Design",
                icon: <DesignIcon />,
                onClick: () => openBuilder(template.id),
              },
              {
                id: "view",
                label: "View",
                icon: <ViewIcon />,
                onClick: () => setViewTemplate(template),
              },
              {
                id: "edit",
                label: "Edit details",
                icon: <EditIcon />,
                onClick: () => openEditModal(template),
              },
              {
                id: "delete",
                label: "Delete",
                icon: <TrashIcon />,
                tone: "danger",
                onClick: () => requestDeleteTemplate(template),
              },
            ]}
          />
        ),
        className: "data-table__col--actions",
      },
    ],
    [
      allSelected,
      openBuilder,
      openEditModal,
      requestDeleteTemplate,
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
      ? `Delete ${deleteConfirm.count} templates?`
      : "Delete template?";

  const deleteDialogMessage =
    deleteConfirm.open && deleteConfirm.mode === "bulk"
      ? `This will permanently remove ${deleteConfirm.count} selected templates. This action cannot be undone.`
      : deleteConfirm.open
        ? `This will permanently remove "${deleteConfirm.template.name}". This action cannot be undone.`
        : "";

  const emptyMessage = (() => {
    if (loading) return "Loading templates…";
    if (search.trim()) return "No templates match your search.";
    if (activeTab === "header") return "No header templates yet.";
    if (activeTab === "footer") return "No footer templates yet.";
    return "No header or footer templates yet.";
  })();

  return (
    <>
      <div className="settings-section">
        <div className="settings-section__card settings-log-config asset-card--table">
          <div className="settings-section__card-header">
            <div className="settings-section__card-copy">
              <h2 className="settings-section__card-title">Manage Header & Footer Templates</h2>
              <p className="settings-section__card-description">
                Create and manage reusable header and footer templates for your reports.
              </p>
            </div>

            <div
              ref={newMenuRef}
              className={`header-footer-templates__new${newMenuOpen ? " is-open" : ""}`}
            >
              <UiButton
                variant="primary"
                size="sm"
                onClick={() => setNewMenuOpen((current) => !current)}
                disabled={loading}
                aria-haspopup="menu"
                aria-expanded={newMenuOpen}
              >
                <PlusIcon />
                New Template
                <ChevronDownIcon />
              </UiButton>

              {newMenuOpen ? (
                <div className="header-footer-templates__new-menu" role="menu" aria-label="New template">
                  <button
                    type="button"
                    role="menuitem"
                    className="header-footer-templates__new-item"
                    onClick={() => openNewBuilder("header")}
                  >
                    Header Template
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    className="header-footer-templates__new-item"
                    onClick={() => openNewBuilder("footer")}
                  >
                    Footer Template
                  </button>
                </div>
              ) : null}
            </div>
          </div>

          <div className="asset-card__toolbar settings-log-config__toolbar">
            <div className="asset-card__filters settings-log-config__filters">
              <div
                className="settings-log-config__tabs"
                role="tablist"
                aria-label="Template kind"
              >
                {KIND_TABS.map((tab) => (
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
                placeholder="Search templates…"
                ariaLabel="Search templates"
                disabled={loading}
              />
            </div>

            <TableToolbar actions={toolbarActions} />
          </div>

          <div className="asset-card__table-wrap">
            <DataTable
              columns={columns}
              data={sortedData}
              getRowId={(template) => String(template.id)}
              gridTemplateColumns={TEMPLATE_GRID}
              emptyMessage={emptyMessage}
            />
          </div>
        </div>
      </div>

      <AddHeaderFooterTemplateModal
        open={modal.open}
        onClose={closeModal}
        onSubmit={handleSubmit}
        templates={templates}
        editingTemplate={modal.open ? modal.editingTemplate : null}
        defaultKind={modal.open ? modal.editingTemplate.kind : "header"}
        submitting={submitting}
      />

      <ProjectModalPortal open={viewTemplate !== null}>
        {viewTemplate ? (
          <div className="project-modal project-modal--stacked" role="presentation">
            <button
              type="button"
              className="project-modal__backdrop"
              aria-label="Close template details"
              onClick={() => setViewTemplate(null)}
            />
            <div
              className="project-modal__dialog"
              role="dialog"
              aria-modal="true"
              aria-labelledby="header-footer-template-view-title"
            >
              <div className="project-modal__header">
                <h2 id="header-footer-template-view-title" className="project-modal__title">
                  {viewTemplate.name}
                </h2>
                <p className="project-modal__subtitle">
                  {kindLabel(viewTemplate.kind)} template details
                </p>
              </div>

              <div className="project-modal__fields header-footer-templates__view-fields">
                <div className="header-footer-templates__view-row">
                  <span className="header-footer-templates__view-label">Kind</span>
                  <span>{kindLabel(viewTemplate.kind)}</span>
                </div>
                <div className="header-footer-templates__view-row">
                  <span className="header-footer-templates__view-label">Type</span>
                  <span>{reportTypeLabel(viewTemplate.reportType)}</span>
                </div>
                <div className="header-footer-templates__view-row">
                  <span className="header-footer-templates__view-label">Last Modified</span>
                  <span>{formatDisplayDate(viewTemplate.updatedAt)}</span>
                </div>
              </div>

              <div className="project-modal__footer">
                <UiButton type="button" variant="ghost" onClick={() => setViewTemplate(null)}>
                  Close
                </UiButton>
                <UiButton
                  type="button"
                  variant="ghost"
                  onClick={() => {
                    const template = viewTemplate;
                    setViewTemplate(null);
                    openEditModal(template);
                  }}
                >
                  Edit details
                </UiButton>
                <UiButton
                  type="button"
                  variant="primary"
                  onClick={() => {
                    const template = viewTemplate;
                    setViewTemplate(null);
                    openBuilder(template.id);
                  }}
                >
                  Open builder
                </UiButton>
              </div>
            </div>
          </div>
        ) : null}
      </ProjectModalPortal>

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
