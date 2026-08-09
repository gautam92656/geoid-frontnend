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
import type { CustomFieldOptionsMeta } from "../data/projectDetailFields";
import {
  MANAGEABLE_PROJECT_DETAIL_FIELD_META,
  type ManageableProjectDetailFieldKey,
} from "../data/projectDetailFields";

type ManageCustomFieldOptionsModalProps = Readonly<{
  open: boolean;
  meta: CustomFieldOptionsMeta | null;
  options: string[];
  onClose: () => void;
  onSave: (options: string[]) => void | Promise<void>;
}>;

type OptionEntry = {
  id: string;
  name: string;
};

const NAME_MAX_LENGTH = 200;

function createEntryId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `option-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function optionsToEntries(options: string[]): OptionEntry[] {
  return options.map((name) => ({ id: createEntryId(), name }));
}

function entriesToOptions(entries: OptionEntry[]): string[] {
  return entries.map((entry) => entry.name.trim()).filter(Boolean);
}

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

function validateName(name: string, entries: OptionEntry[], selectedId: string | null): string | undefined {
  const trimmed = name.trim();
  if (!trimmed) return "Name is required.";
  if (trimmed.length > NAME_MAX_LENGTH) {
    return `Name must be ${NAME_MAX_LENGTH} characters or fewer.`;
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

export function ManageCustomFieldOptionsModal({
  open,
  meta,
  options,
  onClose,
  onSave,
}: ManageCustomFieldOptionsModalProps) {
  const formId = useId();
  const nameInputId = useId();

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

  const selectedEntry = selectedId ? entries.find((entry) => entry.id === selectedId) ?? null : null;

  const resetPanel = useCallback((nextSelectedId: string | null, adding: boolean, nextEntries: OptionEntry[]) => {
    setSelectedId(nextSelectedId);
    setIsAdding(adding);
    setErrors({});

    if (adding) {
      setNameInput("");
      return;
    }

    const entry = nextSelectedId ? nextEntries.find((item) => item.id === nextSelectedId) : null;
    setNameInput(entry?.name ?? "");
  }, []);

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
    if (!open) {
      setErrors({});
      setDraggingId(null);
      setDragOverId(null);
      setDeleteConfirmOpen(false);
      return;
    }

    const nextEntries = optionsToEntries(options);
    setEntries(nextEntries);

    const firstEntry = nextEntries[0];
    if (firstEntry) {
      resetPanel(firstEntry.id, false, nextEntries);
    } else {
      resetPanel(null, true, nextEntries);
    }
  }, [meta, open, options, resetPanel]);

  const applyCurrentPanel = useCallback((): OptionEntry[] | null => {
    const trimmed = nameInput.trim();
    const nameError = validateName(nameInput, entries, isAdding ? null : selectedId);
    if (nameError) {
      setErrors({ name: nameError });
      return null;
    }

    if (isAdding) {
      return [...entries, { id: createEntryId(), name: trimmed }];
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
      await onSave(entriesToOptions(nextEntries));
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
          aria-labelledby="manage-project-detail-options-title"
        >
          <div className="project-modal__header">
            <h2 id="manage-project-detail-options-title" className="project-modal__title">
              {metaResolved.manageTitle}
            </h2>
            <p className="project-modal__subtitle">{metaResolved.manageDescription}</p>
          </div>

          <form id={formId} className="project-modal__form" onSubmit={(event) => void handleSubmit(event)} noValidate>
            <div className="project-modal__body ui-scrollbar">
              <div className="project-modal__split">
                <aside className="project-modal__split-sidebar">
                  <div className="project-modal__split-sidebar-head">
                    <span className="project-modal__split-sidebar-label">{metaResolved.sidebarLabel}</span>
                    <UiButton type="button" variant="primary" size="sm" onClick={handleAddClick}>
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
                                draggable
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
                        onChange={(event) => {
                          setNameInput(event.target.value);
                          setErrors({});
                        }}
                        maxLength={NAME_MAX_LENGTH}
                      />
                    </FormField>

                    {isEditing ? (
                      <UiButton
                        type="button"
                        variant="secondary"
                        size="sm"
                        className="ui-btn--danger project-modal__delete-option"
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
        variant="danger"
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteConfirmOpen(false)}
      />
    </ProjectModalPortal>
  );
}

export function ManageProjectDetailOptionsModal({
  open,
  fieldKey,
  options,
  onClose,
  onSave,
}: Readonly<{
  open: boolean;
  fieldKey: ManageableProjectDetailFieldKey | null;
  options: string[];
  onClose: () => void;
  onSave: (options: string[]) => void;
}>) {
  const meta = fieldKey ? MANAGEABLE_PROJECT_DETAIL_FIELD_META[fieldKey] : null;

  return (
    <ManageCustomFieldOptionsModal
      open={open}
      meta={meta}
      options={options}
      onClose={onClose}
      onSave={onSave}
    />
  );
}
