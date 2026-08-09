"use client";

import type { DragEvent, FormEvent } from "react";
import { useCallback, useEffect, useId, useMemo, useState } from "react";
import {
  ConfirmDialog,
  FormField,
  Input,
  MultiSelect,
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
  createBlankLabTestPresetOption,
  parseLabTestPresetOptions,
  type LabTestPresetOption,
  type LabTestTypeOption,
} from "../../utils/configModules";

type ManageLabTestPresetsModalProps = Readonly<{
  open: boolean;
  options: LabTestPresetOption[];
  /** Lab test types available to include in a preset. */
  labTestTypeOptions?: LabTestTypeOption[];
  onClose: () => void;
  onSave: (options: LabTestPresetOption[]) => void | Promise<void>;
}>;

type DraftForm = {
  name: string;
  labTestTypeIds: string[];
};

const NEW_PRESET_LABEL = "New Preset";

function optionToDraft(option: LabTestPresetOption | null): DraftForm {
  if (!option) {
    return {
      name: "",
      labTestTypeIds: [],
    };
  }

  return {
    name: option.name,
    labTestTypeIds: [...option.labTestTypeIds],
  };
}

function draftToOption(draft: DraftForm, id: string): LabTestPresetOption {
  return createBlankLabTestPresetOption({
    id,
    name: draft.name.trim(),
    labTestTypeIds: [...draft.labTestTypeIds],
  });
}

