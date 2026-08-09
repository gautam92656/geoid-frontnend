"use client";

import type { DragEvent, FormEvent } from "react";
import { useCallback, useEffect, useId, useMemo, useState } from "react";
import {
  ConfirmDialog,
  FormField,
  Input,
  Select,
  TrashIcon,
  UiButton,
  ProjectModalPortal,
} from "@/shared/components/ui";
import {
  MODULE_OPTION_NAME_MAX_LENGTH,
  MODULE_OPTIONS_MAX_COUNT,
  createOptionId,
  type ModuleNamedOption,
} from "../../utils/configModuleSettings";
import {
  createBlankRemarksQuickNoteOption,
  filterQuickNotesByRemarkType,
  parseRemarksQuickNoteOptions,
  reorderQuickNotesWithinRemarkType,
  type RemarksQuickNoteOption,
} from "../../utils/configModules/remarksQuickNote";

type ManageRemarksQuickNotesModalProps = Readonly<{
  open: boolean;
  remarkTypes: ModuleNamedOption[];
  options: RemarksQuickNoteOption[];
  /** Company-wide quick notes available to copy when adding a new one. */
  companyOptions?: RemarksQuickNoteOption[];
  onClose: () => void;
  onSave: (options: RemarksQuickNoteOption[]) => void | Promise<void>;
}>;

type DraftForm = {
  name: string;
};

const NEW_NOTE_LABEL = "New Quick Note";

function optionToDraft(option: RemarksQuickNoteOption | null): DraftForm {
  return { name: option?.name ?? "" };
}

function draftToOption(
  draft: DraftForm,
  id: string,
  remarkTypeId: string
): RemarksQuickNoteOption {
  return createBlankRemarksQuickNoteOption({
    id,
    name: draft.name.trim(),
    remarkTypeId,
  });
}

