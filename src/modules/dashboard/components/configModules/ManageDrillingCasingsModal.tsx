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
  DEFAULT_DRILLING_CASING_GRAPHIC,
  DRILLING_CASING_TABLOGS_ALIAS_OPTIONS,
  FALLBACK_CASING_TYPE_GRAPHICS,
  casingTypeGraphicLabel,
  createBlankDrillingCasingOption,
  getCasingTypeGraphicUrl,
  parseDrillingCasingOptions,
  toCasingTypeGraphicCatalogEntry,
  type CasingTypeGraphicCatalogEntry,
  type DrillingCasingOption,
} from "../../utils/configModules/drillingCasing";
import {
  FALLBACK_DRILLING_OBSERVATION_GRAPHICS,
  drillingObservationGraphicLabel,
  getDrillingObservationGraphicUrl,
  toDrillingObservationGraphicCatalogEntry,
  type DrillingObservationGraphicCatalogEntry,
} from "../../utils/configModules/drillingObservation";
import { listCasingTypeGraphics } from "../../services/casingTypeGraphicsApi";
import { listDrillingObservationGraphics } from "../../services/drillingObservationGraphicsApi";
import { SelectDrillingGraphicsModal } from "./SelectDrillingGraphicsModal";

type ManageDrillingCasingsModalProps = Readonly<{
  open: boolean;
  options: DrillingCasingOption[];
  /** Company-wide casings available to copy when adding. */
  companyOptions?: DrillingCasingOption[];
  onClose: () => void;
  onSave: (options: DrillingCasingOption[]) => void | Promise<void>;
}>;

type DraftForm = {
  name: string;
  tablogsAlias: string;
  graphic: string;
  startGraphic: string;
  endGraphic: string;
};

type GraphicPickerTarget = "graphic" | "start" | "end" | null;

const NEW_TYPE_LABEL = "New Drilling Casing";

function optionToDraft(option: DrillingCasingOption | null): DraftForm {
  if (!option) {
    return {
      name: "",
      tablogsAlias: "",
      graphic: DEFAULT_DRILLING_CASING_GRAPHIC,
      startGraphic: "",
      endGraphic: "",
    };
  }

  return {
    name: option.name,
    tablogsAlias: option.tablogsAlias ?? "",
    graphic: option.graphic ?? DEFAULT_DRILLING_CASING_GRAPHIC,
    startGraphic: option.startGraphic ?? "",
    endGraphic: option.endGraphic ?? "",
  };
}

function draftToOption(draft: DraftForm, id: string): DrillingCasingOption {
  return createBlankDrillingCasingOption({
    id,
    name: draft.name.trim(),
    tablogsAlias: draft.tablogsAlias.trim() || null,
    graphic: draft.graphic.trim() || DEFAULT_DRILLING_CASING_GRAPHIC,
    startGraphic: draft.startGraphic.trim() || null,
    endGraphic: draft.endGraphic.trim() || null,
  });
}

