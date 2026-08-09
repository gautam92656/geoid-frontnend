"use client";

import type { DragEvent, FormEvent } from "react";
import { useCallback, useEffect, useId, useMemo, useState } from "react";
import {
  ConfirmDialog,
  FormField,
  Input,
  Select,
  Toggle,
  TrashIcon,
  UiButton,
  ProjectModalPortal,
} from "@/shared/components/ui";
import {
  MODULE_OPTION_NAME_MAX_LENGTH,
  MODULE_OPTIONS_MAX_COUNT,
  createOptionId,
} from "../../utils/configModuleSettings";
import {
  DEFAULT_LAB_TEST_TYPE_GRAPHIC,
  LAB_TEST_ALIAS_TABLE_OPTIONS,
  LAB_TEST_RESULT_FIELDS_MAX_COUNT,
  LAB_TEST_RESULT_TABLOGS_ALIAS_OPTIONS,
  createBlankLabTestResultField,
  createBlankLabTestTypeOption,
  getLabTestTypeGraphicUrl,
  labTestGraphicLabel,
  parseLabTestTypeOptions,
  toLabTestTypeGraphicCatalog,
  type LabTestResultField,
  type LabTestTypeOption,
} from "../../utils/configModules/labTestType";
import type { InsituTestTypeGraphicCatalogEntry } from "../../utils/configModules/insituTestType";
import { listInsituTestTypeGraphics } from "../../services/insituTestTypeGraphicsApi";
import { SelectInsituTestGraphicsModal } from "./SelectInsituTestGraphicsModal";

type ManageLabTestTypesModalProps = Readonly<{
  open: boolean;
  options: LabTestTypeOption[];
  /** Company-wide types available to copy when adding / selecting existing. */
  companyOptions?: LabTestTypeOption[];
  onClose: () => void;
  onSave: (options: LabTestTypeOption[]) => void | Promise<void>;
}>;

type DraftForm = {
  name: string;
  externalAlias: string;
  aliasTable: string;
  graphic: string;
  addAsSelectedDataPlot: boolean;
  active: boolean;
  resultFields: LabTestResultField[];
};

function optionToDraft(option: LabTestTypeOption | null): DraftForm {
  if (!option) {
    return {
      name: "",
      externalAlias: "",
      aliasTable: "",
      graphic: DEFAULT_LAB_TEST_TYPE_GRAPHIC,
      addAsSelectedDataPlot: false,
      active: true,
      resultFields: [createBlankLabTestResultField()],
    };
  }

  const fields = option.labTestResultFields ?? [];
  return {
    name: option.name,
    externalAlias: option.externalAlias ?? "",
    aliasTable: option.aliasTable ?? "",
    graphic: option.graphic ?? DEFAULT_LAB_TEST_TYPE_GRAPHIC,
    addAsSelectedDataPlot: Boolean(option.addAsSelectedDataPlot),
    active: option.active !== false,
    resultFields:
      fields.length > 0
        ? fields.map((field) => createBlankLabTestResultField(field))
        : [createBlankLabTestResultField()],
  };
}

function draftToOption(draft: DraftForm, id: string): LabTestTypeOption {
  return createBlankLabTestTypeOption({
    id,
    name: draft.name.trim(),
    externalAlias: draft.externalAlias.trim() || null,
    aliasTable: draft.aliasTable.trim() || null,
    graphic: draft.graphic.trim() || DEFAULT_LAB_TEST_TYPE_GRAPHIC,
    addAsSelectedDataPlot: draft.addAsSelectedDataPlot,
    active: draft.active,
    labTestResultFields: draft.resultFields.map((field) =>
      createBlankLabTestResultField({
        id: field.id,
        name: field.name.trim(),
        externalAlias: field.externalAlias?.trim() || null,
        tablogsAlias: field.tablogsAlias?.trim() || null,
      })
    ),
  });
}

function reorderEntries(
  entries: LabTestTypeOption[],
  sourceId: string,
  targetId: string
): LabTestTypeOption[] {
  if (sourceId === targetId) return entries;
  const sourceIndex = entries.findIndex((entry) => entry.id === sourceId);
  const targetIndex = entries.findIndex((entry) => entry.id === targetId);
  if (sourceIndex < 0 || targetIndex < 0) return entries;
  const next = [...entries];
  const [moved] = next.splice(sourceIndex, 1);
  next.splice(targetIndex, 0, moved);
  return next;
}