function validateName(
  name: string,
  entriesForType: RemarksQuickNoteOption[],
  selectedId: string | null
): string | undefined {
  const trimmed = name.trim();
  if (!trimmed) return "Quick note name is required.";
  if (trimmed.length > MODULE_OPTION_NAME_MAX_LENGTH) {
    return `Name must be ${MODULE_OPTION_NAME_MAX_LENGTH} characters or fewer.`;
  }
  const duplicate = entriesForType.some(
    (entry) => entry.id !== selectedId && entry.name.trim().toLowerCase() === trimmed.toLowerCase()
  );
  if (duplicate) return "A quick note with this name already exists for this remark type.";
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

export function ManageRemarksQuickNotesModal({
  open,
  remarkTypes,
  options,
  companyOptions = [],
  onClose,
  onSave,
}: ManageRemarksQuickNotesModalProps) {
  const formId = useId();
  const [entries, setEntries] = useState<RemarksQuickNoteOption[]>([]);
  const [selectedRemarkTypeId, setSelectedRemarkTypeId] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [draft, setDraft] = useState<DraftForm>(() => optionToDraft(null));
  const [errors, setErrors] = useState<{ name?: string }>({});
  const [companyCopyId, setCompanyCopyId] = useState("");
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

  const remarkTypeSelectOptions = useMemo(
    () => remarkTypes.map((entry) => ({ value: entry.id, label: entry.name })),
    [remarkTypes]
  );

  const notesForType = useMemo(
    () => filterQuickNotesByRemarkType(entries, selectedRemarkTypeId),
    [entries, selectedRemarkTypeId]
  );

  const selectedEntry = selectedId
    ? (entries.find((entry) => entry.id === selectedId) ?? null)
    : null;

  const discardIncompleteAdd = isAdding && !draft.name.trim();

  const companySelectOptions = useMemo(
    () =>
      companyOptions
        .filter((option) => {
          if (selectedRemarkTypeId && option.remarkTypeId !== selectedRemarkTypeId) {
            return false;
          }
          return !notesForType.some(
            (entry) => entry.name.trim().toLowerCase() === option.name.trim().toLowerCase()
          );
        })
        .map((option) => ({ value: option.id, label: option.name })),
    [companyOptions, notesForType, selectedRemarkTypeId]
  );

  const resetPanel = useCallback(
    (nextSelectedId: string | null, adding: boolean, nextEntries: RemarksQuickNoteOption[]) => {
      setSelectedId(nextSelectedId);
      setIsAdding(adding);
      setErrors({});
      setCompanyCopyId("");
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

  const selectRemarkTypeAndPanel = useCallback(
    (remarkTypeId: string, nextEntries: RemarksQuickNoteOption[]) => {
      setSelectedRemarkTypeId(remarkTypeId);
      const typed = filterQuickNotesByRemarkType(nextEntries, remarkTypeId);
      const firstEntry = typed[0];
      if (firstEntry) {
        resetPanel(firstEntry.id, false, nextEntries);
      } else {
        resetPanel(null, true, nextEntries);
      }
    },
    [resetPanel]
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
      setCompanyCopyId("");
      setDraggingId(null);
      setDragOverId(null);
      setDeleteConfirmOpen(false);
      return;
    }

    const nextEntries = parseRemarksQuickNoteOptions(options, []);
    setEntries(nextEntries);

    const firstRemarkTypeId = remarkTypes[0]?.id ?? "";
    selectRemarkTypeAndPanel(firstRemarkTypeId, nextEntries);
  }, [open, options, remarkTypes, selectRemarkTypeAndPanel]);

  const patchDraft = (partial: Partial<DraftForm>) => {
    setDraft((prev) => ({ ...prev, ...partial }));
    setErrors({});
  };

  const commitDraft = useCallback((): RemarksQuickNoteOption[] | null => {
    if (!selectedRemarkTypeId) {
      setErrors({ name: "Select a remark type before saving a quick note." });
      return null;
    }

    const nameError = validateName(draft.name, notesForType, isAdding ? null : selectedId);
    if (nameError) {
      setErrors({ name: nameError });
      return null;
    }

    if (isAdding) {
      if (notesForType.length >= MODULE_OPTIONS_MAX_COUNT) {
        setErrors({
          name: `You can add up to ${MODULE_OPTIONS_MAX_COUNT} quick notes per remark type.`,
        });
        return null;
      }
      return [
        ...entries,
        draftToOption(draft, createOptionId("remarks-quick-note"), selectedRemarkTypeId),
      ];
    }

    if (!selectedId) return entries;
    return entries.map((entry) =>
      entry.id === selectedId ? draftToOption(draft, selectedId, selectedRemarkTypeId) : entry
    );
  }, [draft, entries, isAdding, notesForType, selectedId, selectedRemarkTypeId]);

  const handleRemarkTypeChange = (remarkTypeId: string) => {
    if (remarkTypeId === selectedRemarkTypeId) return;

    if (isAdding && !draft.name.trim()) {
      selectRemarkTypeAndPanel(remarkTypeId, entries);
      return;
    }

    if (isAdding || selectedId) {
      const nextEntries = commitDraft();
      if (!nextEntries) return;
      setEntries(nextEntries);
      selectRemarkTypeAndPanel(remarkTypeId, nextEntries);
      return;
    }

    selectRemarkTypeAndPanel(remarkTypeId, entries);
  };

  const handleSelectEntry = (entry: RemarksQuickNoteOption) => {
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
    if (!selectedRemarkTypeId) return;

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

  const requestDelete = () => {
    if (isAdding || !selectedId) return;
    setDeleteConfirmOpen(true);
  };

  const handleConfirmDelete = () => {
    if (isAdding || !selectedId) return;

    const remaining = entries.filter((entry) => entry.id !== selectedId);
    setEntries(remaining);

    const typed = filterQuickNotesByRemarkType(remaining, selectedRemarkTypeId);
    const nextEntry = typed[0];
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
    if (!sourceId || !selectedRemarkTypeId) return;
    setEntries((current) =>
      reorderQuickNotesWithinRemarkType(current, selectedRemarkTypeId, sourceId, targetId)
    );
    setDraggingId(null);
    setDragOverId(null);
  };

  const handleDragEnd = () => {
    setDraggingId(null);
    setDragOverId(null);
  };

  const persistEntries = async (nextEntries: RemarksQuickNoteOption[]) => {
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

    if (!selectedRemarkTypeId && remarkTypes.length === 0) {
      void persistEntries(entries);
      return;
    }

    if (discardIncompleteAdd) {
      if (notesForType.length === 0 && entries.length === 0) {
        setErrors({ name: "Quick note name is required." });
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
    ? "Add New Quick Note"
    : selectedEntry
      ? `Edit ${draft.name.trim() || selectedEntry.name}`
      : "Edit Quick Note";

  const listLabelForEntry = (entry: RemarksQuickNoteOption) => {
    if (!isAdding && selectedId === entry.id) {
      return draft.name.trim() || entry.name;
    }
    return entry.name;
  };

  const hasRemarkTypes = remarkTypes.length > 0;

  return (
    <ProjectModalPortal open={open}>
      <div className="project-modal project-modal--stacked project-modal--nested" role="presentation">
        <button
          type="button"
          className="project-modal__backdrop"
          aria-label="Close Manage Remarks Quick Notes dialog"
          onClick={onClose}
        />

        <div
          className="project-modal__dialog project-modal__dialog--scroll project-modal__dialog--split project-modal__dialog--fields"
          role="dialog"
          aria-modal="true"
          aria-labelledby="manage-remarks-quick-notes-title"
        >
          <div className="project-modal__header">
            <h2 id="manage-remarks-quick-notes-title" className="project-modal__title">
              Manage Remarks Quick Notes
            </h2>
            {/* <p className="project-modal__subtitle">
              Manage your existing quick notes by selecting from the left menu. You can also drag to
              reorder. You also have the option to create a new Quick Note or copy an existing one
              used elsewhere in your company account.
            </p> */}
          </div>

          <form id={formId} className="project-modal__form" onSubmit={handleSubmit} noValidate>
            <div className="project-modal__body ui-scrollbar">
              <div className="project-modal__split">
                <aside className="project-modal__split-sidebar">
                  <FormField
                    label="Select Remark Type"
                    htmlFor={`${formId}-remark-type`}
                    className="project-modal__field--full manage-remarks-quick-notes__remark-type"
                  >
                    <Select
                      id={`${formId}-remark-type`}
                      value={selectedRemarkTypeId}
                      disabled={submitting || !hasRemarkTypes}
                      options={remarkTypeSelectOptions}
                      placeholder="Select Remark Type"
                      onChange={handleRemarkTypeChange}
                    />
                  </FormField>

                  <div className="project-modal__split-sidebar-head">
                    <span className="project-modal__split-sidebar-label">Quick Notes</span>
                    <UiButton
                      type="button"
                      variant="primary"
                      size="sm"
                      disabled={
                        submitting ||
                        !selectedRemarkTypeId ||
                        notesForType.length >= MODULE_OPTIONS_MAX_COUNT
                      }
                      onClick={handleAddClick}
                    >
                      Add
                    </UiButton>
                  </div>

                  <ul
                    className="project-modal__type-list"
                    role="listbox"
                    aria-label="Quick notes"
                  >
                    {!hasRemarkTypes ? (
                      <li className="project-modal__type-list-empty">
                        Add remark types first, then create quick notes for each type.
                      </li>
                    ) : notesForType.length === 0 && !isAdding ? (
                      <li className="project-modal__type-list-empty">No quick notes yet.</li>
                    ) : (
                      <>
                        {notesForType.map((entry) => {
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
                                {draft.name.trim() || NEW_NOTE_LABEL}
                              </span>
                            </div>
                          </li>
                        ) : null}
                      </>
                    )}
                  </ul>
                </aside>

                <div className="project-modal__split-main">
                  {!hasRemarkTypes ? (
                    <p className="project-modal__split-main-subtitle">
                      Create at least one Remark Type before managing quick notes.
                    </p>
                  ) : (
                    <>
                      <h3 className="project-modal__split-main-title">{panelTitle}</h3>
                      {/* {isAdding ? (
                        <p className="project-modal__split-main-subtitle">
                          Create a Quick Note from new, or select a Quick Note that has been created
                          in other Log Configurations by your company.
                        </p>
                      ) : null} */}

                      <div className="project-modal__fields project-modal__fields--stack manage-origins-modal__fields">
                        {/* {isAdding ? (
                          <>
                            <FormField
                              label="Select Existing Quick Note"
                              htmlFor={`${formId}-company-copy`}
                              className="project-modal__field--full"
                            >
                              <Select
                                id={`${formId}-company-copy`}
                                value={companyCopyId}
                                disabled={submitting || companySelectOptions.length === 0}
                                options={companySelectOptions}
                                placeholder="Select Existing Quick Note"
                                onChange={handleCompanyCopy}
                              />
                            </FormField>

                            <p className="manage-origins-modal__hint">
                              Or - create a new quick note from scratch
                            </p>
                            <div className="manage-origins-modal__divider" aria-hidden="true" />
                          </>
                        ) : null} */}

                        <FormField
                          label="Quick Note Name"
                          required
                          error={errors.name}
                          htmlFor={`${formId}-name`}
                          className="project-modal__field--full"
                        >
                          <Input
                            id={`${formId}-name`}
                            variant="ui"
                            type="text"
                            placeholder="Quick Note Name"
                            value={draft.name}
                            disabled={submitting || !selectedRemarkTypeId}
                            maxLength={MODULE_OPTION_NAME_MAX_LENGTH}
                            onChange={(event) => patchDraft({ name: event.target.value })}
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
                            Delete Quick Note
                          </UiButton>
                        ) : null}
                      </div>
                    </>
                  )}
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
        title="Delete Quick Note"
        message={
          selectedEntry
            ? `This will remove "${selectedEntry.name}". You must save to apply this change.`
            : "This will remove the selected quick note. You must save to apply this change."
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
