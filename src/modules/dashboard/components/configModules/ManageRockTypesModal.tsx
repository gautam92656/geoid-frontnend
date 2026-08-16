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
} from "../../utils/configModuleSettings";
import {
  ROCK_GROUPS,
  ROCK_TYPE_GRAPHICS_CATALOG,
  createBlankRockTypeOption,
  getRockTypeGraphicLabel,
  getRockTypeGraphicUrl,
  type RockTypeOption,
} from "../../utils/configModules/rockType";

type ManageRockTypesModalProps = Readonly<{
  open: boolean;
  options: RockTypeOption[];
  onClose: () => void;
  onSave: (options: RockTypeOption[]) => void;
}>;

type DraftForm = {
  name: string;
  code: string;
  rockGroup: string;
  graphic: string;
};

const ROCK_GROUP_OPTIONS = [
  { value: "", label: "None" },
  ...ROCK_GROUPS.map((value) => ({ value, label: value })),
];

function optionToDraft(option: RockTypeOption | null): DraftForm {
  if (!option) {
    return {
      name: "",
      code: "",
      rockGroup: "",
      graphic: "",
    };
  }

  return {
    name: option.name,
    code: option.code ?? "",
    rockGroup: option.rockGroup?.trim() || "",
    graphic: option.graphic ?? "",
  };
}

function draftToOption(draft: DraftForm, id: string): RockTypeOption {
  return createBlankRockTypeOption({
    id,
    name: draft.name.trim(),
    code: draft.code.trim() || null,
    rockGroup: draft.rockGroup.trim() || null,
    graphic: draft.graphic.trim() || null,
  });
}

