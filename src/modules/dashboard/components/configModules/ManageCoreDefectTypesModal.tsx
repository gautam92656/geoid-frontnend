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
  CORE_DEFECT_TYPE_GRAPHICS_CATALOG,
  createBlankCoreDefectTypeOption,
  getCoreDefectTypeGraphicLabel,
  getCoreDefectTypeGraphicUrl,
  parseCoreDefectTypeOptions,
  type CoreDefectTypeOption,
} from "../../utils/configModules/coreDefectType";

type ManageCoreDefectTypesModalProps = Readonly<{
  open: boolean;
  options: CoreDefectTypeOption[];
  /** Company-wide types available to copy when adding a new type. */
  companyOptions?: CoreDefectTypeOption[];
  /** Sample types available for the default sample type dropdown. */
  sampleTypeOptions?: ReadonlyArray<{ id: string; name: string }>;
  onClose: () => void;
  onSave: (options: CoreDefectTypeOption[]) => void | Promise<void>;
}>;

type DraftForm = {
  name: string;
  code: string;
  graphic: string;
  defaultSampleTypeId: string;
};

function optionToDraft(option: CoreDefectTypeOption | null): DraftForm {
  if (!option) {
    return {
      name: "",
      code: "",
      graphic: "",
      defaultSampleTypeId: "",
    };
  }

  return {
    name: option.name,
    code: option.code ?? "",
    graphic: option.graphic ?? "",
    defaultSampleTypeId: option.defaultSampleTypeId ?? "",
  };
}

function draftToOption(draft: DraftForm, id: string): CoreDefectTypeOption {
  return createBlankCoreDefectTypeOption({
    id,
    name: draft.name.trim(),
    code: draft.code.trim() || null,
    graphic: draft.graphic.trim() || null,
    defaultSampleTypeId: draft.defaultSampleTypeId.trim() || null,
  });
}

