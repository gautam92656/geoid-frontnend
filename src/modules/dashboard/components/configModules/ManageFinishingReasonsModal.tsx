"use client";

import type { DragEvent, FormEvent } from "react";
import { useCallback, useEffect, useId, useState } from "react";
import {
  ConfirmDialog,
  FormField,
  Input,
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
  createBlankFinishingReasonOption,
  type FinishingReasonOption,
} from "../../utils/configModules/finishingReason";

type ManageFinishingReasonsModalProps = Readonly<{
  open: boolean;
  options: FinishingReasonOption[];
  onClose: () => void;
  onSave: (options: FinishingReasonOption[]) => void;
}>;

type DraftForm = {
  name: string;
  abbreviation: string;
  showAutoScale: boolean;
};

function optionToDraft(option: FinishingReasonOption | null): DraftForm {
  if (!option) {
    return {
      name: "",
      abbreviation: "",
      showAutoScale: true,
    };
  }

  return {
    name: option.name,
    abbreviation: option.abbreviation ?? "",
    showAutoScale: option.showAutoScale ?? true,
  };
}

function draftToOption(draft: DraftForm, id: string): FinishingReasonOption {
  return createBlankFinishingReasonOption({
    id,
    name: draft.name.trim(),
    abbreviation: draft.abbreviation.trim() || "",
    showAutoScale: draft.showAutoScale,
  });
}

