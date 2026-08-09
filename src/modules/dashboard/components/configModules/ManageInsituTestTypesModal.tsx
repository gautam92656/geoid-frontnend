"use client";

import type { DragEvent, FormEvent } from "react";
import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
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
  createBlankInsituTestTypeOption,
  createBlankInsituTestTypeSettings,
  cloneInsituTestTypeSettings,
  getInsituTestTypeGraphicUrl,
  insituGraphicLabel,
  intervalParamLabel,
  parseInsituTestTypeOptions,
  parseInsituTestTypeSettings,
  type InsituTestOtherSetting,
  type InsituTestTypeGraphicCatalogEntry,
  type InsituTestTypeOption,
  type InsituTestTypeSettings,
} from "../../utils/configModules/insituTestType";
import { listInsituTestTypeGraphics } from "../../services/insituTestTypeGraphicsApi";
import { SelectInsituTestGraphicsModal } from "./SelectInsituTestGraphicsModal";

type ManageInsituTestTypesModalProps = Readonly<{
  open: boolean;
  options: InsituTestTypeOption[];
  /** When false, wait before seeding local state (e.g. API still loading). */
  optionsReady?: boolean;
  /** Company-wide types available to copy when adding / selecting existing. */
  companyOptions?: InsituTestTypeOption[];
  sampleTypeOptions?: ReadonlyArray<{ id: string; name: string }>;
  onClose: () => void;
  onSave: (options: InsituTestTypeOption[]) => void;
}>;

type DraftForm = {
  name: string;
  graphic: string;
  enableSegregatedGraphic: boolean;
  topGraphic: string;
  bottomGraphic: string;
  depthFrequencyEnabled: boolean;
  depthFrequency: string;
  enableSampleLogging: boolean;
  enableSubsurfaceLogging: boolean;
  defaultSampleTypeId: string;
  enableAutoSampleDescription: boolean;
  active: boolean;
  settings: InsituTestTypeSettings;
};

type GraphicPickerTarget = "test" | "top" | "bottom" | null;

function optionToDraft(option: InsituTestTypeOption | null): DraftForm {
  if (!option) {
    return {
      name: "",
      graphic: "graphic_00.png",
      enableSegregatedGraphic: false,
      topGraphic: "",
      bottomGraphic: "",
      depthFrequencyEnabled: false,
      depthFrequency: "",
      enableSampleLogging: false,
      enableSubsurfaceLogging: false,
      defaultSampleTypeId: "",
      enableAutoSampleDescription: false,
      active: true,
      settings: createBlankInsituTestTypeSettings(),
    };
  }

  return {
    name: option.name,
    graphic: option.graphic ?? "graphic_00.png",
    enableSegregatedGraphic: Boolean(option.enableSegregatedGraphic),
    topGraphic: option.topGraphic ?? "",
    bottomGraphic: option.bottomGraphic ?? "",
    depthFrequencyEnabled: Boolean(option.depthFrequencyEnabled),
    depthFrequency: option.depthFrequency ?? "",
    enableSampleLogging: Boolean(option.enableSampleLogging),
    enableSubsurfaceLogging: Boolean(option.enableSubsurfaceLogging),
    defaultSampleTypeId: option.defaultSampleTypeId ?? "",
    enableAutoSampleDescription: Boolean(option.enableAutoSampleDescription),
    active: option.active !== false,
    settings: cloneInsituTestTypeSettings(option.settings),
  };
}

function draftToOption(draft: DraftForm, id: string): InsituTestTypeOption {
  return createBlankInsituTestTypeOption({
    id,
    name: draft.name.trim(),
    graphic: draft.graphic.trim() || "graphic_00.png",
    enableSegregatedGraphic: draft.enableSegregatedGraphic,
    topGraphic: draft.topGraphic.trim() || null,
    bottomGraphic: draft.bottomGraphic.trim() || null,
    depthFrequencyEnabled: draft.depthFrequencyEnabled,
    depthFrequency: draft.depthFrequency.trim() || null,
    enableSampleLogging: draft.enableSampleLogging,
    enableSubsurfaceLogging: draft.enableSubsurfaceLogging,
    defaultSampleTypeId: draft.defaultSampleTypeId.trim() || null,
    enableAutoSampleDescription: draft.enableAutoSampleDescription,
    active: draft.active,
    settings: parseInsituTestTypeSettings(draft.settings),
  });
}