function validateName(
  name: string,
  entries: LabTestTypeOption[],
  selectedId: string | null
): string | undefined {
  const trimmed = name.trim();
  if (!trimmed) return "Lab test type name is required.";
  if (trimmed.length > MODULE_OPTION_NAME_MAX_LENGTH) {
    return `Name must be ${MODULE_OPTION_NAME_MAX_LENGTH} characters or fewer.`;
  }
  const duplicate = entries.some(
    (entry) => entry.id !== selectedId && entry.name.trim().toLowerCase() === trimmed.toLowerCase()
  );
  if (duplicate) return "A lab test type with this name already exists.";
  return undefined;
}

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

function HelpIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm1 15h-2v-2h2v2zm1.07-7.75-.9.92A1.99 1.99 0 0 0 12 12h-1v-1c0-.55.22-1.05.59-1.41l1.24-1.26A1 1 0 0 0 13 7a1 1 0 1 0-2 0H9a3 3 0 1 1 5.07 2.25z" />
    </svg>
  );
}

function CloseFieldIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M6 6l12 12M18 6L6 18"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function ManageLabTestTypesModal({
  open,
  options,
  companyOptions = [],
  onClose,
  onSave,
}: ManageLabTestTypesModalProps) {
  const formId = useId();
  const [entries, setEntries] = useState<LabTestTypeOption[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [draft, setDraft] = useState<DraftForm>(() => optionToDraft(null));
  const [errors, setErrors] = useState<{ name?: string }>({});
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [graphicPickerOpen, setGraphicPickerOpen] = useState(false);
  const [testGraphics, setTestGraphics] = useState<InsituTestTypeGraphicCatalogEntry[]>([]);
  const [graphicsLoading, setGraphicsLoading] = useState(false);
  const [graphicsError, setGraphicsError] = useState<string | null>(null);
  const [existingSelectId, setExistingSelectId] = useState("");
  const [activeSearch, setActiveSearch] = useState("");

  const selectedEntry = selectedId
    ? (entries.find((entry) => entry.id === selectedId) ?? null)
    : null;

  const activeEntries = useMemo(
    () => entries.filter((entry) => entry.active !== false),
    [entries]
  );
  const inactiveEntries = useMemo(
    () => entries.filter((entry) => entry.active === false),
    [entries]
  );

  const filteredActiveEntries = useMemo(() => {
    const query = activeSearch.trim().toLowerCase();
    if (!query) return activeEntries;
    return activeEntries.filter((entry) => entry.name.toLowerCase().includes(query));
  }, [activeEntries, activeSearch]);

  const companySelectOptions = useMemo(
    () =>
      companyOptions
        .filter(
          (option) =>
            !entries.some(
              (entry) => entry.name.trim().toLowerCase() === option.name.trim().toLowerCase()
            )
        )
        .map((option) => ({ value: option.id, label: option.name })),
    [companyOptions, entries]
  );

  const aliasTableOptions = useMemo(
    () => LAB_TEST_ALIAS_TABLE_OPTIONS.map((entry) => ({ ...entry })),
    []
  );

  const resultAliasOptions = useMemo(
    () => LAB_TEST_RESULT_TABLOGS_ALIAS_OPTIONS.map((entry) => ({ ...entry })),
    []
  );

  const selectedGraphicUrl = getLabTestTypeGraphicUrl(draft.graphic, "test");

  const resetPanel = useCallback(
    (nextSelectedId: string | null, adding: boolean, nextEntries: LabTestTypeOption[]) => {
      setSelectedId(nextSelectedId);
      setIsAdding(adding);
      setErrors({});
      setGraphicPickerOpen(false);
      setExistingSelectId("");
      if (adding) {
        setDraft(optionToDraft(null));
        return;
      }
      const entry = nextSelectedId
        ? (nextEntries.find((item) => item.id === nextSelectedId) ?? null)
        : null;
      setDraft(optionToDraft(entry));
    },
    []
  );

  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !deleteConfirmOpen) {
        if (graphicPickerOpen) {
          setGraphicPickerOpen(false);
          return;
        }
        event.stopImmediatePropagation();
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown, true);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown, true);
    };
  }, [deleteConfirmOpen, graphicPickerOpen, onClose, open]);

  useEffect(() => {
    if (!open) {
      setErrors({});
      setDraggingId(null);
      setDragOverId(null);
      setDeleteConfirmOpen(false);
      setGraphicPickerOpen(false);
      setExistingSelectId("");
      setGraphicsError(null);
      setActiveSearch("");
      return;
    }

    const nextEntries = parseLabTestTypeOptions(options);
    setEntries(nextEntries);
    setActiveSearch("");

    const firstActive = nextEntries.find((entry) => entry.active !== false) ?? nextEntries[0];
    if (firstActive) {
      resetPanel(firstActive.id, false, nextEntries);
    } else {
      resetPanel(null, true, nextEntries);
    }
  }, [open, options, resetPanel]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;

    setGraphicsLoading(true);
    setGraphicsError(null);
    listInsituTestTypeGraphics()
      .then((catalog) => {
        if (cancelled) return;
        setTestGraphics(toLabTestTypeGraphicCatalog(catalog.testGraphics ?? []));
      })
      .catch(() => {
        if (cancelled) return;
        setTestGraphics([]);
        setGraphicsError("Unable to load graphics from the server.");
      })
      .finally(() => {
        if (!cancelled) setGraphicsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open]);

  const patchDraft = (partial: Partial<DraftForm>) => {
    setDraft((prev) => ({ ...prev, ...partial }));
    setErrors({});
  };

  const patchResultField = (fieldId: string, partial: Partial<LabTestResultField>) => {
    setDraft((prev) => ({
      ...prev,
      resultFields: prev.resultFields.map((field) =>
        field.id === fieldId ? { ...field, ...partial } : field
      ),
    }));
  };

  const handleAddResultField = () => {
    setDraft((prev) => {
      if (prev.resultFields.length >= LAB_TEST_RESULT_FIELDS_MAX_COUNT) return prev;
      return {
        ...prev,
        resultFields: [...prev.resultFields, createBlankLabTestResultField()],
      };
    });
  };

  const handleRemoveResultField = (fieldId: string) => {
    setDraft((prev) => ({
      ...prev,
      resultFields: prev.resultFields.filter((field) => field.id !== fieldId),
    }));
  };

  const commitDraft = useCallback((): LabTestTypeOption[] | null => {
    const nameError = validateName(draft.name, entries, isAdding ? null : selectedId);
    if (nameError) {
      setErrors({ name: nameError });
      return null;
    }

    if (isAdding) {
      if (entries.length >= MODULE_OPTIONS_MAX_COUNT) {
        setErrors({ name: `You can add up to ${MODULE_OPTIONS_MAX_COUNT} lab test types.` });
        return null;
      }
      return [...entries, draftToOption(draft, createOptionId("lab-test-type"))];
    }

    if (!selectedId) return entries;
    return entries.map((entry) =>
      entry.id === selectedId ? draftToOption(draft, selectedId) : entry
    );
  }, [draft, entries, isAdding, selectedId]);

  const discardIncompleteAdd = isAdding && !draft.name.trim();

  const handleSelectEntry = (entry: LabTestTypeOption) => {
    if (discardIncompleteAdd) {
      resetPanel(entry.id, false, entries);
      return;
    }

    const nextEntries = commitDraft();
    if (!nextEntries) return;
    setEntries(nextEntries);
    resetPanel(entry.id, false, nextEntries);
  };

  const handleAddClick = () => {
    if (isAdding && !draft.name.trim()) {
      resetPanel(null, true, entries);
      return;
    }

    const nextEntries = commitDraft();
    if (!nextEntries) return;
    setEntries(nextEntries);
    resetPanel(null, true, nextEntries);
  };

  const handleCompanyCopy = (optionId: string) => {
    setExistingSelectId(optionId);
    if (!optionId) return;
    const source = companyOptions.find((entry) => entry.id === optionId);
    if (!source) return;
    setDraft({
      ...optionToDraft(source),
      active: true,
    });
    setErrors({});
  };

  const requestDelete = () => {
    if (isAdding || !selectedId) return;
    setDeleteConfirmOpen(true);
  };

  const handleConfirmDelete = () => {
    if (isAdding || !selectedId) return;

    const remaining = entries.filter((entry) => entry.id !== selectedId);
    setEntries(remaining);

    const nextEntry =
      remaining.find((entry) => entry.active !== false) ?? remaining[0] ?? null;
    if (nextEntry) {
      resetPanel(nextEntry.id, false, remaining);
    } else {
      resetPanel(null, true, remaining);
    }

    setDeleteConfirmOpen(false);
  };

  const handleDragStart = (event: DragEvent<HTMLSpanElement>, entryId: string) => {
    setDraggingId(entryId);
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", entryId);
  };

  const handleDragOver = (event: DragEvent<HTMLLIElement>, entryId: string) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
    if (dragOverId !== entryId) setDragOverId(entryId);
  };

  const syncSelectedActive = (entryId: string, active: boolean) => {
    if (!isAdding && selectedId === entryId) {
      patchDraft({ active });
    }
  };

  const handleDropOnEntry = (event: DragEvent<HTMLLIElement>, targetId: string) => {
    event.preventDefault();
    const sourceId = event.dataTransfer.getData("text/plain") || draggingId;
    if (!sourceId) return;

    const target = entries.find((entry) => entry.id === targetId);
    if (!target) return;

    const nextActive = target.active !== false;
    setEntries((current) => {
      const source = current.find((entry) => entry.id === sourceId);
      const dropTarget = current.find((entry) => entry.id === targetId);
      if (!source || !dropTarget) return current;
      const next = current.map((entry) =>
        entry.id === sourceId ? { ...entry, active: dropTarget.active !== false } : entry
      );
      return reorderEntries(next, sourceId, targetId);
    });
    syncSelectedActive(sourceId, nextActive);
    setDraggingId(null);
    setDragOverId(null);
  };

  const handleDropOnList = (event: DragEvent<HTMLUListElement>, makeActive: boolean) => {
    event.preventDefault();
    const sourceId = event.dataTransfer.getData("text/plain") || draggingId;
    if (!sourceId) return;
    setEntries((current) =>
      current.map((entry) =>
        entry.id === sourceId ? { ...entry, active: makeActive } : entry
      )
    );
    syncSelectedActive(sourceId, makeActive);
    setDraggingId(null);
    setDragOverId(null);
  };

  const handleDragEnd = () => {
    setDraggingId(null);
    setDragOverId(null);
  };

  const persistEntries = async (nextEntries: LabTestTypeOption[]) => {
    setSubmitting(true);
    try {
      await onSave(nextEntries);
      onClose();
    } catch {
      // Parent surfaces the API error toast; keep the modal open for retry.
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submitting) return;

    if (discardIncompleteAdd) {
      if (entries.length === 0) {
        setErrors({ name: "Lab test type name is required." });
        return;
      }
      void persistEntries(entries);
      return;
    }

    const nextEntries = commitDraft();
    if (!nextEntries) return;
    void persistEntries(nextEntries);
  };

  const pickGraphic = (filename: string) => {
    patchDraft({ graphic: filename });
    setGraphicPickerOpen(false);
  };

  const isEditing = !isAdding && selectedEntry !== null;
  const panelTitle = isAdding
    ? "Add New Lab Test Type"
    : selectedEntry
      ? `Edit ${draft.name.trim() || selectedEntry.name}`
      : "Edit Lab Test Type";

  const listLabelForEntry = (entry: LabTestTypeOption) => {
    if (!isAdding && selectedId === entry.id) {
      return draft.name.trim() || entry.name;
    }
    return entry.name;
  };

  const renderTypeList = (
    listEntries: LabTestTypeOption[],
    listLabel: string,
    makeActive: boolean,
    emptyLabel: string
  ) => (
    <>
      <div className="project-modal__split-sidebar-label manage-insitu-modal__list-label">
        {listLabel}
      </div>
      {makeActive ? (
        <div className="manage-lab-test-modal__active-search">
          <Input
            id={`${formId}-active-search`}
            variant="ui"
            type="search"
            value={activeSearch}
            disabled={submitting}
            placeholder="Search active types"
            aria-label="Search active types"
            onChange={(event) => setActiveSearch(event.target.value)}
          />
        </div>
      ) : null}
      <ul
        className="project-modal__type-list manage-insitu-modal__type-list"
        role="listbox"
        aria-label={listLabel}
        onDragOver={(event) => {
          event.preventDefault();
          event.dataTransfer.dropEffect = "move";
        }}
        onDrop={(event) => handleDropOnList(event, makeActive)}
      >
        {listEntries.length === 0 ? (
          <li className="project-modal__type-list-empty">{emptyLabel}</li>
        ) : (
          listEntries.map((entry) => {
            const isSelected = !isAdding && selectedId === entry.id;
            const isDragOver = dragOverId === entry.id && draggingId !== entry.id;
            return (
              <li
                key={entry.id}
                className={[
                  "project-modal__type-list-item",
                  isDragOver ? "is-drag-over" : "",
                  draggingId === entry.id ? "is-dragging" : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
                onDragOver={(event) => handleDragOver(event, entry.id)}
                onDrop={(event) => handleDropOnEntry(event, entry.id)}
              >
                <div
                  className={[
                    "project-modal__type-item",
                    isSelected ? "is-selected" : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                >
                  <span
                    className="project-modal__type-item-drag"
                    draggable={!submitting}
                    role="button"
                    tabIndex={0}
                    aria-label={`Reorder ${listLabelForEntry(entry)}`}
                    onDragStart={(event) => handleDragStart(event, entry.id)}
                    onDragEnd={handleDragEnd}
                  >
                    <DragHandleIcon />
                  </span>
                  <button
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    className="project-modal__type-item-select"
                    disabled={submitting}
                    onClick={() => handleSelectEntry(entry)}
                  >
                    {listLabelForEntry(entry)}
                  </button>
                </div>
              </li>
            );
          })
        )}
      </ul>
    </>
  );

  const activeEmptyLabel = activeSearch.trim()
    ? "We couldn't find anything matching your search."
    : "No active types.";

  return (
    <ProjectModalPortal open={open}>
      <div className="project-modal project-modal--stacked project-modal--nested" role="presentation">
        <button
          type="button"
          className="project-modal__backdrop"
          aria-label="Close Manage Lab Test Types dialog"
          onClick={onClose}
        />

        <div
          className="project-modal__dialog project-modal__dialog--scroll project-modal__dialog--split project-modal__dialog--fields manage-origins-modal manage-insitu-modal manage-lab-test-modal"
          role="dialog"
          aria-modal="true"
          aria-labelledby="manage-lab-test-types-title"
        >
          <div className="project-modal__header">
            <h2 id="manage-lab-test-types-title" className="project-modal__title">
              Manage Lab Test Types
            </h2>
            <p className="project-modal__subtitle">
              Manage your existing lab test types by selecting from the left menu. You can also drag
              to reorder. You also have the option to create a new Lab Test Type or copy an existing
              one used elsewhere in your company account.
            </p>
          </div>

          <form id={formId} className="project-modal__form" onSubmit={handleSubmit} noValidate>
            <div className="project-modal__body ui-scrollbar">
              <div className="project-modal__split">
                <aside className="project-modal__split-sidebar">
                  <div className="project-modal__split-sidebar-head">
                    <span className="project-modal__split-sidebar-label">Types</span>
                    <UiButton
                      type="button"
                      variant="primary"
                      size="sm"
                      disabled={submitting || entries.length >= MODULE_OPTIONS_MAX_COUNT}
                      onClick={handleAddClick}
                    >
                      Add
                    </UiButton>
                  </div>

                  {renderTypeList(
                    filteredActiveEntries,
                    "Active Types",
                    true,
                    activeEmptyLabel
                  )}
                  {renderTypeList(
                    inactiveEntries,
                    "Inactive Types",
                    false,
                    "Drag items here to deactivate"
                  )}
                </aside>

                <div className="project-modal__split-main">
                  <div className="manage-lab-test-modal__title-row">
                    <h3 className="project-modal__split-main-title">{panelTitle}</h3>
                    {isEditing ? (
                      <label
                        className="manage-insitu-modal__toggle-inline manage-lab-test-modal__active-toggle"
                        htmlFor={`${formId}-active`}
                      >
                        <Toggle
                          id={`${formId}-active`}
                          checked={draft.active}
                          disabled={submitting}
                          onChange={(checked) => {
                            patchDraft({ active: checked });
                            if (selectedId) {
                              setEntries((current) =>
                                current.map((entry) =>
                                  entry.id === selectedId
                                    ? { ...entry, active: checked }
                                    : entry
                                )
                              );
                            }
                          }}
                        />
                        <span>Active</span>
                        <span
                          className="manage-insitu-modal__help"
                          title="Inactive types stay available for reference but are listed separately."
                        >
                          <HelpIcon />
                        </span>
                      </label>
                    ) : null}
                  </div>
                  {isAdding ? (
                    <p className="project-modal__split-main-subtitle">
                      Create a new lab test type, or select one that has been created in other Log
                      Configurations by your company.
                    </p>
                  ) : null}

                  <div className="project-modal__fields project-modal__fields--stack manage-origins-modal__fields">
                    {isAdding && companySelectOptions.length > 0 ? (
                      <>
                        <FormField
                          label="Select Existing Lab Test Type"
                          htmlFor={`${formId}-existing`}
                          className="project-modal__field--full"
                        >
                          <Select
                            id={`${formId}-existing`}
                            value={existingSelectId}
                            disabled={submitting}
                            options={companySelectOptions}
                            placeholder="Select Existing Lab Test Type"
                            onChange={handleCompanyCopy}
                          />
                        </FormField>
                        <p className="manage-origins-modal__hint">
                          or - create a new lab test type from scratch
                        </p>
                        <div className="manage-origins-modal__divider" aria-hidden="true" />
                      </>
                    ) : null}

                    <FormField
                      label="Lab Test Type Name"
                      required
                      error={errors.name}
                      htmlFor={`${formId}-name`}
                      className="project-modal__field--full"
                    >
                      <Input
                        id={`${formId}-name`}
                        variant="ui"
                        type="text"
                        placeholder="Lab Test Type Name"
                        value={draft.name}
                        disabled={submitting}
                        maxLength={MODULE_OPTION_NAME_MAX_LENGTH}
                        onChange={(event) => patchDraft({ name: event.target.value })}
                      />
                    </FormField>

                    <FormField
                      label="External Alias (Optional)"
                      htmlFor={`${formId}-external-alias`}
                      className="project-modal__field--full"
                    >
                      <Input
                        id={`${formId}-external-alias`}
                        variant="ui"
                        type="text"
                        placeholder="External Alias"
                        value={draft.externalAlias}
                        disabled={submitting}
                        maxLength={MODULE_OPTION_NAME_MAX_LENGTH}
                        onChange={(event) => patchDraft({ externalAlias: event.target.value })}
                      />
                    </FormField>

                    <FormField
                      label="Select Alias Table"
                      htmlFor={`${formId}-alias-table`}
                      className="project-modal__field--full"
                    >
                      <Select
                        id={`${formId}-alias-table`}
                        value={draft.aliasTable}
                        disabled={submitting}
                        options={aliasTableOptions}
                        placeholder="Select Alias Table"
                        search
                        searchPlaceholder="Search alias tables…"
                        onChange={(value) => patchDraft({ aliasTable: value })}
                      />
                    </FormField>

                    <div className="manage-insitu-modal__graphics-row">
                      <div className="manage-insitu-modal__graphic-col">
                        <span className="manage-insitu-modal__field-label">Plot Graphic</span>
                        <button
                          type="button"
                          className="manage-insitu-modal__graphic-card"
                          disabled={submitting || graphicsLoading}
                          onClick={() => setGraphicPickerOpen(true)}
                        >
                          {selectedGraphicUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={selectedGraphicUrl}
                              alt={labTestGraphicLabel(draft.graphic)}
                              className="manage-insitu-modal__graphic-card-image"
                            />
                          ) : (
                            <span className="manage-insitu-modal__graphic-card-placeholder">
                              Select Graphic
                            </span>
                          )}
                          <span className="manage-insitu-modal__graphic-card-title">
                            {labTestGraphicLabel(draft.graphic)}
                          </span>
                        </button>
                      </div>
                    </div>

                    {graphicsError ? (
                      <p className="manage-insitu-modal__error">{graphicsError}</p>
                    ) : null}

                    <label
                      className="manage-insitu-modal__toggle-inline"
                      htmlFor={`${formId}-data-plot`}
                    >
                      <Toggle
                        id={`${formId}-data-plot`}
                        checked={draft.addAsSelectedDataPlot}
                        disabled={submitting}
                        onChange={(checked) =>
                          patchDraft({ addAsSelectedDataPlot: checked })
                        }
                      />
                      <span>Add as selected data plot borelogs</span>
                    </label>

                    <div className="manage-origins-modal__divider" aria-hidden="true" />

                    <div className="manage-lab-test-modal__result-header">
                      <p className="manage-lab-test-modal__result-title">
                        Test Result Table Design
                      </p>
                      <UiButton
                        type="button"
                        variant="primary"
                        size="sm"
                        disabled={
                          submitting ||
                          draft.resultFields.length >= LAB_TEST_RESULT_FIELDS_MAX_COUNT
                        }
                        aria-label="Add result field column"
                        onClick={handleAddResultField}
                      >
                        +
                      </UiButton>
                    </div>

                    <div className="manage-lab-test-modal__result-row ui-scrollbar">
                      {draft.resultFields.length === 0 ? (
                        <p className="manage-lab-test-modal__result-empty">
                          No result fields yet. Use + to add a column.
                        </p>
                      ) : (
                        draft.resultFields.map((field, index) => (
                          <div key={field.id} className="manage-lab-test-modal__result-col">
                            <FormField
                              label="Field Name"
                              htmlFor={`${formId}-result-name-${field.id}`}
                              className="project-modal__field--full"
                            >
                              <div className="manage-lab-test-modal__result-name-row">
                                <Input
                                  id={`${formId}-result-name-${field.id}`}
                                  variant="ui"
                                  type="text"
                                  placeholder="Field Name"
                                  value={field.name}
                                  disabled={submitting}
                                  maxLength={MODULE_OPTION_NAME_MAX_LENGTH}
                                  onChange={(event) =>
                                    patchResultField(field.id, { name: event.target.value })
                                  }
                                />
                                <button
                                  type="button"
                                  className="manage-lab-test-modal__result-remove"
                                  disabled={submitting}
                                  aria-label={`Remove result field ${index + 1}`}
                                  onClick={() => handleRemoveResultField(field.id)}
                                >
                                  <CloseFieldIcon />
                                </button>
                              </div>
                            </FormField>

                            <FormField
                              label="External Alias (Optional)"
                              htmlFor={`${formId}-result-alias-${field.id}`}
                              className="project-modal__field--full"
                            >
                              <Input
                                id={`${formId}-result-alias-${field.id}`}
                                variant="ui"
                                type="text"
                                placeholder="External Alias (Optional)"
                                value={field.externalAlias ?? ""}
                                disabled={submitting}
                                maxLength={MODULE_OPTION_NAME_MAX_LENGTH}
                                onChange={(event) =>
                                  patchResultField(field.id, {
                                    externalAlias: event.target.value,
                                  })
                                }
                              />
                            </FormField>

                            <FormField
                              label="Select TabLogs Alias Field"
                              htmlFor={`${formId}-result-tablogs-${field.id}`}
                              className="project-modal__field--full"
                            >
                              <Select
                                id={`${formId}-result-tablogs-${field.id}`}
                                value={field.tablogsAlias ?? ""}
                                disabled={submitting}
                                options={resultAliasOptions}
                                placeholder="Select TabLogs Alias Field"
                                search
                                searchPlaceholder="Search TabLogs aliases…"
                                onChange={(value) =>
                                  patchResultField(field.id, { tablogsAlias: value })
                                }
                              />
                            </FormField>
                          </div>
                        ))
                      )}
                    </div>

                    {isEditing ? (
                      <UiButton
                        type="button"
                        variant="secondary"
                        size="sm"
                        className="ui-btn--danger project-modal__delete-option"
                        disabled={submitting}
                        onClick={requestDelete}
                      >
                        <TrashIcon />
                        Delete Lab Test Type
                      </UiButton>
                    ) : null}
                  </div>
                </div>
              </div>
            </div>

            <div className="project-modal__footer">
              <UiButton type="button" variant="ghost" onClick={onClose} disabled={submitting}>
                Cancel
              </UiButton>
              <UiButton type="submit" variant="primary" disabled={submitting}>
                {submitting ? "Saving…" : "Save All"}
              </UiButton>
            </div>
          </form>
        </div>
      </div>

      <SelectInsituTestGraphicsModal
        open={graphicPickerOpen}
        title="Select Plot Graphic"
        subtitle="Select your plot graphic for the currently adding or updating lab test type."
        graphics={testGraphics}
        selectedFilename={draft.graphic}
        kind="test"
        loading={graphicsLoading}
        error={graphicsError}
        disabled={submitting}
        onClose={() => setGraphicPickerOpen(false)}
        onSelect={pickGraphic}
      />

      <ConfirmDialog
        open={deleteConfirmOpen}
        title="Delete Lab Test Type"
        message={
          selectedEntry
            ? `This will remove "${selectedEntry.name}". You must save to apply this change.`
            : "This will remove the selected lab test type. You must save to apply this change."
        }
        confirmLabel="Delete"
        cancelLabel="Cancel"
        variant="danger"
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteConfirmOpen(false)}
      />
    </ProjectModalPortal>
  );
}