function reorderEntries(
  entries: CoreDefectTypeOption[],
  sourceId: string,
  targetId: string
): CoreDefectTypeOption[] {
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
  entries: CoreDefectTypeOption[],
  selectedId: string | null
): string | undefined {
  const trimmed = name.trim();
  if (!trimmed) return "Core defect type name is required.";
  if (trimmed.length > MODULE_OPTION_NAME_MAX_LENGTH) {
    return `Name must be ${MODULE_OPTION_NAME_MAX_LENGTH} characters or fewer.`;
  }
  const duplicate = entries.some(
    (entry) => entry.id !== selectedId && entry.name.trim().toLowerCase() === trimmed.toLowerCase()
  );
  if (duplicate) return "A core defect type with this name already exists.";
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

export function ManageCoreDefectTypesModal({
  open,
  options,
  companyOptions = [],
  sampleTypeOptions = [],
  onClose,
  onSave,
}: ManageCoreDefectTypesModalProps) {
  const formId = useId();
  const [entries, setEntries] = useState<CoreDefectTypeOption[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [draft, setDraft] = useState<DraftForm>(() => optionToDraft(null));
  const [errors, setErrors] = useState<{ name?: string }>({});
  const [graphicFilter, setGraphicFilter] = useState("");
  const [companyCopyId, setCompanyCopyId] = useState("");
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

  const selectedEntry = selectedId
    ? (entries.find((entry) => entry.id === selectedId) ?? null)
    : null;

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

  const filteredGraphics = useMemo(() => {
    const query = graphicFilter.trim().toLowerCase();
    if (!query) return CORE_DEFECT_TYPE_GRAPHICS_CATALOG;
    return CORE_DEFECT_TYPE_GRAPHICS_CATALOG.filter(
      (graphic) =>
        graphic.label.toLowerCase().includes(query) ||
        graphic.code.toLowerCase().includes(query) ||
        graphic.filename.toLowerCase().includes(query)
    );
  }, [graphicFilter]);

  const selectedGraphicUrl = getCoreDefectTypeGraphicUrl(draft.graphic);
  const selectedGraphicLabel = getCoreDefectTypeGraphicLabel(draft.graphic);
  const graphicFieldLabel = selectedGraphicLabel
    ? `Graphic (${selectedGraphicLabel})`
    : "Graphic";

  const resetPanel = useCallback(
    (nextSelectedId: string | null, adding: boolean, nextEntries: CoreDefectTypeOption[]) => {
      setSelectedId(nextSelectedId);
      setIsAdding(adding);
      setErrors({});
      setGraphicFilter("");
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
      setGraphicFilter("");
      return;
    }

    const nextEntries = parseCoreDefectTypeOptions(options, []);
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

  const applyCurrentPanel = useCallback((): CoreDefectTypeOption[] | null => {
    const nameError = validateName(draft.name, entries, isAdding ? null : selectedId);
    if (nameError) {
      setErrors({ name: nameError });
      return null;
    }

    if (isAdding) {
      if (entries.length >= MODULE_OPTIONS_MAX_COUNT) {
        setErrors({ name: `You can add up to ${MODULE_OPTIONS_MAX_COUNT} core defect types.` });
        return null;
      }
      return [...entries, draftToOption(draft, createOptionId("core-defect-type"))];
    }

    if (!selectedId) return entries;
    return entries.map((entry) =>
      entry.id === selectedId ? draftToOption(draft, selectedId) : entry
    );
  }, [draft, entries, isAdding, selectedId]);

  const handleSelectEntry = (entry: CoreDefectTypeOption) => {
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
    if (dragOverId !== entryId) setDragOverId(entryId);
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
      // Parent surfaces the API error toast; keep the modal open for retry.
    } finally {
      setSubmitting(false);
    }
  };

  const isEditing = !isAdding && selectedEntry !== null;
  const panelTitle = isAdding
    ? "Add New Core Defect Type"
    : selectedEntry
      ? `Edit ${draft.name.trim() || selectedEntry.name}`
      : "Edit Core Defect Type";

  const listLabelForEntry = (entry: CoreDefectTypeOption) => {
    if (!isAdding && selectedId === entry.id) {
      return draft.name.trim() || entry.name;
    }
    return entry.name;
  };

  return (
    <ProjectModalPortal open={open}>
      <div className="project-modal project-modal--stacked project-modal--nested" role="presentation">
        <button
          type="button"
          className="project-modal__backdrop"
          aria-label="Close Manage Core Defect Types dialog"
          onClick={onClose}
        />

        <div
          className="project-modal__dialog project-modal__dialog--scroll project-modal__dialog--split project-modal__dialog--fields manage-origins-modal"
          role="dialog"
          aria-modal="true"
          aria-labelledby="manage-core-defect-types-title"
        >
          <div className="project-modal__header">
            <h2 id="manage-core-defect-types-title" className="project-modal__title">
              Manage Core Defect Types
            </h2>
            <p className="project-modal__subtitle">
              Manage your existing Core Defect types by selecting from the left menu. You can also
              drag to reorder. You also have the option to create a new Core Defect or copy an
              existing one used elsewhere in your company account.
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
                    aria-label="Core defect types"
                  >
                    {entries.length === 0 ? (
                      <li className="project-modal__type-list-empty">No core defect types yet.</li>
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
                                {listLabelForEntry(entry)}
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
                  {isAdding ? (
                    <p className="project-modal__split-main-subtitle">
                      Create a new Core Defect, or select a Core Defect Type that has been created
                      in other Log Configurations by your company.
                    </p>
                  ) : null}

                  <div className="project-modal__fields project-modal__fields--stack manage-origins-modal__fields">
                    {isAdding ? (
                      <>
                        <FormField
                          label="Select Existing Core Defect Type"
                          htmlFor={`${formId}-company-copy`}
                          className="project-modal__field--full"
                        >
                          <Select
                            id={`${formId}-company-copy`}
                            value={companyCopyId}
                            disabled={submitting || companySelectOptions.length === 0}
                            options={companySelectOptions}
                            placeholder="Select Existing Core Defect Type"
                            onChange={handleCompanyCopy}
                          />
                        </FormField>

                        <p className="manage-origins-modal__hint">
                          or - create a new Core Defect type from scratch
                        </p>
                        <div className="manage-origins-modal__divider" aria-hidden="true" />
                      </>
                    ) : null}

                    <FormField
                      label="Core Defect Type Name"
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
                      label="Core Defect Code"
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
                          className="manage-origins-modal__graphic-preview manage-origins-modal__graphic-preview--zoomed"
                          style={
                            selectedGraphicUrl
                              ? { backgroundImage: `url("${selectedGraphicUrl}")` }
                              : undefined
                          }
                          aria-hidden="true"
                        />
                      </div>
                    </FormField>

                    <FormField
                      label="Select Default Sample Type"
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

                    <div
                      className="manage-origins-modal__graphic-grid"
                      role="listbox"
                      aria-label="Core defect graphics"
                    >
                      {filteredGraphics.map((graphic) => {
                        const isNoGraphic = graphic.filename === "no_graphic.png";
                        const selected = isNoGraphic
                          ? !draft.graphic
                          : draft.graphic === graphic.filename;
                        const url = getCoreDefectTypeGraphicUrl(graphic.filename);
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
                              className="manage-origins-modal__graphic-option-image manage-origins-modal__graphic-option-image--zoomed"
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
                        Delete Core Defect Type
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
        title="Delete Core Defect Type"
        message={
          selectedEntry
            ? `This will remove "${selectedEntry.name}". You must save to apply this change.`
            : "This will remove the selected core defect type. You must save to apply this change."
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