function reorderEntries(
  entries: LabTestPresetOption[],
  sourceId: string,
  targetId: string
): LabTestPresetOption[] {
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
  entries: LabTestPresetOption[],
  selectedId: string | null
): string | undefined {
  const trimmed = name.trim();
  if (!trimmed) return "Preset name is required.";
  if (trimmed.length > MODULE_OPTION_NAME_MAX_LENGTH) {
    return `Name must be ${MODULE_OPTION_NAME_MAX_LENGTH} characters or fewer.`;
  }
  const duplicate = entries.some(
    (entry) => entry.id !== selectedId && entry.name.trim().toLowerCase() === trimmed.toLowerCase()
  );
  if (duplicate) return "A lab test preset with this name already exists.";
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

function listLabelForEntry(entry: LabTestPresetOption): string {
  return entry.name.trim() || NEW_PRESET_LABEL;
}

export function ManageLabTestPresetsModal({
  open,
  options,
  labTestTypeOptions = [],
  onClose,
  onSave,
}: ManageLabTestPresetsModalProps) {
  const formId = useId();
  const [entries, setEntries] = useState<LabTestPresetOption[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [draft, setDraft] = useState<DraftForm>(() => optionToDraft(null));
  const [errors, setErrors] = useState<{ name?: string }>({});
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

  const selectedEntry = selectedId
    ? (entries.find((entry) => entry.id === selectedId) ?? null)
    : null;

  const discardIncompleteAdd = isAdding && !draft.name.trim();

  const labTestSelectOptions = useMemo(
    () =>
      labTestTypeOptions
        .filter((entry) => entry.id.trim() && entry.name.trim())
        .map((entry) => ({ value: entry.id, label: entry.name })),
    [labTestTypeOptions]
  );

  const panelTitle = isAdding
    ? "Add New Preset"
    : selectedEntry
      ? selectedEntry.name.trim() || "Edit Preset"
      : "Edit Preset";

  const resetPanel = useCallback(
    (nextSelectedId: string | null, adding: boolean, nextEntries: LabTestPresetOption[]) => {
      setSelectedId(nextSelectedId);
      setIsAdding(adding);
      setErrors({});
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
        event.stopImmediatePropagation();
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown, true);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown, true);
    };
  }, [deleteConfirmOpen, onClose, open]);

  useEffect(() => {
    if (!open) {
      setErrors({});
      setDraggingId(null);
      setDragOverId(null);
      setDeleteConfirmOpen(false);
      return;
    }

    const nextEntries = parseLabTestPresetOptions(options, []);
    setEntries(nextEntries);

    const firstEntry = nextEntries[0];
    if (firstEntry) {
      resetPanel(firstEntry.id, false, nextEntries);
    } else {
      resetPanel(null, true, nextEntries);
    }
  }, [open, options, resetPanel]);

  const patchDraft = (patch: Partial<DraftForm>) => {
    setDraft((current) => ({ ...current, ...patch }));
  };

  const commitDraft = useCallback((): LabTestPresetOption[] | null => {
    const nameError = validateName(draft.name, entries, isAdding ? null : selectedId);
    if (nameError) {
      setErrors({ name: nameError });
      return null;
    }
    setErrors({});

    if (isAdding) {
      if (entries.length >= MODULE_OPTIONS_MAX_COUNT) {
        setErrors({
          name: `You can add up to ${MODULE_OPTIONS_MAX_COUNT} lab test presets.`,
        });
        return null;
      }
      return [...entries, draftToOption(draft, createOptionId("lab-test-preset"))];
    }

    if (!selectedId) return entries;
    return entries.map((entry) =>
      entry.id === selectedId ? draftToOption(draft, selectedId) : entry
    );
  }, [draft, entries, isAdding, selectedId]);

  const handleSelectEntry = (entry: LabTestPresetOption) => {
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

  const handleDragEnd = () => {
    setDraggingId(null);
    setDragOverId(null);
  };

  const handleDragOver = (event: DragEvent<HTMLLIElement>, entryId: string) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
    if (dragOverId !== entryId) setDragOverId(entryId);
  };

  const handleDrop = (event: DragEvent<HTMLLIElement>, targetId: string) => {
    event.preventDefault();
    const sourceId = draggingId || event.dataTransfer.getData("text/plain");
    setDraggingId(null);
    setDragOverId(null);
    if (!sourceId) return;

    const nextEntries = discardIncompleteAdd
      ? reorderEntries(entries, sourceId, targetId)
      : (() => {
          const committed = commitDraft();
          if (!committed) return null;
          return reorderEntries(committed, sourceId, targetId);
        })();

    if (!nextEntries) return;
    setEntries(nextEntries);

    if (isAdding && discardIncompleteAdd) {
      resetPanel(null, true, nextEntries);
      return;
    }

    const keepSelected =
      selectedId && nextEntries.some((entry) => entry.id === selectedId) ? selectedId : targetId;
    resetPanel(keepSelected, false, nextEntries);
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const nextEntries = commitDraft();
    if (!nextEntries) return;

    setSubmitting(true);
    try {
      await onSave(nextEntries);
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) return null;

  return (
    <ProjectModalPortal open={open}>
      <div className="project-modal project-modal--stacked project-modal--nested" role="presentation">
        <button
          type="button"
          className="project-modal__backdrop"
          aria-label="Close Manage Lab Test Presets dialog"
          onClick={onClose}
        />

        <div
          className="project-modal__dialog project-modal__dialog--scroll project-modal__dialog--split project-modal__dialog--fields"
          role="dialog"
          aria-modal="true"
          aria-labelledby="manage-lab-test-presets-title"
        >
          <div className="project-modal__header">
            <h2 id="manage-lab-test-presets-title" className="project-modal__title">
              Manage Lab Test Presets
            </h2>
            <p className="project-modal__subtitle">
              Manage the lab test presets which are made available by this log configuration.
            </p>
          </div>

          <form id={formId} className="project-modal__form" onSubmit={handleSubmit} noValidate>
            <div className="project-modal__body ui-scrollbar">
              <div className="project-modal__split">
                <aside className="project-modal__split-sidebar">
                  <div className="project-modal__split-sidebar-head">
                    <span className="project-modal__split-sidebar-label">Lab Test Presets</span>
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
                    aria-label="Lab test presets"
                  >
                    {entries.length === 0 && !isAdding ? (
                      <li className="project-modal__type-list-empty">No lab test presets yet.</li>
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
                                {draft.name.trim() || NEW_PRESET_LABEL}
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

                  <div className="project-modal__fields project-modal__fields--stack manage-origins-modal__fields">
                    <FormField
                      label="Preset Name"
                      htmlFor={`${formId}-name`}
                      error={errors.name}
                      className="project-modal__field--full"
                    >
                      <Input
                        id={`${formId}-name`}
                        variant="ui"
                        value={draft.name}
                        disabled={submitting}
                        maxLength={MODULE_OPTION_NAME_MAX_LENGTH}
                        placeholder="Preset Name"
                        onChange={(event) => {
                          patchDraft({ name: event.target.value });
                          if (errors.name) setErrors({});
                        }}
                      />
                    </FormField>

                    <FormField
                      label="Lab Test Types"
                      htmlFor={`${formId}-lab-test-types`}
                      hint="Select the lab test types to include in this preset"
                      className="project-modal__field--full"
                    >
                      <MultiSelect
                        id={`${formId}-lab-test-types`}
                        value={draft.labTestTypeIds}
                        disabled={submitting || labTestSelectOptions.length === 0}
                        options={labTestSelectOptions}
                        placeholder="Select lab test types"
                        search
                        searchPlaceholder="Search lab test types…"
                        onChange={(value) => patchDraft({ labTestTypeIds: value })}
                      />
                    </FormField>

                    {!isAdding && selectedId ? (
                      <UiButton
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="ui-btn--danger project-modal__delete-option"
                        disabled={submitting}
                        onClick={requestDelete}
                      >
                        <TrashIcon />
                        Delete Lab Test Preset
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

      <ConfirmDialog
        open={deleteConfirmOpen}
        title="Delete Lab Test Preset"
        message={
          selectedEntry
            ? `This will remove "${selectedEntry.name}". You must save to apply this change.`
            : "This will remove the selected lab test preset. You must save to apply this change."
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
