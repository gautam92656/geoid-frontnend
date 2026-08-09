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
  DEFAULT_SAMPLE_TYPE_GRAPHIC,
  SAMPLE_TYPE_TABLOGS_ALIAS_OPTIONS,
  createBlankSampleTypeOption,
  getSampleTypeGraphicUrl,
  parseSampleTypeOptions,
  sampleGraphicLabel,
  toSampleTypeGraphicCatalog,
  type SampleTypeOption,
} from "../../utils/configModules/sampleType";
import type { InsituTestTypeGraphicCatalogEntry } from "../../utils/configModules/insituTestType";
import { listInsituTestTypeGraphics } from "../../services/insituTestTypeGraphicsApi";
import { SelectInsituTestGraphicsModal } from "./SelectInsituTestGraphicsModal";

type ManageSampleTypesModalProps = Readonly<{
  open: boolean;
  options: SampleTypeOption[];
  companyOptions?: SampleTypeOption[];
  insituTestTypeOptions?: ReadonlyArray<{ id: string; name: string }>;
  onClose: () => void;
  onSave: (options: SampleTypeOption[]) => void | Promise<void>;
}>;

type DraftForm = {
  name: string;
  tablogsAlias: string;
  sampleAbbreviation: string;
  graphic: string;
  noteRecovery: boolean;
  displayQcId: boolean;
  enableSegregatedGraphic: boolean;
  topGraphic: string;
  bottomGraphic: string;
  enableSubsurfaceLogging: boolean;
  enableAssignLabTest: boolean;
  enableInsituTestLogging: boolean;
  defaultInsituTestTypeId: string;
};

type GraphicPickerTarget = "test" | "top" | "bottom" | null;

const NEW_TYPE_LABEL = "New Sample Type";

function optionToDraft(option: SampleTypeOption | null): DraftForm {
  if (!option) {
    return {
      name: "",
      tablogsAlias: "",
      sampleAbbreviation: "",
      graphic: DEFAULT_SAMPLE_TYPE_GRAPHIC,
      noteRecovery: false,
      displayQcId: false,
      enableSegregatedGraphic: false,
      topGraphic: "",
      bottomGraphic: "",
      enableSubsurfaceLogging: false,
      enableAssignLabTest: false,
      enableInsituTestLogging: false,
      defaultInsituTestTypeId: "",
    };
  }

  return {
    name: option.name,
    tablogsAlias: option.tablogsAlias ?? "",
    sampleAbbreviation: option.sampleAbbreviation ?? "",
    graphic: option.graphic ?? DEFAULT_SAMPLE_TYPE_GRAPHIC,
    noteRecovery: Boolean(option.noteRecovery),
    displayQcId: Boolean(option.displayQcId),
    enableSegregatedGraphic: Boolean(option.enableSegregatedGraphic),
    topGraphic: option.topGraphic ?? "",
    bottomGraphic: option.bottomGraphic ?? "",
    enableSubsurfaceLogging: Boolean(option.enableSubsurfaceLogging),
    enableAssignLabTest: Boolean(option.enableAssignLabTest),
    enableInsituTestLogging: Boolean(option.enableInsituTestLogging),
    defaultInsituTestTypeId: option.defaultInsituTestTypeId ?? "",
  };
}

function draftToOption(draft: DraftForm, id: string): SampleTypeOption {
  return createBlankSampleTypeOption({
    id,
    name: draft.name.trim(),
    tablogsAlias: draft.tablogsAlias.trim() || null,
    sampleAbbreviation: draft.sampleAbbreviation.trim() || null,
    graphic: draft.graphic.trim() || DEFAULT_SAMPLE_TYPE_GRAPHIC,
    noteRecovery: draft.noteRecovery,
    displayQcId: draft.displayQcId,
    enableSegregatedGraphic: draft.enableSegregatedGraphic,
    topGraphic: draft.enableSegregatedGraphic ? draft.topGraphic.trim() || null : null,
    bottomGraphic: draft.enableSegregatedGraphic ? draft.bottomGraphic.trim() || null : null,
    enableSubsurfaceLogging: draft.enableSubsurfaceLogging,
    enableAssignLabTest: draft.enableAssignLabTest,
    enableInsituTestLogging: draft.enableInsituTestLogging,
    defaultInsituTestTypeId: draft.enableInsituTestLogging
      ? draft.defaultInsituTestTypeId.trim() || null
      : null,
  });
}