function reorderEntries(
  entries: RockTypeOption[],
  sourceId: string,
  targetId: string
): RockTypeOption[] {
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
  entries: RockTypeOption[],
  selectedId: string | null
): string | undefined {
  const trimmed = name.trim();
  if (!trimmed) return "Rock type name is required.";
  if (trimmed.length > MODULE_OPTION_NAME_MAX_LENGTH) {
    return `Name must be ${MODULE_OPTION_NAME_MAX_LENGTH} characters or fewer.`;
  }
  const duplicate = entries.some(
    (entry) => entry.id !== selectedId && entry.name.trim().toLowerCase() === trimmed.toLowerCase()
  );
  if (duplicate) return "A rock type with this name already exists.";
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

export function ManageRockTypesModal({
  open,
  options,
  onClose,
  onSave,
}: ManageRockTypesModalProps) {
  const formId = useId();
  const [entries, setEntries] = useState<RockTypeOption[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [draft, setDraft] = useState<DraftForm>(() => optionToDraft(null));
  const [errors, setErrors] = useState<{ name?: string }>({});
  const [graphicFilter, setGraphicFilter] = useState("");
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

  const selectedEntry = selectedId
    ? (entries.find((entry) => entry.id === selectedId) ?? null)
    : null;

  const filteredGraphics = useMemo(() => {
    const query = graphicFilter.trim().toLowerCase();
    if (!query) return ROCK_TYPE_GRAPHICS_CATALOG;
    return ROCK_TYPE_GRAPHICS_CATALOG.filter(
      (graphic) =>
        graphic.label.toLowerCase().includes(query) ||
        graphic.code.toLowerCase().includes(query) ||
        graphic.filename.toLowerCase().includes(query)
    );
  }, [graphicFilter]);

  const selectedGraphicUrl = getRockTypeGraphicUrl(draft.graphic);
  const selectedGraphicLabel = getRockTypeGraphicLabel(draft.graphic);
  const graphicFieldLabel = selectedGraphicLabel
    ? `Graphic (${selectedGraphicLabel})`
    : "Graphic";

  const resetPanel = useCallback(
    (nextSelectedId: string | null, adding: boolean, nextEntries: RockTypeOption[]) => {
      setSelectedId(nextSelectedId);
      setIsAdding(adding);
      setErrors({});
      setGraphicFilter("");
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
      setGraphicFilter("");
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

  const applyCurrentPanel = useCallback((): RockTypeOption[] | null => {
    const nameError = validateName(draft.name, entries, isAdding ? null : selectedId);
    if (nameError) {
      setErrors({ name: nameError });
      return null;
    }

    if (isAdding) {
      if (entries.length >= MODULE_OPTIONS_MAX_COUNT) {
        setErrors({ name: `You can add up to ${MODULE_OPTIONS_MAX_COUNT} rock types.` });
        return null;
      }
      return [...entries, draftToOption(draft, createOptionId("rock-type"))];
    }

    if (!selectedId) return entries;
    return entries.map((entry) =>
      entry.id === selectedId ? draftToOption(draft, selectedId) : entry
    );
  }, [draft, entries, isAdding, selectedId]);

  const handleSelectEntry = (entry: RockTypeOption) => {
    const nextEntries = applyCurrentPanel();
    if (!nextEntries) return;
    setEntries(nextEntries);
    resetPanel(entry.id, false, nextEntries);
  };

  const handleAddClick = () => {
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
    ? "Add New Rock Type"
    : selectedEntry
      ? `Edit ${selectedEntry.name}`
      : "Edit Rock Type";

  return (
    <ProjectModalPortal open={open}>
      <div className="project-modal project-modal--stacked project-modal--nested" role="presentation">
        <button
          type="button"
          className="project-modal__backdrop"
          aria-label="Close Manage Rock Types dialog"
          onClick={onClose}
        />

        <div
          className="project-modal__dialog project-modal__dialog--scroll project-modal__dialog--split project-modal__dialog--fields manage-origins-modal"
          role="dialog"
          aria-modal="true"
          aria-labelledby="manage-rock-types-title"
        >
          <div className="project-modal__header">
            <h2 id="manage-rock-types-title" className="project-modal__title">
              Manage Rock Types
            </h2>
            <p className="project-modal__subtitle">
              Manage your existing rock types by selecting from the left menu. You can also drag to
              reorder. You also have the option to create a new rock or copy an existing one used
              elsewhere in your company account.
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

                  <ul className="project-modal__type-list" role="listbox" aria-label="Rock types">
                    {entries.length === 0 ? (
                      <li className="project-modal__type-list-empty">No rock types yet.</li>
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

                  <div className="project-modal__fields project-modal__fields--stack manage-origins-modal__fields">
                    <FormField
                      label="Rock Type Name"
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

                    <FormField
                      label="Rock Type Code"
                      htmlFor={`${formId}-code`}
                      className="project-modal__field--full"
                    >
                      <Input
                        id={`${formId}-code`}
                        variant="ui"
                        type="text"
                        value={draft.code}
                        disabled={submitting}
                        maxLength={32}
                        onChange={(event) => patchDraft({ code: event.target.value })}
                      />
                    </FormField>

                    <FormField
                      label="Rock Group"
                      htmlFor={`${formId}-group`}
                      className="project-modal__field--full"
                    >
                      <Select
                        id={`${formId}-group`}
                        value={draft.rockGroup}
                        disabled={submitting}
                        options={ROCK_GROUP_OPTIONS}
                        onChange={(value) => patchDraft({ rockGroup: value })}
                      />
                    </FormField>

                    <FormField
                      label={graphicFieldLabel}
                      htmlFor={`${formId}-graphic-search`}
                      className="project-modal__field--full"
                    >
                      <div className="manage-origins-modal__graphic-search">
                        <Input
                          id={`${formId}-graphic-search`}
                          variant="ui"
                          type="search"
                          placeholder="Search graphic code"
                          value={graphicFilter}
                          disabled={submitting}
                          onChange={(event) => setGraphicFilter(event.target.value)}
                        />
                        <span
                          className="manage-origins-modal__graphic-preview"
                          style={
                            selectedGraphicUrl
                              ? { backgroundImage: `url("${selectedGraphicUrl}")` }
                              : undefined
                          }
                          aria-hidden="true"
                        />
                      </div>
                    </FormField>

                    <div
                      className="manage-origins-modal__graphic-grid"
                      role="listbox"
                      aria-label="Rock type graphics"
                    >
                      {filteredGraphics.map((graphic) => {
                        const isNoGraphic = graphic.filename === "no_graphic.png";
                        const selected = isNoGraphic
                          ? !draft.graphic
                          : draft.graphic === graphic.filename;
                        const url = getRockTypeGraphicUrl(graphic.filename);
                        return (
                          <button
                            key={graphic.filename}
                            type="button"
                            role="option"
                            aria-selected={selected}
                            className={[
                              "manage-origins-modal__graphic-option",
                              selected ? "is-selected" : "",
                            ]
                              .filter(Boolean)
                              .join(" ")}
                            disabled={submitting}
                            title={graphic.label}
                            onClick={() =>
                              patchDraft({
                                graphic: isNoGraphic ? "" : graphic.filename,
                              })
                            }
                          >
                            <span className="manage-origins-modal__graphic-annotation">
                              {graphic.label}
                            </span>
                            <span
                              className="manage-origins-modal__graphic-option-image"
                              style={{ backgroundImage: `url("${url}")` }}
                            />
                          </button>
                        );
                      })}
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
                        Delete Rock Type
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
        title="Delete Rock Type"
        message={
          selectedEntry
            ? `This will remove "${selectedEntry.name}". You must save to apply this change.`
            : "This will remove the selected rock type. You must save to apply this change."
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
