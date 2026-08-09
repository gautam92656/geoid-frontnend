"use client";

import type { DragEvent, FormEvent } from "react";
import { useCallback, useEffect, useId, useState } from "react";
import {
  ConfirmDialog,
  FormField,
  Input,
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
  createBlankColorOption,
  normalizeColorHex,
  type ColorOption,
} from "../../utils/configModules/colorOption";

const DEFAULT_APERTURE_COLOR = "#000000";

type ManageApertureColorsModalProps = Readonly<{
  open: boolean;
  options: ColorOption[];
  onClose: () => void;
  onSave: (options: ColorOption[]) => void | Promise<void>;
}>;

type DraftForm = {
  name: string;
  color: string;
};

function optionToDraft(option: ColorOption | null): DraftForm {
  if (!option) {
    return {
      name: "",
      color: DEFAULT_APERTURE_COLOR,
    };
  }

  return {
    name: option.name,
    color: normalizeColorHex(option.color, DEFAULT_APERTURE_COLOR),
  };
}

function draftToOption(draft: DraftForm, id: string): ColorOption {
  return createBlankColorOption({
    id,
    name: draft.name.trim(),
    color: normalizeColorHex(draft.color, DEFAULT_APERTURE_COLOR),
    textColor: "#ffffff",
  });
}