function reorderEntries(
  entries: SampleTypeOption[],
  sourceId: string,
  targetId: string
): SampleTypeOption[] {
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
  entries: SampleTypeOption[],
  selectedId: string | null
): string | undefined {
  const trimmed = name.trim();
  if (!trimmed) return "Sample type name is required.";
  if (trimmed.length > MODULE_OPTION_NAME_MAX_LENGTH) {
    return `Name must be ${MODULE_OPTION_NAME_MAX_LENGTH} characters or fewer.`;
  }
  const duplicate = entries.some(
    (entry) => entry.id !== selectedId && entry.name.trim().toLowerCase() === trimmed.toLowerCase()
  );
  if (duplicate) return "A sample type with this name already exists.";
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

export function ManageSampleTypesModal({
  open,
  options,
  companyOptions = [],
  insituTestTypeOptions = [],
  onClose,
  onSave,
}: ManageSampleTypesModalProps) {
  const formId = useId();
  const [entries, setEntries] = useState<SampleTypeOption[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [draft, setDraft] = useState<DraftForm>(() => optionToDraft(null));
  const [errors, setErrors] = useState<{ name?: string }>({});
  const [companyCopyId, setCompanyCopyId] = useState("");
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [graphicPicker, setGraphicPicker] = useState<GraphicPickerTarget>(null);
  const [testGraphics, setTestGraphics] = useState<InsituTestTypeGraphicCatalogEntry[]>([]);
  const [topBottomGraphics, setTopBottomGraphics] = useState<InsituTestTypeGraphicCatalogEntry[]>(
    []
  );
  const [graphicsLoading, setGraphicsLoading] = useState(false);
  const [graphicsError, setGraphicsError] = useState<string | null>(null);

  const selectedEntry = selectedId
    ? (entries.find((entry) => entry.id === selectedId) ?? null)
    : null;

  const selectedGraphicUrl = getSampleTypeGraphicUrl(draft.graphic, "test");
  const selectedTopGraphicUrl = getSampleTypeGraphicUrl(draft.topGraphic, "top-bottom");
  const selectedBottomGraphicUrl = getSampleTypeGraphicUrl(draft.bottomGraphic, "top-bottom");
  const discardIncompleteAdd = isAdding && !draft.name.trim();

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

  const aliasSelectOptions = useMemo(
    () => SAMPLE_TYPE_TABLOGS_ALIAS_OPTIONS.map((entry) => ({ ...entry })),
    []
  );

  const insituSelectOptions = useMemo(
    () => [
      { value: "", label: "Select default in-situ test type" },
      ...insituTestTypeOptions.map((entry) => ({ value: entry.id, label: entry.name })),
    ],
    [insituTestTypeOptions]
  );

  const resetPanel = useCallback(
    (nextSelectedId: string | null, adding: boolean, nextEntries: SampleTypeOption[]) => {
      setSelectedId(nextSelectedId);
      setIsAdding(adding);
      setErrors({});
      setCompanyCopyId("");
      setGraphicPicker(null);
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
        if (graphicPicker) {
          setGraphicPicker(null);
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
  }, [deleteConfirmOpen, graphicPicker, onClose, open]);

  useEffect(() => {
    if (!open) {
      setErrors({});
      setCompanyCopyId("");
      setDraggingId(null);
      setDragOverId(null);
      setDeleteConfirmOpen(false);
      setGraphicPicker(null);
      setGraphicsError(null);
      return;
    }

    const nextEntries = parseSampleTypeOptions(options, []);
    setEntries(nextEntries);

    const firstEntry = nextEntries[0];
    if (firstEntry) {
      resetPanel(firstEntry.id, false, nextEntries);
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
        setTestGraphics(toSampleTypeGraphicCatalog(catalog.testGraphics ?? []));
        setTopBottomGraphics(catalog.topBottomGraphics ?? []);
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        setTestGraphics([]);
        setTopBottomGraphics([]);
        setGraphicsError(
          error instanceof Error ? error.message : "Failed to load sample type graphics."
        );
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

  const commitDraft = useCallback((): SampleTypeOption[] | null => {
    const nameError = validateName(draft.name, entries, isAdding ? null : selectedId);
    if (nameError) {
      setErrors({ name: nameError });
      return null;
    }

    if (isAdding) {
      if (entries.length >= MODULE_OPTIONS_MAX_COUNT) {
        setErrors({
          name: `You can add up to ${MODULE_OPTIONS_MAX_COUNT} sample types.`,
        });
        return null;
      }
      return [...entries, draftToOption(draft, createOptionId("sample-type"))];
    }

    if (!selectedId) return entries;
    return entries.map((entry) =>
      entry.id === selectedId ? draftToOption(draft, selectedId) : entry
    );
  }, [draft, entries, isAdding, selectedId]);

  const handleSelectEntry = (entry: SampleTypeOption) => {
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
    setCompanyCopyId(optionId);
    if (!optionId) return;
    const source = companyOptions.find((entry) => entry.id === optionId);
    if (!source) return;
    setDraft(optionToDraft(source));
    setErrors({});
  };

  const pickGraphic = (filename: string) => {
    if (graphicPicker === "top") {
      patchDraft({ topGraphic: filename });
    } else if (graphicPicker === "bottom") {
      patchDraft({ bottomGraphic: filename });
    } else {
      patchDraft({ graphic: filename });
    }
    setGraphicPicker(null);
  };

  const requestDelete = () => {
    if (isAdding || !selectedId) return;
    setDeleteConfirmOpen(true);
  };

  const handleConfirmDelete = () => {
    if (isAdding || !selectedId) return;

    const remaining = entries.filter((entry) => entry.id !== selectedId);
    setEntries(remaining);

    const nextEntry = remaining[0];
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
    if (dragOverId !== entryId) {
      setDragOverId(entryId);
    }
  };

  const handleDrop = (event: DragEvent<HTMLLIElement>, targetId: string) => {
    event.preventDefault();
    const sourceId = event.dataTransfer.getData("text/plain") || draggingId;
    if (!sourceId) return;
    setEntries((current) => reorderEntries(current, sourceId, targetId));
    setDraggingId(null);
    setDragOverId(null);
  };

  const handleDragEnd = () => {
    setDraggingId(null);
    setDragOverId(null);
  };

  const persistEntries = async (nextEntries: SampleTypeOption[]) => {
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
        setErrors({ name: "Sample type name is required." });
        return;
      }
      void persistEntries(entries);
      return;
    }

    const nextEntries = commitDraft();
    if (!nextEntries) return;
    void persistEntries(nextEntries);
  };

  const isEditing = !isAdding && selectedEntry !== null;
  const panelTitle = isAdding
    ? "Add New Sample Type"
    : selectedEntry
      ? `Edit ${draft.name.trim() || selectedEntry.name}`
      : "Edit Sample Type";

  const listLabelForEntry = (entry: SampleTypeOption) => {
    if (!isAdding && selectedId === entry.id) {
      return draft.name.trim() || entry.name;
    }
    return entry.name;
  };

  const pickerGraphics =
    graphicPicker === "top" || graphicPicker === "bottom" ? topBottomGraphics : testGraphics;
  const pickerKind = graphicPicker === "top" || graphicPicker === "bottom" ? "top-bottom" : "test";
  const pickerSelected =
    graphicPicker === "top"
      ? draft.topGraphic
      : graphicPicker === "bottom"
        ? draft.bottomGraphic
        : draft.graphic;

  return (
    <ProjectModalPortal open={open}>
      <div className="project-modal project-modal--stacked project-modal--nested" role="presentation">
        <button
          type="button"
          className="project-modal__backdrop"
          aria-label="Close Manage Sample Types dialog"
          onClick={onClose}
        />

        <div
          className="project-modal__dialog project-modal__dialog--scroll project-modal__dialog--split project-modal__dialog--fields manage-origins-modal manage-insitu-modal"
          role="dialog"
          aria-modal="true"
          aria-labelledby="manage-sample-types-title"
        >
          <div className="project-modal__header">
            <h2 id="manage-sample-types-title" className="project-modal__title">
              Manage Sample Types
            </h2>
            <p className="project-modal__subtitle">
              Manage your existing sample types by selecting from the left menu. You can also drag to
              reorder. You also have the option to create a new Sample Type or copy an existing one
              used elsewhere in your company account.
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

                  <ul
                    className="project-modal__type-list"
                    role="listbox"
                    aria-label="Sample types"
                  >
                    {entries.length === 0 && !isAdding ? (
                      <li className="project-modal__type-list-empty">No sample types yet.</li>
                    ) : (
                      <>
                        {entries.map((entry) => {
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
                              onDrop={(event) => handleDrop(event, entry.id)}
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
                        })}

                        {isAdding ? (
                          <li className="project-modal__type-list-item">
                            <div className="project-modal__type-item is-selected">
                              <span
                                className="project-modal__type-item-drag"
                                aria-hidden="true"
                                style={{ visibility: "hidden" }}
                              >
                                <DragHandleIcon />
                              </span>
                              <span
                                className="project-modal__type-item-select"
                                role="option"
                                aria-selected="true"
                              >
                                {draft.name.trim() || NEW_TYPE_LABEL}
                              </span>
                            </div>
                          </li>
                        ) : null}
                      </>
                    )}
                  </ul>
                </aside>

                <div className="project-modal__split-main">
                  <h3 className="project-modal__split-main-title">{panelTitle}</h3>
                  {isAdding ? (
                    <p className="project-modal__split-main-subtitle">
                      Create a new sample type, or copy one used elsewhere in your company account.
                    </p>
                  ) : null}

                  <div className="project-modal__fields project-modal__fields--stack manage-origins-modal__fields">
                    {isAdding && companySelectOptions.length > 0 ? (
                      <>
                        <FormField
                          label="Select Existing Sample Type"
                          htmlFor={`${formId}-company-copy`}
                          className="project-modal__field--full"
                        >
                          <Select
                            id={`${formId}-company-copy`}
                            value={companyCopyId}
                            disabled={submitting}
                            options={companySelectOptions}
                            placeholder="Select Existing Sample Type"
                            onChange={handleCompanyCopy}
                          />
                        </FormField>
                        <p className="manage-origins-modal__hint">
                          or - create a new sample type from scratch
                        </p>
                        <div className="manage-origins-modal__divider" aria-hidden="true" />
                      </>
                    ) : null}

                    <div className="manage-origins-modal__row">
                      <FormField
                        label="Sample Type Name"
                        required
                        error={errors.name}
                        htmlFor={`${formId}-name`}
                        className="manage-origins-modal__half"
                      >
                        <Input
                          id={`${formId}-name`}
                          variant="ui"
                          type="text"
                          placeholder="Sample Type Name"
                          value={draft.name}
                          disabled={submitting}
                          maxLength={MODULE_OPTION_NAME_MAX_LENGTH}
                          onChange={(event) => patchDraft({ name: event.target.value })}
                        />
                      </FormField>

                      <FormField
                        label="Tablogs alias (Optional)"
                        htmlFor={`${formId}-alias`}
                        className="manage-origins-modal__half"
                      >
                        <Select
                          id={`${formId}-alias`}
                          value={draft.tablogsAlias}
                          disabled={submitting}
                          options={aliasSelectOptions}
                          placeholder="Select Tablogs alias"
                          onChange={(value) => patchDraft({ tablogsAlias: value })}
                        />
                      </FormField>
                    </div>

                    <FormField
                      label="Sample Abbreviation (Optional)"
                      htmlFor={`${formId}-abbreviation`}
                      className="project-modal__field--full"
                    >
                      <Input
                        id={`${formId}-abbreviation`}
                        variant="ui"
                        type="text"
                        placeholder="e.g. U50T"
                        value={draft.sampleAbbreviation}
                        disabled={submitting}
                        maxLength={32}
                        onChange={(event) => patchDraft({ sampleAbbreviation: event.target.value })}
                      />
                    </FormField>

                    <div className="manage-insitu-modal__graphics-row">
                      <div className="manage-insitu-modal__graphic-col">
                        <span className="manage-insitu-modal__field-label">Select Sample Graphic</span>
                        <button
                          type="button"
                          className="manage-insitu-modal__graphic-card"
                          disabled={submitting || graphicsLoading}
                          onClick={() => setGraphicPicker("test")}
                        >
                          {selectedGraphicUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={selectedGraphicUrl}
                              alt={sampleGraphicLabel(draft.graphic, "test")}
                              className="manage-insitu-modal__graphic-card-image"
                            />
                          ) : (
                            <span className="manage-insitu-modal__graphic-card-placeholder">
                              Select Graphic
                            </span>
                          )}
                          <span className="manage-insitu-modal__graphic-card-title">
                            {sampleGraphicLabel(draft.graphic, "test")}
                          </span>
                        </button>
                      </div>

                      <div className="manage-insitu-modal__graphic-col">
                        <label
                          className="manage-insitu-modal__toggle-inline"
                          htmlFor={`${formId}-segregated`}
                        >
                          <Toggle
                            id={`${formId}-segregated`}
                            checked={draft.enableSegregatedGraphic}
                            disabled={submitting}
                            onChange={(checked) =>
                              patchDraft({
                                enableSegregatedGraphic: checked,
                                ...(checked
                                  ? {
                                      topGraphic: draft.topGraphic || "graphic_00.svg",
                                      bottomGraphic: draft.bottomGraphic || "graphic_00.svg",
                                    }
                                  : {}),
                              })
                            }
                          />
                          <span>Use segregated graphic</span>
                          <span
                            className="manage-insitu-modal__help"
                            title="When enabled, choose separate top and bottom graphics."
                          >
                            <HelpIcon />
                          </span>
                        </label>

                        {draft.enableSegregatedGraphic ? (
                          <>
                            <div className="manage-insitu-modal__segregated-block">
                              <span className="manage-insitu-modal__segregated-title">Top</span>
                              <button
                                type="button"
                                className="manage-insitu-modal__graphic-card manage-insitu-modal__graphic-card--compact"
                                disabled={submitting || graphicsLoading}
                                onClick={() => setGraphicPicker("top")}
                              >
                                {selectedTopGraphicUrl ? (
                                  // eslint-disable-next-line @next/next/no-img-element
                                  <img
                                    src={selectedTopGraphicUrl}
                                    alt={sampleGraphicLabel(draft.topGraphic, "top-bottom")}
                                    className="manage-insitu-modal__graphic-card-image manage-insitu-modal__graphic-card-image--wide"
                                  />
                                ) : null}
                                <span className="manage-insitu-modal__graphic-card-title">
                                  {draft.topGraphic
                                    ? sampleGraphicLabel(draft.topGraphic, "top-bottom")
                                    : "Select Graphic"}
                                </span>
                              </button>
                            </div>
                            <div className="manage-insitu-modal__segregated-block">
                              <span className="manage-insitu-modal__segregated-title">Bottom</span>
                              <button
                                type="button"
                                className="manage-insitu-modal__graphic-card manage-insitu-modal__graphic-card--compact"
                                disabled={submitting || graphicsLoading}
                                onClick={() => setGraphicPicker("bottom")}
                              >
                                {selectedBottomGraphicUrl ? (
                                  // eslint-disable-next-line @next/next/no-img-element
                                  <img
                                    src={selectedBottomGraphicUrl}
                                    alt={sampleGraphicLabel(draft.bottomGraphic, "top-bottom")}
                                    className="manage-insitu-modal__graphic-card-image manage-insitu-modal__graphic-card-image--wide"
                                  />
                                ) : null}
                                <span className="manage-insitu-modal__graphic-card-title">
                                  {draft.bottomGraphic
                                    ? sampleGraphicLabel(draft.bottomGraphic, "top-bottom")
                                    : "Select Graphic"}
                                </span>
                              </button>
                            </div>
                          </>
                        ) : null}
                      </div>
                    </div>

                    {graphicsError ? (
                      <p className="manage-insitu-modal__error">{graphicsError}</p>
                    ) : null}

                    <div className="manage-insitu-modal__settings">
                      <label
                        className="manage-insitu-modal__toggle-inline"
                        htmlFor={`${formId}-note-recovery`}
                      >
                        <Toggle
                          id={`${formId}-note-recovery`}
                          checked={draft.noteRecovery}
                          disabled={submitting}
                          onChange={(checked) => patchDraft({ noteRecovery: checked })}
                        />
                        <span>Note Recovery</span>
                      </label>

                      <label
                        className="manage-insitu-modal__toggle-inline"
                        htmlFor={`${formId}-qc-id`}
                      >
                        <Toggle
                          id={`${formId}-qc-id`}
                          checked={draft.displayQcId}
                          disabled={submitting}
                          onChange={(checked) => patchDraft({ displayQcId: checked })}
                        />
                        <span>Display QC Sample ID</span>
                      </label>

                      <label
                        className="manage-insitu-modal__toggle-inline"
                        htmlFor={`${formId}-subsurface`}
                      >
                        <Toggle
                          id={`${formId}-subsurface`}
                          checked={draft.enableSubsurfaceLogging}
                          disabled={submitting}
                          onChange={(checked) => patchDraft({ enableSubsurfaceLogging: checked })}
                        />
                        <span>Enable Subsurface Logging</span>
                      </label>

                      <label
                        className="manage-insitu-modal__toggle-inline"
                        htmlFor={`${formId}-lab-test`}
                      >
                        <Toggle
                          id={`${formId}-lab-test`}
                          checked={draft.enableAssignLabTest}
                          disabled={submitting}
                          onChange={(checked) => patchDraft({ enableAssignLabTest: checked })}
                        />
                        <span>Enable Assign Lab Test</span>
                      </label>

                      <label
                        className="manage-insitu-modal__toggle-inline"
                        htmlFor={`${formId}-insitu`}
                      >
                        <Toggle
                          id={`${formId}-insitu`}
                          checked={draft.enableInsituTestLogging}
                          disabled={submitting}
                          onChange={(checked) =>
                            patchDraft({
                              enableInsituTestLogging: checked,
                              ...(checked ? {} : { defaultInsituTestTypeId: "" }),
                            })
                          }
                        />
                        <span>Enable In-situ Test Logging</span>
                      </label>

                      {draft.enableInsituTestLogging ? (
                        <FormField
                          label="Default In-situ Test Type"
                          htmlFor={`${formId}-default-insitu`}
                          className="project-modal__field--full"
                        >
                          <Select
                            id={`${formId}-default-insitu`}
                            value={draft.defaultInsituTestTypeId}
                            disabled={submitting}
                            options={insituSelectOptions}
                            onChange={(value) => patchDraft({ defaultInsituTestTypeId: value })}
                          />
                        </FormField>
                      ) : null}
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
                        Delete Sample Type
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
                {submitting ? "Saving…" : "Save"}
              </UiButton>
            </div>
          </form>
        </div>
      </div>

      <SelectInsituTestGraphicsModal
        open={graphicPicker !== null}
        title={
          graphicPicker === "top"
            ? "Select Top Graphic"
            : graphicPicker === "bottom"
              ? "Select Bottom Graphic"
              : "Select Sample Graphic"
        }
        subtitle="Select a graphic for the currently adding or updating sample type."
        graphics={pickerGraphics}
        selectedFilename={pickerSelected}
        kind={pickerKind}
        loading={graphicsLoading}
        error={graphicsError}
        disabled={submitting}
        onClose={() => setGraphicPicker(null)}
        onSelect={pickGraphic}
      />

      <ConfirmDialog
        open={deleteConfirmOpen}
        title="Delete Sample Type"
        message={
          selectedEntry
            ? `This will remove "${selectedEntry.name}". You must save to apply this change.`
            : "This will remove the selected sample type. You must save to apply this change."
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