function reorderEntries(
  entries: InsituTestTypeOption[],
  sourceId: string,
  targetId: string
): InsituTestTypeOption[] {
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
  entries: InsituTestTypeOption[],
  selectedId: string | null
): string | undefined {
  const trimmed = name.trim();
  if (!trimmed) return "In-situ test type name is required.";
  if (trimmed.length > MODULE_OPTION_NAME_MAX_LENGTH) {
    return `Name must be ${MODULE_OPTION_NAME_MAX_LENGTH} characters or fewer.`;
  }
  const duplicate = entries.some(
    (entry) => entry.id !== selectedId && entry.name.trim().toLowerCase() === trimmed.toLowerCase()
  );
  if (duplicate) return "An in-situ test type with this name already exists.";
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

export function ManageInsituTestTypesModal({
  open,
  options,
  optionsReady = true,
  companyOptions = [],
  sampleTypeOptions = [],
  onClose,
  onSave,
}: ManageInsituTestTypesModalProps) {
  const formId = useId();
  const seededRef = useRef(false);
  const [entries, setEntries] = useState<InsituTestTypeOption[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [draft, setDraft] = useState<DraftForm>(() => optionToDraft(null));
  const [errors, setErrors] = useState<{ name?: string }>({});
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
  const [existingSelectId, setExistingSelectId] = useState("");

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

  const sampleSelectOptions = useMemo(
    () => [
      { value: "", label: "None" },
      ...sampleTypeOptions
        .filter((entry) => entry.id.trim() && entry.name.trim())
        .map((entry) => ({ value: entry.id, label: entry.name })),
    ],
    [sampleTypeOptions]
  );

  const selectedTestGraphicUrl = getInsituTestTypeGraphicUrl(draft.graphic, "test");
  const selectedTopGraphicUrl = getInsituTestTypeGraphicUrl(draft.topGraphic, "top-bottom");
  const selectedBottomGraphicUrl = getInsituTestTypeGraphicUrl(draft.bottomGraphic, "top-bottom");

  const resetPanel = useCallback(
    (nextSelectedId: string | null, adding: boolean, nextEntries: InsituTestTypeOption[]) => {
      setSelectedId(nextSelectedId);
      setIsAdding(adding);
      setErrors({});
      setGraphicPicker(null);
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
      seededRef.current = false;
      setErrors({});
      setDraggingId(null);
      setDragOverId(null);
      setDeleteConfirmOpen(false);
      setGraphicPicker(null);
      setExistingSelectId("");
      setGraphicsError(null);
      return;
    }

    // Seed once per open after options are ready — avoid resetting draft while typing
    // when the parent re-renders or API options replace the fallback list.
    if (!optionsReady || seededRef.current) return;
    seededRef.current = true;

    const nextEntries = parseInsituTestTypeOptions(options);
    setEntries(nextEntries);

    const firstActive = nextEntries.find((entry) => entry.active !== false) ?? nextEntries[0];
    if (firstActive) {
      resetPanel(firstActive.id, false, nextEntries);
    } else {
      resetPanel(null, true, nextEntries);
    }
  }, [open, options, optionsReady, resetPanel]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;

    setGraphicsLoading(true);
    setGraphicsError(null);
    listInsituTestTypeGraphics()
      .then((catalog) => {
        if (cancelled) return;
        setTestGraphics(catalog.testGraphics ?? []);
        setTopBottomGraphics(catalog.topBottomGraphics ?? []);
      })
      .catch(() => {
        if (cancelled) return;
        setTestGraphics([]);
        setTopBottomGraphics([]);
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

  const updateOtherSetting = (
    settingIndex: number,
    updater: (setting: InsituTestOtherSetting) => InsituTestOtherSetting
  ) => {
    setDraft((prev) => {
      const otherSettings = prev.settings.otherSettings.map((setting, index) =>
        index === settingIndex ? updater(setting) : setting
      );
      return {
        ...prev,
        settings: {
          ...prev.settings,
          otherSettings,
        },
      };
    });
    setErrors({});
  };

  const setIntervalParamActive = (
    settingIndex: number,
    paramIndex: number,
    active: boolean
  ) => {
    updateOtherSetting(settingIndex, (setting) => ({
      ...setting,
      params: (setting.params ?? []).map((param, index) =>
        index === paramIndex ? { ...param, active } : param
      ),
    }));
  };

  const setOtherSettingEnabled = (settingIndex: number, enabled: boolean) => {
    updateOtherSetting(settingIndex, (setting) => ({ ...setting, enabled }));
  };

  const setOtherSettingValue = (
    settingIndex: number,
    value: string | number | null
  ) => {
    updateOtherSetting(settingIndex, (setting) => ({ ...setting, value }));
  };

  const commitDraft = useCallback((): InsituTestTypeOption[] | null => {
    const nameError = validateName(draft.name, entries, isAdding ? null : selectedId);
    if (nameError) {
      setErrors({ name: nameError });
      return null;
    }

    if (isAdding) {
      if (entries.length >= MODULE_OPTIONS_MAX_COUNT) {
        setErrors({ name: `You can add up to ${MODULE_OPTIONS_MAX_COUNT} test types.` });
        return null;
      }
      return [...entries, draftToOption(draft, createOptionId("testing-type"))];
    }

    if (!selectedId) return entries;
    return entries.map((entry) =>
      entry.id === selectedId ? draftToOption(draft, selectedId) : entry
    );
  }, [draft, entries, isAdding, selectedId]);

  const discardIncompleteAdd = isAdding && !draft.name.trim();

  const handleSelectEntry = (entry: InsituTestTypeOption) => {
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

  const handleDropOnList = (
    event: DragEvent<HTMLUListElement>,
    makeActive: boolean
  ) => {
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

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submitting) return;

    // Empty add panel with existing entries: persist current list without creating a blank type.
    if (discardIncompleteAdd) {
      if (entries.length === 0) {
        setErrors({ name: "In-situ test type name is required." });
        return;
      }
      setSubmitting(true);
      try {
        onSave(entries);
        onClose();
      } finally {
        setSubmitting(false);
      }
      return;
    }

    const nextEntries = commitDraft();
    if (!nextEntries) return;

    setSubmitting(true);
    try {
      onSave(nextEntries);
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  const pickGraphic = (filename: string) => {
    if (graphicPicker === "test") patchDraft({ graphic: filename });
    if (graphicPicker === "top") patchDraft({ topGraphic: filename });
    if (graphicPicker === "bottom") patchDraft({ bottomGraphic: filename });
    setGraphicPicker(null);
  };

  const pickerGraphics =
    graphicPicker === "test" || graphicPicker === null ? testGraphics : topBottomGraphics;
  const pickerKind =
    graphicPicker === "top" || graphicPicker === "bottom" ? "top-bottom" : "test";
  const pickerSelectedFilename =
    graphicPicker === "top"
      ? draft.topGraphic
      : graphicPicker === "bottom"
        ? draft.bottomGraphic
        : draft.graphic;
  const pickerTitle =
    graphicPicker === "top" || graphicPicker === "bottom"
      ? "Select Test Top and Bottom Graphic"
      : "Select Test Graphic";
  const pickerSubtitle =
    graphicPicker === "top"
      ? "Select the top graphic for the currently adding or updating test type."
      : graphicPicker === "bottom"
        ? "Select the bottom graphic for the currently adding or updating test type."
        : "Select your test graphic for the currently adding or updating test type.";

  const isEditing = !isAdding && selectedEntry !== null;
  const panelTitle = isAdding
    ? "Add New In-situ Test Type"
    : selectedEntry
      ? `Edit ${selectedEntry.name}`
      : "Edit In-situ Test Type";

  const renderTypeList = (
    listEntries: InsituTestTypeOption[],
    listLabel: string,
    makeActive: boolean,
    emptyLabel: string
  ) => (
    <>
      <div className="project-modal__split-sidebar-label manage-insitu-modal__list-label">
        {listLabel}
      </div>
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
                    aria-label={`Reorder ${entry.name}`}
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
                    {entry.name}
                  </button>
                </div>
              </li>
            );
          })
        )}
      </ul>
    </>
  );

  return (
    <ProjectModalPortal open={open}>
      <div className="project-modal project-modal--stacked project-modal--nested" role="presentation">
        <button
          type="button"
          className="project-modal__backdrop"
          aria-label="Close Manage In-situ Test Types dialog"
          onClick={onClose}
        />

        <div
          className="project-modal__dialog project-modal__dialog--scroll project-modal__dialog--split project-modal__dialog--fields manage-origins-modal manage-insitu-modal"
          role="dialog"
          aria-modal="true"
          aria-labelledby="manage-insitu-test-types-title"
        >
          <div className="project-modal__header">
            <h2 id="manage-insitu-test-types-title" className="project-modal__title">
              Manage In-situ Test Types
            </h2>
            <p className="project-modal__subtitle">
              Manage your existing insitu-test types by selecting from the left menu. You can also
              drag to reorder. You also have the option to create a new test or copy an existing one
              used elsewhere in your company account.
            </p>
          </div>

          <form id={formId} className="project-modal__form" onSubmit={handleSubmit} noValidate>
            <div className="project-modal__body ui-scrollbar">
              <div className="project-modal__split">
                <aside className="project-modal__split-sidebar">
                  <div className="project-modal__split-sidebar-head">
                    <span className="project-modal__split-sidebar-label">Test Types</span>
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
                    activeEntries,
                    "Active Test Types",
                    true,
                    "No active test types."
                  )}
                  {renderTypeList(
                    inactiveEntries,
                    "Inactive Test Types",
                    false,
                    "No inactive test types."
                  )}
                </aside>

                <div className="project-modal__split-main">
                  <h3 className="project-modal__split-main-title">{panelTitle}</h3>
                  {isAdding ? (
                    <p className="project-modal__split-main-subtitle">
                      Create a new in-situ test type, or select one that has been created in other
                      Log Configurations by your company.
                    </p>
                  ) : null}

                  <div className="project-modal__fields project-modal__fields--stack manage-origins-modal__fields manage-insitu-modal__fields">
                    {isAdding && companySelectOptions.length > 0 ? (
                      <section className="manage-insitu-modal__section">
                        <FormField
                          label="Select Existing In-situ Test Type"
                          htmlFor={`${formId}-existing`}
                          className="project-modal__field--full"
                        >
                          <Select
                            id={`${formId}-existing`}
                            value={existingSelectId}
                            disabled={submitting}
                            options={companySelectOptions}
                            placeholder="Select Existing In-situ Test Type"
                            onChange={handleCompanyCopy}
                          />
                        </FormField>
                        <p className="manage-origins-modal__hint">
                          or - create a new in-situ test type from scratch
                        </p>
                      </section>
                    ) : null}

                    <section className="manage-insitu-modal__section">
                      <div className="manage-insitu-modal__section-head">
                        <h4 className="manage-insitu-modal__section-title">Details</h4>
                      </div>
                      <FormField
                        label="In-Situ Test Type Name"
                        required
                        error={errors.name}
                        htmlFor={`${formId}-name`}
                        className="project-modal__field--full"
                      >
                        <Input
                          id={`${formId}-name`}
                          variant="ui"
                          type="text"
                          value={draft.name}
                          disabled={submitting}
                          maxLength={MODULE_OPTION_NAME_MAX_LENGTH}
                          onChange={(event) => patchDraft({ name: event.target.value })}
                        />
                      </FormField>
                      {isEditing ? (
                        <div className="manage-insitu-modal__option-row">
                          <div className="manage-insitu-modal__option-main">
                            <span className="manage-insitu-modal__option-label">
                              Active Test Type
                            </span>
                            <span
                              className="manage-insitu-modal__help"
                              title="Inactive types stay available for reference but are listed separately."
                            >
                              <HelpIcon />
                            </span>
                          </div>
                          <div className="manage-insitu-modal__option-controls">
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
                          </div>
                        </div>
                      ) : null}
                    </section>

                    <section className="manage-insitu-modal__section">
                      <div className="manage-insitu-modal__section-head">
                        <h4 className="manage-insitu-modal__section-title">Graphics</h4>
                      </div>
                      <div className="manage-insitu-modal__graphics-row">
                        <div className="manage-insitu-modal__graphic-col">
                          <span className="manage-insitu-modal__field-label">
                            Select Test Graphic
                          </span>
                          <button
                            type="button"
                            className="manage-insitu-modal__graphic-card"
                            disabled={submitting || graphicsLoading}
                            onClick={() => setGraphicPicker("test")}
                          >
                            {selectedTestGraphicUrl ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={selectedTestGraphicUrl}
                                alt={insituGraphicLabel(draft.graphic, "test")}
                                className="manage-insitu-modal__graphic-card-image"
                              />
                            ) : (
                              <span className="manage-insitu-modal__graphic-card-placeholder">
                                Select Graphic
                              </span>
                            )}
                            <span className="manage-insitu-modal__graphic-card-title">
                              {insituGraphicLabel(draft.graphic, "test")}
                            </span>
                          </button>
                        </div>

                        <div className="manage-insitu-modal__graphic-col">
                          <div className="manage-insitu-modal__option-row manage-insitu-modal__option-row--compact">
                            <div className="manage-insitu-modal__option-main">
                              <span className="manage-insitu-modal__option-label">
                                Use segregated graphic
                              </span>
                              <span
                                className="manage-insitu-modal__help"
                                title="When enabled, choose separate top and bottom graphics."
                              >
                                <HelpIcon />
                              </span>
                            </div>
                            <div className="manage-insitu-modal__option-controls">
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
                                          bottomGraphic:
                                            draft.bottomGraphic || "graphic_00.svg",
                                        }
                                      : {}),
                                  })
                                }
                              />
                            </div>
                          </div>

                          {draft.enableSegregatedGraphic ? (
                            <div className="manage-insitu-modal__segregated-grid">
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
                                      alt={insituGraphicLabel(draft.topGraphic, "top-bottom")}
                                      className="manage-insitu-modal__graphic-card-image manage-insitu-modal__graphic-card-image--wide"
                                    />
                                  ) : null}
                                  <span className="manage-insitu-modal__graphic-card-title">
                                    {draft.topGraphic
                                      ? insituGraphicLabel(draft.topGraphic, "top-bottom")
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
                                      alt={insituGraphicLabel(draft.bottomGraphic, "top-bottom")}
                                      className="manage-insitu-modal__graphic-card-image manage-insitu-modal__graphic-card-image--wide"
                                    />
                                  ) : null}
                                  <span className="manage-insitu-modal__graphic-card-title">
                                    {draft.bottomGraphic
                                      ? insituGraphicLabel(draft.bottomGraphic, "top-bottom")
                                      : "Select Graphic"}
                                  </span>
                                </button>
                              </div>
                            </div>
                          ) : null}
                        </div>
                      </div>
                      {graphicsError ? (
                        <p className="manage-insitu-modal__error">{graphicsError}</p>
                      ) : null}
                    </section>

                    <section className="manage-insitu-modal__section">
                      <div className="manage-insitu-modal__section-head">
                        <h4 className="manage-insitu-modal__section-title">Logging Options</h4>
                      </div>
                      <div className="manage-insitu-modal__options-list">
                        <div className="manage-insitu-modal__option-row">
                          <div className="manage-insitu-modal__option-main">
                            <span className="manage-insitu-modal__option-label">
                              Default In-Situ Testing Depth Frequency
                            </span>
                            <span
                              className="manage-insitu-modal__help"
                              title="Default depth interval used when logging this test."
                            >
                              <HelpIcon />
                            </span>
                          </div>
                          <div className="manage-insitu-modal__option-controls">
                            <Toggle
                              id={`${formId}-depth-enabled`}
                              checked={draft.depthFrequencyEnabled}
                              disabled={submitting}
                              onChange={(checked) =>
                                patchDraft({ depthFrequencyEnabled: checked })
                              }
                            />
                            <Input
                              variant="ui"
                              className="manage-insitu-modal__value-input"
                              value={draft.depthFrequency}
                              disabled={submitting || !draft.depthFrequencyEnabled}
                              placeholder="0"
                              aria-label="Depth frequency"
                              onChange={(event) =>
                                patchDraft({ depthFrequency: event.target.value })
                              }
                            />
                            <span className="manage-insitu-modal__suffix">m</span>
                          </div>
                        </div>

                        <div className="manage-insitu-modal__option-row">
                          <div className="manage-insitu-modal__option-main">
                            <span className="manage-insitu-modal__option-label">
                              Enable Sample Logging
                            </span>
                            <span
                              className="manage-insitu-modal__help"
                              title="Allow sample logging from this in-situ test."
                            >
                              <HelpIcon />
                            </span>
                          </div>
                          <div className="manage-insitu-modal__option-controls">
                            <Toggle
                              id={`${formId}-sample-logging`}
                              checked={draft.enableSampleLogging}
                              disabled={submitting}
                              onChange={(checked) =>
                                patchDraft({ enableSampleLogging: checked })
                              }
                            />
                          </div>
                        </div>

                        <div className="manage-insitu-modal__option-row">
                          <div className="manage-insitu-modal__option-main">
                            <span className="manage-insitu-modal__option-label">
                              Enable Subsurface Logging
                            </span>
                            <span
                              className="manage-insitu-modal__help"
                              title="Allow subsurface logging from this in-situ test."
                            >
                              <HelpIcon />
                            </span>
                          </div>
                          <div className="manage-insitu-modal__option-controls">
                            <Toggle
                              id={`${formId}-subsurface-logging`}
                              checked={draft.enableSubsurfaceLogging}
                              disabled={submitting}
                              onChange={(checked) =>
                                patchDraft({ enableSubsurfaceLogging: checked })
                              }
                            />
                          </div>
                        </div>

                        <div className="manage-insitu-modal__option-row manage-insitu-modal__option-row--stack">
                          <FormField
                            label="Select Default Sample Type to Create from Test"
                            htmlFor={`${formId}-sample-type`}
                            className="project-modal__field--full"
                          >
                            <Select
                              id={`${formId}-sample-type`}
                              value={draft.defaultSampleTypeId}
                              disabled={submitting}
                              options={sampleSelectOptions}
                              onChange={(value) => patchDraft({ defaultSampleTypeId: value })}
                            />
                          </FormField>
                        </div>

                        <div className="manage-insitu-modal__option-row">
                          <div className="manage-insitu-modal__option-main">
                            <span className="manage-insitu-modal__option-label">
                              Enable Auto Sample Description
                            </span>
                            <span
                              className="manage-insitu-modal__help"
                              title="Automatically generate a sample description from the test."
                            >
                              <HelpIcon />
                            </span>
                          </div>
                          <div className="manage-insitu-modal__option-controls">
                            <Toggle
                              id={`${formId}-auto-sample`}
                              checked={draft.enableAutoSampleDescription}
                              disabled={submitting}
                              onChange={(checked) =>
                                patchDraft({ enableAutoSampleDescription: checked })
                              }
                            />
                          </div>
                        </div>
                      </div>
                    </section>

                    {draft.settings.otherSettings.length > 0 ? (
                      <section className="manage-insitu-modal__section">
                        <div className="manage-insitu-modal__section-head">
                          <h4 className="manage-insitu-modal__section-title">Test Settings</h4>
                          <p className="manage-insitu-modal__section-desc">
                            Type-specific options such as intervals and result calculations.
                          </p>
                        </div>

                        {draft.settings.otherSettings.map((setting, settingIndex) => {
                          const isIntervals =
                            setting.name.trim().toLowerCase() === "intervals" &&
                            Array.isArray(setting.params) &&
                            setting.params.length > 0;
                          const hasEnabled = typeof setting.enabled === "boolean";
                          const hasValue = setting.value !== undefined;

                          if (isIntervals) {
                            return (
                              <div
                                key={`${setting.name}-${settingIndex}`}
                                className="manage-insitu-modal__setting-group"
                              >
                                <div className="manage-insitu-modal__setting-group-head">
                                  <span className="manage-insitu-modal__setting-group-title">
                                    {setting.name}
                                  </span>
                                </div>
                                {setting.description ? (
                                  <p className="manage-insitu-modal__setting-group-desc">
                                    {setting.description}
                                  </p>
                                ) : null}
                                <div className="manage-insitu-modal__interval-grid">
                                  {setting.params!.map((param, paramIndex) => (
                                    <label
                                      key={`${intervalParamLabel(param)}-${paramIndex}`}
                                      className="manage-insitu-modal__interval-item"
                                      htmlFor={`${formId}-interval-${settingIndex}-${paramIndex}`}
                                    >
                                      <Toggle
                                        id={`${formId}-interval-${settingIndex}-${paramIndex}`}
                                        checked={param.active !== false}
                                        disabled={submitting}
                                        onChange={(checked) =>
                                          setIntervalParamActive(
                                            settingIndex,
                                            paramIndex,
                                            checked
                                          )
                                        }
                                      />
                                      <span>{intervalParamLabel(param)}</span>
                                    </label>
                                  ))}
                                </div>
                              </div>
                            );
                          }

                          if (!hasEnabled && !hasValue) return null;

                          return (
                            <div
                              key={`${setting.name}-${settingIndex}`}
                              className="manage-insitu-modal__option-row"
                            >
                              <div className="manage-insitu-modal__option-main">
                                <span className="manage-insitu-modal__option-label">
                                  {setting.name}
                                </span>
                                {setting.description ? (
                                  <span
                                    className="manage-insitu-modal__help"
                                    title={setting.description}
                                  >
                                    <HelpIcon />
                                  </span>
                                ) : null}
                              </div>
                              <div className="manage-insitu-modal__option-controls">
                                {hasEnabled ? (
                                  <Toggle
                                    id={`${formId}-other-${settingIndex}`}
                                    checked={Boolean(setting.enabled)}
                                    disabled={submitting}
                                    onChange={(checked) =>
                                      setOtherSettingEnabled(settingIndex, checked)
                                    }
                                  />
                                ) : null}
                                {hasValue ? (
                                  <Input
                                    variant="ui"
                                    className="manage-insitu-modal__value-input"
                                    value={
                                      setting.value === null || setting.value === undefined
                                        ? ""
                                        : String(setting.value)
                                    }
                                    disabled={
                                      submitting ||
                                      (hasEnabled && setting.enabled === false)
                                    }
                                    aria-label={`${setting.name} value`}
                                    onChange={(event) => {
                                      const raw = event.target.value;
                                      if (raw.trim() === "") {
                                        setOtherSettingValue(settingIndex, null);
                                        return;
                                      }
                                      const asNumber = Number(raw);
                                      setOtherSettingValue(
                                        settingIndex,
                                        Number.isFinite(asNumber) &&
                                          raw.trim() !== "" &&
                                          /^-?\d+(\.\d+)?$/.test(raw.trim())
                                          ? asNumber
                                          : raw
                                      );
                                    }}
                                  />
                                ) : null}
                              </div>
                            </div>
                          );
                        })}
                      </section>
                    ) : null}

                    {isEditing ? (
                      <div className="manage-insitu-modal__danger-zone">
                        <UiButton
                          type="button"
                          variant="secondary"
                          size="sm"
                          className="ui-btn--danger project-modal__delete-option"
                          disabled={submitting}
                          onClick={requestDelete}
                        >
                          <TrashIcon />
                          Delete In-situ Test Type
                        </UiButton>
                      </div>
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
        title={pickerTitle}
        subtitle={pickerSubtitle}
        graphics={pickerGraphics}
        selectedFilename={pickerSelectedFilename}
        kind={pickerKind}
        loading={graphicsLoading}
        error={graphicsError}
        disabled={submitting}
        onClose={() => setGraphicPicker(null)}
        onSelect={pickGraphic}
      />

      <ConfirmDialog
        open={deleteConfirmOpen}
        title="Delete In-situ Test Type"
        message={
          selectedEntry
            ? `This will remove "${selectedEntry.name}". You must save to apply this change.`
            : "This will remove the selected in-situ test type. You must save to apply this change."
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