function reorderEntries(
  entries: ColorOption[],
  sourceId: string,
  targetId: string
): ColorOption[] {
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
  entries: ColorOption[],
  selectedId: string | null
): string | undefined {
  const trimmed = name.trim();
  if (!trimmed) return "Color name is required.";
  if (trimmed.length > MODULE_OPTION_NAME_MAX_LENGTH) {
    return `Name must be ${MODULE_OPTION_NAME_MAX_LENGTH} characters or fewer.`;
  }
  const duplicate = entries.some(
    (entry) => entry.id !== selectedId && entry.name.trim().toLowerCase() === trimmed.toLowerCase()
  );
  if (duplicate) return "An aperture color with this name already exists.";
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

export function ManageApertureColorsModal({
  open,
  options,
  onClose,
  onSave,
}: ManageApertureColorsModalProps) {
  const formId = useId();
  const [entries, setEntries] = useState<ColorOption[]>([]);
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
    (nextSelectedId: string | null, adding: boolean, nextEntries: ColorOption[]) => {
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

  const applyCurrentPanel = useCallback((): ColorOption[] | null => {
    const nameError = validateName(draft.name, entries, isAdding ? null : selectedId);
    if (nameError) {
      setErrors({ name: nameError });
      return null;
    }

    if (isAdding) {
      if (entries.length >= MODULE_OPTIONS_MAX_COUNT) {
        setErrors({ name: `You can add up to ${MODULE_OPTIONS_MAX_COUNT} aperture colors.` });
        return null;
      }
      return [...entries, draftToOption(draft, createOptionId("aperture-color"))];
    }

    if (!selectedId) return entries;
    return entries.map((entry) =>
      entry.id === selectedId ? draftToOption(draft, selectedId) : entry
    );
  }, [draft, entries, isAdding, selectedId]);

  const handleSelectEntry = (entry: ColorOption) => {
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

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submitting) return;

    const nextEntries = applyCurrentPanel();
    if (!nextEntries) return;

    setSubmitting(true);
    try {
      await onSave(nextEntries);
      onClose();
    } catch {
      // Parent shows toast; keep modal open so the user can retry.
    } finally {
      setSubmitting(false);
    }
  };

  const isEditing = !isAdding && selectedEntry !== null;
  const panelTitle = isAdding ? "Add New Color" : selectedEntry ? "Edit" : "Edit Color";
  const panelSubtitle = isAdding ? null : selectedEntry?.name ?? null;

  return (
    <ProjectModalPortal open={open}>
      <div className="project-modal project-modal--stacked project-modal--nested" role="presentation">
        <button
          type="button"
          className="project-modal__backdrop"
          aria-label="Close Manage Aperture Colors dialog"
          onClick={onClose}
        />

        <div
          className="project-modal__dialog project-modal__dialog--scroll project-modal__dialog--split project-modal__dialog--fields"
          role="dialog"
          aria-modal="true"
          aria-labelledby="manage-aperture-colors-title"
        >
          <div className="project-modal__header">
            <h2 id="manage-aperture-colors-title" className="project-modal__title">
              Manage Aperture Colors
            </h2>
            <p className="project-modal__subtitle">
              Manage the aperture colors which are made available by this log configuration.
            </p>
          </div>

          <form id={formId} className="project-modal__form" onSubmit={handleSubmit} noValidate>
            <div className="project-modal__body ui-scrollbar">
              <div className="project-modal__split">
                <aside className="project-modal__split-sidebar">
                  <div className="project-modal__split-sidebar-head">
                    <span className="project-modal__split-sidebar-label">Aperture Colors</span>
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
                    aria-label="Aperture color options"
                  >
                    {entries.length === 0 ? (
                      <li className="project-modal__type-list-empty">No aperture colors yet.</li>
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
                                <span
                                  className="manage-colors-modal__list-swatch"
                                  style={{
                                    backgroundColor: normalizeColorHex(
                                      entry.color,
                                      DEFAULT_APERTURE_COLOR
                                    ),
                                  }}
                                  aria-hidden="true"
                                />
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
                  {panelSubtitle ? (
                    <p className="project-modal__split-main-subtitle">{panelSubtitle}</p>
                  ) : null}

                  <div className="project-modal__fields project-modal__fields--stack manage-colors-modal__fields">
                    <FormField
                      label="Color Name"
                      required
                      error={errors.name}
                      htmlFor={`${formId}-name`}
                      className="project-modal__field--full"
                    >
                      <Input
                        id={`${formId}-name`}
                        variant="ui"
                        type="text"
                        placeholder="Color Name"
                        value={draft.name}
                        disabled={submitting}
                        maxLength={MODULE_OPTION_NAME_MAX_LENGTH}
                        onChange={(event) => patchDraft({ name: event.target.value })}
                      />
                    </FormField>

                    <FormField
                      label="Select Color"
                      htmlFor={`${formId}-color`}
                      className="project-modal__field--full"
                    >
                      <div className="manage-origins-modal__color-inputs">
                        <input
                          id={`${formId}-color`}
                          type="color"
                          className="manage-origins-modal__color-swatch"
                          value={normalizeColorHex(draft.color, DEFAULT_APERTURE_COLOR)}
                          disabled={submitting}
                          aria-label="Select color"
                          onChange={(event) =>
                            patchDraft({
                              color: normalizeColorHex(event.target.value, DEFAULT_APERTURE_COLOR),
                            })
                          }
                        />
                        <Input
                          variant="ui"
                          value={draft.color}
                          disabled={submitting}
                          aria-label="Color value"
                          onChange={(event) => patchDraft({ color: event.target.value })}
                        />
                        <span
                          className="manage-origins-modal__color-chip"
                          style={{
                            backgroundColor: normalizeColorHex(
                              draft.color,
                              DEFAULT_APERTURE_COLOR
                            ),
                          }}
                          aria-hidden="true"
                        />
                      </div>
                    </FormField>

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
                        Delete Aperture Color
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
              <UiButton type="submit" variant="primary" form={formId} disabled={submitting}>
                Save
              </UiButton>
            </div>
          </form>
        </div>
      </div>

      <ConfirmDialog
        open={deleteConfirmOpen}
        title="Delete aperture color?"
        description="This removes the aperture color from the list. You can still cancel before saving."
        confirmLabel="Delete"
        cancelLabel="Keep"
        danger
        onConfirm={handleConfirmDelete}
        onClose={() => setDeleteConfirmOpen(false)}
      />
    </ProjectModalPortal>
  );
}