function reorderEntries(
  entries: FinishingReasonOption[],
  sourceId: string,
  targetId: string
): FinishingReasonOption[] {
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
  entries: FinishingReasonOption[],
  selectedId: string | null
): string | undefined {
  const trimmed = name.trim();
  if (!trimmed) return "Finishing reason name is required.";
  if (trimmed.length > MODULE_OPTION_NAME_MAX_LENGTH) {
    return `Name must be ${MODULE_OPTION_NAME_MAX_LENGTH} characters or fewer.`;
  }
  const duplicate = entries.some(
    (entry) => entry.id !== selectedId && entry.name.trim().toLowerCase() === trimmed.toLowerCase()
  );
  if (duplicate) return "A finishing reason with this name already exists.";
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

export function ManageFinishingReasonsModal({
  open,
  options,
  onClose,
  onSave,
}: ManageFinishingReasonsModalProps) {
  const formId = useId();
  const [entries, setEntries] = useState<FinishingReasonOption[]>([]);
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

  const resetPanel = useCallback(
    (nextSelectedId: string | null, adding: boolean, nextEntries: FinishingReasonOption[]) => {
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

    const nextEntries = options.map((entry) => ({ ...entry }));
    setEntries(nextEntries);

    const firstEntry = nextEntries[0];
    if (firstEntry) {
      resetPanel(firstEntry.id, false, nextEntries);
    } else {
      resetPanel(null, true, nextEntries);
    }
  }, [open, options, resetPanel]);

  const patchDraft = (partial: Partial<DraftForm>) => {
    setDraft((prev) => ({ ...prev, ...partial }));
    setErrors({});
  };

  const applyCurrentPanel = useCallback((): FinishingReasonOption[] | null => {
    const nameError = validateName(draft.name, entries, isAdding ? null : selectedId);
    if (nameError) {
      setErrors({ name: nameError });
      return null;
    }

    if (isAdding) {
      if (entries.length >= MODULE_OPTIONS_MAX_COUNT) {
        setErrors({ name: `You can add up to ${MODULE_OPTIONS_MAX_COUNT} finishing reasons.` });
        return null;
      }
      return [...entries, draftToOption(draft, createOptionId("finish-reason"))];
    }

    if (!selectedId) return entries;
    return entries.map((entry) =>
      entry.id === selectedId ? draftToOption(draft, selectedId) : entry
    );
  }, [draft, entries, isAdding, selectedId]);

  const handleSelectEntry = (entry: FinishingReasonOption) => {
    const nextEntries = applyCurrentPanel();
    if (!nextEntries) return;
    setEntries(nextEntries);
    resetPanel(entry.id, false, nextEntries);
  };

  const handleAddClick = () => {
    if (isAdding && !draft.name.trim() && entries.length === 0) {
      resetPanel(null, true, entries);
      return;
    }
    const nextEntries = applyCurrentPanel();
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

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submitting) return;

    const nextEntries = applyCurrentPanel();
    if (!nextEntries) return;

    setSubmitting(true);
    try {
      onSave(nextEntries);
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  const isEditing = !isAdding && selectedEntry !== null;
  const panelTitle = isAdding
    ? "Add New Finishing Reason"
    : selectedEntry
      ? `Edit ${selectedEntry.name}`
      : "Edit Finishing Reason";

  return (
    <ProjectModalPortal open={open}>
      <div className="project-modal project-modal--stacked project-modal--nested" role="presentation">
        <button
          type="button"
          className="project-modal__backdrop"
          aria-label="Close Manage Finishing Reasons dialog"
          onClick={onClose}
        />

        <div
          className="project-modal__dialog project-modal__dialog--scroll project-modal__dialog--split project-modal__dialog--fields"
          role="dialog"
          aria-modal="true"
          aria-labelledby="manage-finishing-reasons-title"
        >
          <div className="project-modal__header">
            <h2 id="manage-finishing-reasons-title" className="project-modal__title">
              Manage Finishing Reasons
            </h2>
            <p className="project-modal__subtitle">
              Manage your existing finishing reasons options by selecting from the left menu. You
              also have the option to create a new finishing reason.
            </p>
          </div>

          <form id={formId} className="project-modal__form" onSubmit={handleSubmit} noValidate>
            <div className="project-modal__body ui-scrollbar">
              <div className="project-modal__split">
                <aside className="project-modal__split-sidebar">
                  <div className="project-modal__split-sidebar-head">
                    <span className="project-modal__split-sidebar-label">Options</span>
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
                    aria-label="Finishing reason options"
                  >
                    {entries.length === 0 ? (
                      <li className="project-modal__type-list-empty">No finishing reasons yet.</li>
                    ) : (
                      entries.map((entry) => {
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
                </aside>

                <div className="project-modal__split-main">
                  <h3 className="project-modal__split-main-title">{panelTitle}</h3>

                  <div className="project-modal__fields project-modal__fields--stack">
                    <FormField
                      label="Finishing Reason Option Name"
                      required
                      error={errors.name}
                      htmlFor={`${formId}-name`}
                      className="project-modal__field--full"
                    >
                      <Input
                        id={`${formId}-name`}
                        variant="ui"
                        type="text"
                        placeholder="Finishing Reason Option Name"
                        value={draft.name}
                        disabled={submitting}
                        maxLength={MODULE_OPTION_NAME_MAX_LENGTH}
                        onChange={(event) => patchDraft({ name: event.target.value })}
                      />
                    </FormField>

                    <FormField
                      label="Abbreviation"
                      htmlFor={`${formId}-abbreviation`}
                      className="project-modal__field--full"
                    >
                      <Input
                        id={`${formId}-abbreviation`}
                        variant="ui"
                        type="text"
                        placeholder="Abbreviation"
                        value={draft.abbreviation}
                        disabled={submitting}
                        maxLength={32}
                        onChange={(event) => patchDraft({ abbreviation: event.target.value })}
                      />
                    </FormField>

                    <label
                      className="manage-origins-modal__toggle-row"
                      htmlFor={`${formId}-auto-scale`}
                    >
                      <Toggle
                        id={`${formId}-auto-scale`}
                        checked={draft.showAutoScale}
                        disabled={submitting}
                        onChange={(checked) => patchDraft({ showAutoScale: checked })}
                      />
                      <span>Show auto scale option</span>
                    </label>

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
                        Delete Finishing Reason Option
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
        title="Delete Finishing Reason Option"
        message={
          selectedEntry
            ? `This will remove "${selectedEntry.name}". You must save to apply this change.`
            : "This will remove the selected finishing reason. You must save to apply this change."
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