function reorderEntries(
  entries: DrillingCasingOption[],
  sourceId: string,
  targetId: string
): DrillingCasingOption[] {
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
  entries: DrillingCasingOption[],
  selectedId: string | null
): string | undefined {
  const trimmed = name.trim();
  if (!trimmed) return "Drilling casing name is required.";
  if (trimmed.length > MODULE_OPTION_NAME_MAX_LENGTH) {
    return `Name must be ${MODULE_OPTION_NAME_MAX_LENGTH} characters or fewer.`;
  }
  const duplicate = entries.some(
    (entry) => entry.id !== selectedId && entry.name.trim().toLowerCase() === trimmed.toLowerCase()
  );
  if (duplicate) return "A drilling casing with this name already exists.";
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

export function ManageDrillingCasingsModal({
  open,
  options,
  companyOptions = [],
  onClose,
  onSave,
}: ManageDrillingCasingsModalProps) {
  const formId = useId();
  const [entries, setEntries] = useState<DrillingCasingOption[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [draft, setDraft] = useState<DraftForm>(() => optionToDraft(null));
  const [errors, setErrors] = useState<{ name?: string }>({});
  const [companyCopyId, setCompanyCopyId] = useState("");
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [graphicPicker, setGraphicPicker] = useState<GraphicPickerTarget>(null);
  const [casingGraphics, setCasingGraphics] = useState<CasingTypeGraphicCatalogEntry[]>([]);
  const [symbolGraphics, setSymbolGraphics] = useState<DrillingObservationGraphicCatalogEntry[]>(
    []
  );
  const [graphicsLoading, setGraphicsLoading] = useState(false);
  const [graphicsError, setGraphicsError] = useState<string | null>(null);

  const selectedEntry = selectedId
    ? (entries.find((entry) => entry.id === selectedId) ?? null)
    : null;

  const selectedGraphicUrl = getCasingTypeGraphicUrl(draft.graphic);
  const selectedStartGraphicUrl = getDrillingObservationGraphicUrl(draft.startGraphic);
  const selectedEndGraphicUrl = getDrillingObservationGraphicUrl(draft.endGraphic);
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
    () => DRILLING_CASING_TABLOGS_ALIAS_OPTIONS.map((entry) => ({ ...entry })),
    []
  );

  const resetPanel = useCallback(
    (nextSelectedId: string | null, adding: boolean, nextEntries: DrillingCasingOption[]) => {
      setSelectedId(nextSelectedId);
      setIsAdding(adding);
      setErrors({});
      setCompanyCopyId("");
      setGraphicPicker(null);
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
      setErrors({});
      setCompanyCopyId("");
      setDraggingId(null);
      setDragOverId(null);
      setDeleteConfirmOpen(false);
      setGraphicPicker(null);
      setGraphicsError(null);
      return;
    }

    const nextEntries = parseDrillingCasingOptions(options, []);
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

    void Promise.all([
      listCasingTypeGraphics()
        .then((catalog) => {
          const fromApi = (catalog.graphics ?? []).map((entry) =>
            toCasingTypeGraphicCatalogEntry(entry.filename, entry.label)
          );
          return fromApi.length > 0 ? fromApi : [...FALLBACK_CASING_TYPE_GRAPHICS];
        })
        .catch((error: unknown) => {
          console.warn(
            error instanceof Error ? error.message : "Failed to load casing type graphics."
          );
          return [...FALLBACK_CASING_TYPE_GRAPHICS];
        }),
      listDrillingObservationGraphics()
        .then((catalog) => {
          const fromApi = (catalog.graphics ?? []).map((entry) =>
            toDrillingObservationGraphicCatalogEntry(entry.filename, entry.label)
          );
          return fromApi.length > 0
            ? fromApi
            : [...FALLBACK_DRILLING_OBSERVATION_GRAPHICS];
        })
        .catch((error: unknown) => {
          console.warn(
            error instanceof Error
              ? error.message
              : "Failed to load drilling symbol graphics."
          );
          return [...FALLBACK_DRILLING_OBSERVATION_GRAPHICS];
        }),
    ])
      .then(([nextCasingGraphics, nextSymbolGraphics]) => {
        if (cancelled) return;
        setCasingGraphics(nextCasingGraphics);
        setSymbolGraphics(nextSymbolGraphics);
        setGraphicsError(null);
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

  const commitDraft = useCallback((): DrillingCasingOption[] | null => {
    const nameError = validateName(draft.name, entries, isAdding ? null : selectedId);
    if (nameError) {
      setErrors({ name: nameError });
      return null;
    }

    if (isAdding) {
      if (entries.length >= MODULE_OPTIONS_MAX_COUNT) {
        setErrors({
          name: `You can add up to ${MODULE_OPTIONS_MAX_COUNT} drilling casings.`,
        });
        return null;
      }
      return [...entries, draftToOption(draft, createOptionId("drilling-casing"))];
    }

    if (!selectedId) return entries;
    return entries.map((entry) =>
      entry.id === selectedId ? draftToOption(draft, selectedId) : entry
    );
  }, [draft, entries, isAdding, selectedId]);

  const handleSelectEntry = (entry: DrillingCasingOption) => {
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
    if (graphicPicker === "start") {
      patchDraft({ startGraphic: filename });
    } else if (graphicPicker === "end") {
      patchDraft({ endGraphic: filename });
    } else {
      patchDraft({ graphic: filename });
    }
    setGraphicPicker(null);
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

  const persistEntries = async (nextEntries: DrillingCasingOption[]) => {
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

    if (discardIncompleteAdd) {
      if (entries.length === 0) {
        setErrors({ name: "Drilling casing name is required." });
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
    ? "Add New Drilling Casing"
    : selectedEntry
      ? "Edit"
      : "Edit Drilling Casing";
  const panelSubtitle =
    !isAdding && selectedEntry
      ? draft.name.trim() || selectedEntry.name
      : null;

  const listLabelForEntry = (entry: DrillingCasingOption) => {
    if (!isAdding && selectedId === entry.id) {
      return draft.name.trim() || entry.name;
    }
    return entry.name;
  };

  const pickerSelectedFilename =
    graphicPicker === "start"
      ? draft.startGraphic
      : graphicPicker === "end"
        ? draft.endGraphic
        : draft.graphic;

  const pickerUsesSymbols = graphicPicker === "start" || graphicPicker === "end";
  const pickerGraphics = pickerUsesSymbols ? symbolGraphics : casingGraphics;

  const pickerTitle =
    graphicPicker === "start"
      ? "Select Start Graphic"
      : graphicPicker === "end"
        ? "Select End Graphic"
        : "Select Casing Graphic";

  const pickerSubtitle = pickerUsesSymbols
    ? "Select a graphic from drilling symbols."
    : "Select a graphic for the currently adding or updating drilling casing.";

  const pickerFallbackLabel = pickerUsesSymbols
    ? drillingObservationGraphicLabel
    : casingTypeGraphicLabel;

  return (
    <ProjectModalPortal open={open}>
      <div className="project-modal project-modal--stacked project-modal--nested" role="presentation">
        <button
          type="button"
          className="project-modal__backdrop"
          aria-label="Close Manage Drilling Casings dialog"
          onClick={onClose}
        />

        <div
          className="project-modal__dialog project-modal__dialog--scroll project-modal__dialog--split project-modal__dialog--fields"
          role="dialog"
          aria-modal="true"
          aria-labelledby="manage-drilling-casings-title"
        >
          <div className="project-modal__header">
            <h2 id="manage-drilling-casings-title" className="project-modal__title">
              Manage Drilling Casings
            </h2>
            <p className="project-modal__subtitle">
              Manage your existing drilling casings by selecting from the left menu. You can also
              drag to reorder. You also have the option to create a new Drilling Casing or copy an
              existing one used elsewhere in your company account.
            </p>
          </div>

          <form id={formId} className="project-modal__form" onSubmit={handleSubmit} noValidate>
            <div className="project-modal__body ui-scrollbar">
              <div className="project-modal__split">
                <aside className="project-modal__split-sidebar">
                  <div className="project-modal__split-sidebar-head">
                    <span className="project-modal__split-sidebar-label">Casings</span>
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
                    aria-label="Drilling casings"
                  >
                    {entries.length === 0 && !isAdding ? (
                      <li className="project-modal__type-list-empty">No drilling casings yet.</li>
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
                  {panelSubtitle ? (
                    <p className="project-modal__split-main-subtitle">{panelSubtitle}</p>
                  ) : null}
                  {isAdding ? (
                    <p className="project-modal__split-main-subtitle">
                      Create a new drilling casing, or copy one used elsewhere in your company
                      account.
                    </p>
                  ) : null}

                  <div className="project-modal__fields project-modal__fields--stack manage-origins-modal__fields">
                    {isAdding && companySelectOptions.length > 0 ? (
                      <>
                        <FormField
                          label="Select Existing Drilling Casing"
                          htmlFor={`${formId}-company-copy`}
                          className="project-modal__field--full"
                        >
                          <Select
                            id={`${formId}-company-copy`}
                            value={companyCopyId}
                            disabled={submitting}
                            options={companySelectOptions}
                            placeholder="Select Existing Drilling Casing"
                            onChange={handleCompanyCopy}
                          />
                        </FormField>

                        <p className="manage-origins-modal__hint">
                          or - create a new Drilling Casing from scratch
                        </p>
                        <div className="manage-origins-modal__divider" aria-hidden="true" />
                      </>
                    ) : null}

                    <div className="manage-origins-modal__row">
                      <FormField
                        label="Drilling Casing Name"
                        required
                        error={errors.name}
                        htmlFor={`${formId}-name`}
                        className="manage-origins-modal__half"
                      >
                        <Input
                          id={`${formId}-name`}
                          variant="ui"
                          type="text"
                          placeholder="Drilling Casing Name"
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

                    <div className="manage-drilling-casing-modal__graphics">
                      <div className="manage-drilling-casing-modal__graphic-block">
                        <span className="manage-insitu-modal__field-label">Graphic</span>
                        <button
                          type="button"
                          className="manage-insitu-modal__graphic-card manage-drilling-casing-modal__graphic-card"
                          disabled={submitting || graphicsLoading}
                          onClick={() => setGraphicPicker("graphic")}
                        >
                          {selectedGraphicUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={selectedGraphicUrl}
                              alt={casingTypeGraphicLabel(draft.graphic)}
                              className="manage-drilling-casing-modal__graphic-image"
                            />
                          ) : (
                            <span className="manage-insitu-modal__graphic-card-placeholder">
                              Select Graphic
                            </span>
                          )}
                          <span className="manage-insitu-modal__graphic-card-title">
                            {casingTypeGraphicLabel(draft.graphic)}
                          </span>
                        </button>
                      </div>

                      <div className="manage-drilling-casing-modal__graphic-block">
                        <span className="manage-insitu-modal__field-label">Start Graphic</span>
                        <button
                          type="button"
                          className="manage-insitu-modal__graphic-card manage-drilling-casing-modal__graphic-card"
                          disabled={submitting || graphicsLoading}
                          onClick={() => setGraphicPicker("start")}
                        >
                          {selectedStartGraphicUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={selectedStartGraphicUrl}
                              alt={drillingObservationGraphicLabel(draft.startGraphic)}
                              className="manage-drilling-casing-modal__graphic-image"
                            />
                          ) : (
                            <span className="manage-insitu-modal__graphic-card-placeholder">
                              Select Graphic
                            </span>
                          )}
                          <span className="manage-insitu-modal__graphic-card-title">
                            {drillingObservationGraphicLabel(draft.startGraphic)}
                          </span>
                        </button>
                      </div>

                      <div className="manage-drilling-casing-modal__graphic-block">
                        <span className="manage-insitu-modal__field-label">End Graphic</span>
                        <button
                          type="button"
                          className="manage-insitu-modal__graphic-card manage-drilling-casing-modal__graphic-card"
                          disabled={submitting || graphicsLoading}
                          onClick={() => setGraphicPicker("end")}
                        >
                          {selectedEndGraphicUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={selectedEndGraphicUrl}
                              alt={drillingObservationGraphicLabel(draft.endGraphic)}
                              className="manage-drilling-casing-modal__graphic-image"
                            />
                          ) : (
                            <span className="manage-insitu-modal__graphic-card-placeholder">
                              Select Graphic
                            </span>
                          )}
                          <span className="manage-insitu-modal__graphic-card-title">
                            {drillingObservationGraphicLabel(draft.endGraphic)}
                          </span>
                        </button>
                      </div>
                    </div>

                    {graphicsError ? (
                      <p className="manage-insitu-modal__error">{graphicsError}</p>
                    ) : null}

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
                        Delete Drilling Casing
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
        open={graphicPicker !== null}
        graphics={pickerGraphics}
        selectedFilename={pickerSelectedFilename}
        loading={graphicsLoading}
        error={graphicsError}
        disabled={submitting}
        variant="square"
        title={pickerTitle}
        subtitle={pickerSubtitle}
        listAriaLabel={
          pickerUsesSymbols ? "Drilling symbol graphics" : "Drilling casing graphics"
        }
        closeAriaLabel={
          pickerUsesSymbols
            ? "Close Select Drilling Symbol Graphic dialog"
            : "Close Select Casing Graphic dialog"
        }
        fallbackLabel={pickerFallbackLabel}
        onClose={() => setGraphicPicker(null)}
        onSelect={pickGraphic}
      />

      <ConfirmDialog
        open={deleteConfirmOpen}
        title="Delete Drilling Casing"
        message={
          selectedEntry
            ? `This will remove "${selectedEntry.name}". You must save to apply this change.`
            : "This will remove the selected drilling casing. You must save to apply this change."
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
