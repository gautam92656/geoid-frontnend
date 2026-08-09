"use client";

import type { DragEvent, FormEvent } from "react";
import { useCallback, useEffect, useId, useRef, useState } from "react";
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
  type ModuleNamedOption,
} from "../utils/configModuleSettings";

export type ModuleDataTypeMeta = {
  manageTitle: string;
  manageDescription: string;
  sidebarLabel: string;
  nameLabel: string;
  deleteLabel: string;
  addPanelTitle: string;
  editPanelTitle: string;
};

type ManageModuleDataTypeModalProps = Readonly<{
  open: boolean;
  meta: ModuleDataTypeMeta | null;
  options: ModuleNamedOption[];
  /** When false, wait before seeding local state (e.g. API still loading). */
  optionsReady?: boolean;
  onClose: () => void;
  onSave: (options: ModuleNamedOption[]) => void;
}>;

type OptionEntry = ModuleNamedOption;

function reorderEntries(entries: OptionEntry[], sourceId: string, targetId: string): OptionEntry[] {
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
  entries: OptionEntry[],
  selectedId: string | null
): string | undefined {
  const trimmed = name.trim();
  if (!trimmed) return "Name is required.";
  if (trimmed.length > MODULE_OPTION_NAME_MAX_LENGTH) {
    return `Name must be ${MODULE_OPTION_NAME_MAX_LENGTH} characters or fewer.`;
  }
  const duplicate = entries.some(
    (entry) => entry.id !== selectedId && entry.name.trim().toLowerCase() === trimmed.toLowerCase()
  );
  if (duplicate) return "An item with this name already exists.";
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

export function ManageModuleDataTypeModal({
  open,
  meta,
  options,
  optionsReady = true,
  onClose,
  onSave,
}: ManageModuleDataTypeModalProps) {
  const formId = useId();
  const nameInputId = useId();
  const seededRef = useRef(false);
  const [entries, setEntries] = useState<OptionEntry[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [nameInput, setNameInput] = useState("");
  const [errors, setErrors] = useState<{ name?: string }>({});
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

  const metaResolved = meta;
  const selectedEntry = selectedId
    ? (entries.find((entry) => entry.id === selectedId) ?? null)
    : null;

  const resetPanel = useCallback(
    (nextSelectedId: string | null, adding: boolean, nextEntries: OptionEntry[]) => {
      setSelectedId(nextSelectedId);
      setIsAdding(adding);
      setErrors({});
      if (adding) {
        setNameInput("");
        return;
      }
      const entry = nextSelectedId
        ? (nextEntries.find((item) => item.id === nextSelectedId) ?? null)
        : null;
      setNameInput(entry?.name ?? "");
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
      seededRef.current = false;
      setErrors({});
      setDraggingId(null);
      setDragOverId(null);
      setDeleteConfirmOpen(false);
      return;
    }

    // Seed once per open after options are ready — avoid wiping in-progress name edits.
    if (!optionsReady || seededRef.current) return;
    seededRef.current = true;

    const nextEntries = options.map((entry) => ({ ...entry }));
    setEntries(nextEntries);

    const firstEntry = nextEntries[0];
    if (firstEntry) {
      resetPanel(firstEntry.id, false, nextEntries);
    } else {
      resetPanel(null, true, nextEntries);
    }
  }, [open, options, optionsReady, resetPanel]);

  const applyCurrentPanel = useCallback((): OptionEntry[] | null => {
    const trimmed = nameInput.trim();
    const nameError = validateName(nameInput, entries, isAdding ? null : selectedId);
    if (nameError) {
      setErrors({ name: nameError });
      return null;
    }

    if (isAdding) {
      if (entries.length >= MODULE_OPTIONS_MAX_COUNT) {
        setErrors({ name: `You can add up to ${MODULE_OPTIONS_MAX_COUNT} items.` });
        return null;
      }
      return [...entries, { id: createOptionId(), name: trimmed }];
    }

    if (!selectedId) return entries;
    return entries.map((entry) => (entry.id === selectedId ? { ...entry, name: trimmed } : entry));
  }, [entries, isAdding, nameInput, selectedId]);

  const handleSelectEntry = (entry: OptionEntry) => {
    resetPanel(entry.id, false, entries);
  };

  const handleAddClick = () => {
    resetPanel(null, true, entries);
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
      onSave(
        nextEntries.map((entry) => ({
          id: entry.id,
          name: entry.name.trim(),
        }))
      );
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  if (!metaResolved) return null;

  const isEditing = !isAdding && selectedEntry !== null;
  const panelTitle = isAdding ? metaResolved.addPanelTitle : metaResolved.editPanelTitle;

  return (
    <ProjectModalPortal open={open}>
      <div className="project-modal project-modal--stacked project-modal--nested" role="presentation">
        <button
          type="button"
          className="project-modal__backdrop"
          aria-label={`Close ${metaResolved.manageTitle} dialog`}
          onClick={onClose}
        />

        <div
          className="project-modal__dialog project-modal__dialog--scroll project-modal__dialog--split project-modal__dialog--fields"
          role="dialog"
          aria-modal="true"
          aria-labelledby="manage-module-datatype-title"
        >
          <div className="project-modal__header">
            <h2 id="manage-module-datatype-title" className="project-modal__title">
              {metaResolved.manageTitle}
            </h2>
            <p className="project-modal__subtitle">{metaResolved.manageDescription}</p>
          </div>

          <form
            id={formId}
            className="project-modal__form"
            onSubmit={(event) => void handleSubmit(event)}
            noValidate
          >
            <div className="project-modal__body ui-scrollbar">
              <div className="project-modal__split">
                <aside className="project-modal__split-sidebar">
                  <div className="project-modal__split-sidebar-head">
                    <span className="project-modal__split-sidebar-label">
                      {metaResolved.sidebarLabel}
                    </span>
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
                    aria-label={metaResolved.sidebarLabel}
                  >
                    {entries.length === 0 ? (
                      <li className="project-modal__type-list-empty">No items yet.</li>
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
                      label={metaResolved.nameLabel}
                      required
                      error={errors.name}
                      htmlFor={nameInputId}
                      className="project-modal__field--full"
                    >
                      <Input
                        id={nameInputId}
                        variant="ui"
                        type="text"
                        placeholder={metaResolved.nameLabel}
                        value={nameInput}
                        disabled={submitting}
                        maxLength={MODULE_OPTION_NAME_MAX_LENGTH}
                        onChange={(event) => {
                          setNameInput(event.target.value);
                          setErrors({});
                        }}
                      />
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
                        {metaResolved.deleteLabel}
                      </UiButton>
                    ) : null}
                  </div>
                </div>
              </div>
            </div>

            <div className="project-modal__footer">
              <UiButton type="button" variant="ghost" onClick={onClose} disabled={submitting}>
                Close
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
        title={metaResolved.deleteLabel}
        message={
          selectedEntry
            ? `This will remove "${selectedEntry.name}". You must save to apply this change.`
            : "This will remove the selected item. You must save to apply this change."
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
