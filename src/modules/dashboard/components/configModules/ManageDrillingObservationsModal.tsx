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
  DEFAULT_DRILLING_OBSERVATION_GRAPHIC,
  DRILLING_OBSERVATION_TABLOGS_ALIAS_OPTIONS,
  FALLBACK_DRILLING_OBSERVATION_GRAPHICS,
  createBlankDrillingObservationOption,
  drillingObservationGraphicLabel,
  getDrillingObservationGraphicUrl,
  parseDrillingObservationOptions,
  toDrillingObservationGraphicCatalogEntry,
  type DrillingObservationGraphicCatalogEntry,
  type DrillingObservationOption,
} from "../../utils/configModules/drillingObservation";
import { listDrillingObservationGraphics } from "../../services/drillingObservationGraphicsApi";
import { SelectDrillingGraphicsModal } from "./SelectDrillingGraphicsModal";

type ManageDrillingObservationsModalProps = Readonly<{
  open: boolean;
  options: DrillingObservationOption[];
  /** Company-wide observations available to copy when adding. */
  companyOptions?: DrillingObservationOption[];
  onClose: () => void;
  onSave: (options: DrillingObservationOption[]) => void | Promise<void>;
}>;

type DraftForm = {
  name: string;
  tablogsAlias: string;
  graphic: string;
  depthRequired: boolean;
  observationDateTimeRequired: boolean;
  isDepthOfCasing: boolean;
  isDepthToWater: boolean;
};

const NEW_TYPE_LABEL = "New Drilling Observation";

function optionToDraft(option: DrillingObservationOption | null): DraftForm {
  if (!option) {
    return {
      name: "",
      tablogsAlias: "",
      graphic: DEFAULT_DRILLING_OBSERVATION_GRAPHIC,
      depthRequired: false,
      observationDateTimeRequired: false,
      isDepthOfCasing: false,
      isDepthToWater: false,
    };
  }

  return {
    name: option.name,
    tablogsAlias: option.tablogsAlias ?? "",
    graphic: option.graphic ?? DEFAULT_DRILLING_OBSERVATION_GRAPHIC,
    depthRequired: Boolean(option.depthRequired),
    observationDateTimeRequired: Boolean(option.observationDateTimeRequired),
    isDepthOfCasing: Boolean(option.isDepthOfCasing),
    isDepthToWater: Boolean(option.isDepthToWater),
  };
}

function draftToOption(draft: DraftForm, id: string): DrillingObservationOption {
  return createBlankDrillingObservationOption({
    id,
    name: draft.name.trim(),
    tablogsAlias: draft.tablogsAlias.trim() || null,
    graphic: draft.graphic.trim() || DEFAULT_DRILLING_OBSERVATION_GRAPHIC,
    depthRequired: draft.depthRequired,
    observationDateTimeRequired: draft.observationDateTimeRequired,
    isDepthOfCasing: draft.isDepthOfCasing,
    isDepthToWater: draft.isDepthToWater,
  });
}

function reorderEntries(
  entries: DrillingObservationOption[],
  sourceId: string,
  targetId: string
): DrillingObservationOption[] {
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
  entries: DrillingObservationOption[],
  selectedId: string | null
): string | undefined {
  const trimmed = name.trim();
  if (!trimmed) return "Drilling observation name is required.";
  if (trimmed.length > MODULE_OPTION_NAME_MAX_LENGTH) {
    return `Name must be ${MODULE_OPTION_NAME_MAX_LENGTH} characters or fewer.`;
  }
  const duplicate = entries.some(
    (entry) => entry.id !== selectedId && entry.name.trim().toLowerCase() === trimmed.toLowerCase()
  );
  if (duplicate) return "A drilling observation with this name already exists.";
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

export function ManageDrillingObservationsModal({
  open,
  options,
  companyOptions = [],
  onClose,
  onSave,
}: ManageDrillingObservationsModalProps) {
  const formId = useId();
  const [entries, setEntries] = useState<DrillingObservationOption[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [draft, setDraft] = useState<DraftForm>(() => optionToDraft(null));
  const [errors, setErrors] = useState<{ name?: string }>({});
  const [companyCopyId, setCompanyCopyId] = useState("");
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [graphicPickerOpen, setGraphicPickerOpen] = useState(false);
  const [graphics, setGraphics] = useState<DrillingObservationGraphicCatalogEntry[]>([]);
  const [graphicsLoading, setGraphicsLoading] = useState(false);
  const [graphicsError, setGraphicsError] = useState<string | null>(null);

  const selectedEntry = selectedId
    ? (entries.find((entry) => entry.id === selectedId) ?? null)
    : null;

  const selectedGraphicUrl = getDrillingObservationGraphicUrl(draft.graphic);
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
    () => DRILLING_OBSERVATION_TABLOGS_ALIAS_OPTIONS.map((entry) => ({ ...entry })),
    []
  );

  const resetPanel = useCallback(
    (
      nextSelectedId: string | null,
      adding: boolean,
      nextEntries: DrillingObservationOption[]
    ) => {
      setSelectedId(nextSelectedId);
      setIsAdding(adding);
      setErrors({});
      setCompanyCopyId("");
      setGraphicPickerOpen(false);
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
        if (graphicPickerOpen) {
          setGraphicPickerOpen(false);
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
  }, [deleteConfirmOpen, graphicPickerOpen, onClose, open]);

  useEffect(() => {
    if (!open) {
      setErrors({});
      setCompanyCopyId("");
      setDraggingId(null);
      setDragOverId(null);
      setDeleteConfirmOpen(false);
      setGraphicPickerOpen(false);
      setGraphicsError(null);
      return;
    }

    const nextEntries = parseDrillingObservationOptions(options, []);
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

    listDrillingObservationGraphics()
      .then((catalog) => {
        if (cancelled) return;
        const fromApi = (catalog.graphics ?? []).map((entry) =>
          toDrillingObservationGraphicCatalogEntry(entry.filename, entry.label)
        );
        setGraphics(
          fromApi.length > 0 ? fromApi : [...FALLBACK_DRILLING_OBSERVATION_GRAPHICS]
        );
        setGraphicsError(null);
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        // Keep picker usable with local fallback catalog; don't block on API failure.
        setGraphics([...FALLBACK_DRILLING_OBSERVATION_GRAPHICS]);
        setGraphicsError(null);
        console.warn(
          error instanceof Error
            ? error.message
            : "Failed to load drilling observation graphics."
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

  const commitDraft = useCallback((): DrillingObservationOption[] | null => {
    const nameError = validateName(draft.name, entries, isAdding ? null : selectedId);
    if (nameError) {
      setErrors({ name: nameError });
      return null;
    }

    if (isAdding) {
      if (entries.length >= MODULE_OPTIONS_MAX_COUNT) {
        setErrors({
          name: `You can add up to ${MODULE_OPTIONS_MAX_COUNT} drilling observations.`,
        });
        return null;
      }
      return [...entries, draftToOption(draft, createOptionId("drilling-observation"))];
    }

    if (!selectedId) return entries;
    return entries.map((entry) =>
      entry.id === selectedId ? draftToOption(draft, selectedId) : entry
    );
  }, [draft, entries, isAdding, selectedId]);

  const handleSelectEntry = (entry: DrillingObservationOption) => {
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
    patchDraft({ graphic: filename });
    setGraphicPickerOpen(false);
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

  const persistEntries = async (nextEntries: DrillingObservationOption[]) => {
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

    // Empty add panel with existing entries: persist current list without creating a blank type.
    if (discardIncompleteAdd) {
      if (entries.length === 0) {
        setErrors({ name: "Drilling observation name is required." });
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
    ? "Add New Drilling Observation"
    : selectedEntry
      ? `Edit ${draft.name.trim() || selectedEntry.name}`
      : "Edit Drilling Observation";

  const listLabelForEntry = (entry: DrillingObservationOption) => {
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
          aria-label="Close Manage Drilling Observations dialog"
          onClick={onClose}
        />

        <div
          className="project-modal__dialog project-modal__dialog--scroll project-modal__dialog--split project-modal__dialog--fields"
          role="dialog"
          aria-modal="true"
          aria-labelledby="manage-drilling-observations-title"
        >
          <div className="project-modal__header">
            <h2 id="manage-drilling-observations-title" className="project-modal__title">
              Manage Drilling Observations
            </h2>
            <p className="project-modal__subtitle">
              Manage your existing drilling observations by selecting from the left menu. You can
              also drag to reorder. You also have the option to create a new Drilling Observation or
              copy an existing one used elsewhere in your company account.
            </p>
          </div>

          <form id={formId} className="project-modal__form" onSubmit={handleSubmit} noValidate>
            <div className="project-modal__body ui-scrollbar">
              <div className="project-modal__split">
                <aside className="project-modal__split-sidebar">
                  <div className="project-modal__split-sidebar-head">
                    <span className="project-modal__split-sidebar-label">Observations</span>
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
                    aria-label="Drilling observations"
                  >
                    {entries.length === 0 && !isAdding ? (
                      <li className="project-modal__type-list-empty">
                        No drilling observations yet.
                      </li>
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
                      Create a new drilling observation, or copy one used elsewhere in your company
                      account.
                    </p>
                  ) : null}

                  <div className="project-modal__fields project-modal__fields--stack manage-origins-modal__fields">
                    {isAdding && companySelectOptions.length > 0 ? (
                      <>
                        <FormField
                          label="Select Existing Drilling Observation"
                          htmlFor={`${formId}-company-copy`}
                          className="project-modal__field--full"
                        >
                          <Select
                            id={`${formId}-company-copy`}
                            value={companyCopyId}
                            disabled={submitting}
                            options={companySelectOptions}
                            placeholder="Select Existing Drilling Observation"
                            onChange={handleCompanyCopy}
                          />
                        </FormField>

                        <p className="manage-origins-modal__hint">
                          or - create a new Drilling Observation from scratch
                        </p>
                        <div className="manage-origins-modal__divider" aria-hidden="true" />
                      </>
                    ) : null}

                    <div className="manage-origins-modal__row">
                      <FormField
                        label="Drilling Observation Name"
                        required
                        error={errors.name}
                        htmlFor={`${formId}-name`}
                        className="manage-origins-modal__half"
                      >
                        <Input
                          id={`${formId}-name`}
                          variant="ui"
                          type="text"
                          placeholder="Drilling Observation Name"
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

                    <div className="manage-drilling-obs-modal__graphic-block">
                      <span className="manage-insitu-modal__field-label">
                        Select Drilling Graphic
                      </span>
                      <button
                        type="button"
                        className="manage-insitu-modal__graphic-card manage-drilling-obs-modal__graphic-card"
                        disabled={submitting || graphicsLoading}
                        onClick={() => setGraphicPickerOpen(true)}
                      >
                        {selectedGraphicUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={selectedGraphicUrl}
                            alt={drillingObservationGraphicLabel(draft.graphic)}
                            className="manage-drilling-obs-modal__graphic-image"
                          />
                        ) : (
                          <span className="manage-insitu-modal__graphic-card-placeholder">
                            Select Graphic
                          </span>
                        )}
                        <span className="manage-insitu-modal__graphic-card-title">
                          {drillingObservationGraphicLabel(draft.graphic)}
                        </span>
                      </button>
                    </div>

                    {graphicsError ? (
                      <p className="manage-insitu-modal__error">{graphicsError}</p>
                    ) : null}

                    <div className="manage-insitu-modal__settings">
                      <label
                        className="manage-insitu-modal__toggle-inline"
                        htmlFor={`${formId}-depth-required`}
                      >
                        <Toggle
                          id={`${formId}-depth-required`}
                          checked={draft.depthRequired}
                          disabled={submitting}
                          onChange={(checked) => patchDraft({ depthRequired: checked })}
                        />
                        <span>Depth Required</span>
                      </label>

                      <label
                        className="manage-insitu-modal__toggle-inline"
                        htmlFor={`${formId}-datetime-required`}
                      >
                        <Toggle
                          id={`${formId}-datetime-required`}
                          checked={draft.observationDateTimeRequired}
                          disabled={submitting}
                          onChange={(checked) =>
                            patchDraft({ observationDateTimeRequired: checked })
                          }
                        />
                        <span>Observation Date/Time Required</span>
                      </label>

                      <label
                        className="manage-insitu-modal__toggle-inline"
                        htmlFor={`${formId}-depth-casing`}
                      >
                        <Toggle
                          id={`${formId}-depth-casing`}
                          checked={draft.isDepthOfCasing}
                          disabled={submitting}
                          onChange={(checked) => patchDraft({ isDepthOfCasing: checked })}
                        />
                        <span>Is Depth of Casing</span>
                      </label>

                      <label
                        className="manage-insitu-modal__toggle-inline"
                        htmlFor={`${formId}-depth-water`}
                      >
                        <Toggle
                          id={`${formId}-depth-water`}
                          checked={draft.isDepthToWater}
                          disabled={submitting}
                          onChange={(checked) => patchDraft({ isDepthToWater: checked })}
                        />
                        <span>Is Depth to Water</span>
                      </label>
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
                        Delete Drilling Observation
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

      <SelectDrillingGraphicsModal
        open={graphicPickerOpen}
        graphics={graphics}
        selectedFilename={draft.graphic}
        loading={graphicsLoading}
        error={graphicsError}
        disabled={submitting}
        variant="square"
        title="Select Drilling Observation Graphic"
        subtitle="Select a graphic for the currently adding or updating drilling observation."
        listAriaLabel="Drilling observation graphics"
        closeAriaLabel="Close Select Drilling Observation Graphic dialog"
        fallbackLabel={drillingObservationGraphicLabel}
        onClose={() => setGraphicPickerOpen(false)}
        onSelect={pickGraphic}
      />

      <ConfirmDialog
        open={deleteConfirmOpen}
        title="Delete Drilling Observation"
        message={
          selectedEntry
            ? `This will remove "${selectedEntry.name}". You must save to apply this change.`
            : "This will remove the selected drilling observation. You must save to apply this change."
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
