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
  GEOMODAL_LAYER_GRAPHICS_CATALOG,
  createBlankGeomodalLayerOption,
  getGeomodalLayerGraphicLabel,
  getGeomodalLayerGraphicUrl,
  type GeomodalLayerOption,
} from "../../utils/configModules/geomodalLayer";

type ManageGeomodalLayerTypesModalProps = Readonly<{
  open: boolean;
  options: GeomodalLayerOption[];
  /** Company-wide types available to copy when adding a new type. */
  companyOptions?: GeomodalLayerOption[];
  onClose: () => void;
  onSave: (options: GeomodalLayerOption[]) => void | Promise<void>;
}>;

type DraftForm = {
  name: string;
  overlayColor: string;
  color: string;
  graphic: string;
};

function rgbaToHex(color: string): string {
  const trimmed = color.trim();
  if (!trimmed) return "#ffffff";
  if (/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(trimmed)) {
    if (trimmed.length === 4) {
      const r = trimmed[1];
      const g = trimmed[2];
      const b = trimmed[3];
      return `#${r}${r}${g}${g}${b}${b}`.toLowerCase();
    }
    return trimmed.toLowerCase();
  }

  const match = trimmed.match(
    /rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)(?:\s*,\s*[\d.]+)?\s*\)/i
  );
  if (!match) return "#ffffff";
  const toHex = (value: string) => Number(value).toString(16).padStart(2, "0");
  return `#${toHex(match[1])}${toHex(match[2])}${toHex(match[3])}`;
}

function hexToRgba(hex: string): string {
  const normalized = rgbaToHex(hex);
  const r = Number.parseInt(normalized.slice(1, 3), 16);
  const g = Number.parseInt(normalized.slice(3, 5), 16);
  const b = Number.parseInt(normalized.slice(5, 7), 16);
  return `rgba(${r},${g},${b},1)`;
}

function optionToDraft(option: GeomodalLayerOption | null): DraftForm {
  if (!option) {
    return {
      name: "",
      overlayColor: "",
      color: "",
      graphic: "",
    };
  }

  return {
    name: option.name,
    overlayColor: option.overlayColor?.trim() || "",
    color: option.color?.trim() || "",
    graphic: option.graphic ?? "",
  };
}

function draftToOption(draft: DraftForm, id: string): GeomodalLayerOption {
  return createBlankGeomodalLayerOption({
    id,
    name: draft.name.trim(),
    overlayColor: draft.overlayColor.trim() || null,
    color: draft.color.trim() || null,
    graphic: draft.graphic.trim() || null,
  });
}

function reorderEntries(
  entries: GeomodalLayerOption[],
  sourceId: string,
  targetId: string
): GeomodalLayerOption[] {
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
  entries: GeomodalLayerOption[],
  selectedId: string | null
): string | undefined {
  const trimmed = name.trim();
  if (!trimmed) return "Type name is required.";
  if (trimmed.length > MODULE_OPTION_NAME_MAX_LENGTH) {
    return `Name must be ${MODULE_OPTION_NAME_MAX_LENGTH} characters or fewer.`;
  }
  const duplicate = entries.some(
    (entry) => entry.id !== selectedId && entry.name.trim().toLowerCase() === trimmed.toLowerCase()
  );
  if (duplicate) return "A Geomodel Layer type with this name already exists.";
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

function ColorPickerField({
  id,
  label,
  value,
  disabled,
  onChange,
}: Readonly<{
  id: string;
  label: string;
  value: string;
  disabled?: boolean;
  onChange: (value: string) => void;
}>) {
  const hex = rgbaToHex(value || "#ffffff");
  return (
    <FormField label={label} htmlFor={id} className="project-modal__field--full">
      <div className="manage-origins-modal__color-inputs">
        <input
          id={id}
          type="color"
          className="manage-origins-modal__color-swatch"
          value={hex}
          disabled={disabled}
          aria-label={label}
          onChange={(event) => onChange(hexToRgba(event.target.value))}
        />
        <Input
          variant="ui"
          value={value}
          disabled={disabled}
          placeholder="rgba(238,43,43,1)"
          aria-label={`${label} value`}
          onChange={(event) => onChange(event.target.value)}
        />
        <span
          className={[
            "manage-origins-modal__color-chip",
            !value ? "manage-origins-modal__color-chip--empty" : "",
          ]
            .filter(Boolean)
            .join(" ")}
          style={{ backgroundColor: value || "transparent" }}
          aria-hidden="true"
        />
      </div>
    </FormField>
  );
}

export function ManageGeomodalLayerTypesModal({
  open,
  options,
  companyOptions = [],
  onClose,
  onSave,
}: ManageGeomodalLayerTypesModalProps) {
  const formId = useId();
  const [entries, setEntries] = useState<GeomodalLayerOption[]>([]);
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

  const filteredGraphics = useMemo(() => {
    const query = graphicFilter.trim().toLowerCase();
    if (!query) return GEOMODAL_LAYER_GRAPHICS_CATALOG;
    return GEOMODAL_LAYER_GRAPHICS_CATALOG.filter(
      (graphic) =>
        graphic.label.toLowerCase().includes(query) ||
        graphic.code.toLowerCase().includes(query) ||
        graphic.filename.toLowerCase().includes(query)
    );
  }, [graphicFilter]);

  const selectedGraphicUrl = getGeomodalLayerGraphicUrl(draft.graphic);
  const selectedGraphicLabel = getGeomodalLayerGraphicLabel(draft.graphic);

  const resetPanel = useCallback(
    (nextSelectedId: string | null, adding: boolean, nextEntries: GeomodalLayerOption[]) => {
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
      setDraggingId(null);
      setDragOverId(null);
      setDeleteConfirmOpen(false);
      setGraphicFilter("");
      setCompanyCopyId("");
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

  const applyCurrentPanel = useCallback((): GeomodalLayerOption[] | null => {
    const nameError = validateName(draft.name, entries, isAdding ? null : selectedId);
    if (nameError) {
      setErrors({ name: nameError });
      return null;
    }

    if (isAdding) {
      if (entries.length >= MODULE_OPTIONS_MAX_COUNT) {
        setErrors({
          name: `You can add up to ${MODULE_OPTIONS_MAX_COUNT} Geomodel Layer types.`,
        });
        return null;
      }
      return [...entries, draftToOption(draft, createOptionId("geomodal-layer"))];
    }

    if (!selectedId) return entries;
    return entries.map((entry) =>
      entry.id === selectedId ? draftToOption(draft, selectedId) : entry
    );
  }, [draft, entries, isAdding, selectedId]);

  const handleSelectEntry = (entry: GeomodalLayerOption) => {
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
      // Parent surfaces the API error toast; keep the modal open for retry.
    } finally {
      setSubmitting(false);
    }
  };

  const isEditing = !isAdding && selectedEntry !== null;
  const panelTitle = isAdding
    ? "Add New Type"
    : selectedEntry
      ? `Edit ${selectedEntry.name}`
      : "Edit Type";

  return (
    <ProjectModalPortal open={open}>
      <div className="project-modal project-modal--stacked project-modal--nested" role="presentation">
        <button
          type="button"
          className="project-modal__backdrop"
          aria-label="Close Manage Geomodel Layer Types dialog"
          onClick={onClose}
        />

        <div
          className="project-modal__dialog project-modal__dialog--scroll project-modal__dialog--split project-modal__dialog--fields manage-origins-modal"
          role="dialog"
          aria-modal="true"
          aria-labelledby="manage-geomodal-layers-title"
        >
          <div className="project-modal__header">
            <h2 id="manage-geomodal-layers-title" className="project-modal__title">
              Manage Geomodel Layer Types
            </h2>
            <p className="project-modal__subtitle">
              Manage your existing Geomodel Layer types by selecting from the left menu. You can
              also drag to reorder. You also have the option to create a new Geomodel Layer or copy
              an existing one used elsewhere in your company account.
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
                    aria-label="Geomodel Layer types"
                  >
                    {entries.length === 0 ? (
                      <li className="project-modal__type-list-empty">
                        No Geomodel Layer types yet.
                      </li>
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
                  {isAdding ? (
                    <p className="project-modal__split-main-subtitle">
                      Create a new Geomodel Layer, or select a Geomodel Layer Type that has been
                      created in other Log Configurations by your company.
                    </p>
                  ) : null}

                  <div className="project-modal__fields project-modal__fields--stack manage-origins-modal__fields">
                    {isAdding ? (
                      <>
                        <FormField
                          label="Select Existing Geomodel Layer Type"
                          htmlFor={`${formId}-company-copy`}
                          className="project-modal__field--full"
                        >
                          <Select
                            id={`${formId}-company-copy`}
                            value={companyCopyId}
                            disabled={submitting || companySelectOptions.length === 0}
                            options={companySelectOptions}
                            placeholder="Select Existing Geomodel Layer Type"
                            onChange={handleCompanyCopy}
                          />
                        </FormField>

                        <p className="manage-origins-modal__hint">
                          or - create a new Geomodel Layer type from scratch
                        </p>
                        <div className="manage-origins-modal__divider" aria-hidden="true" />
                      </>
                    ) : null}

                    <FormField
                      label="Type Name"
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

                    <ColorPickerField
                      id={`${formId}-overlay-color`}
                      label="Graphic Overlay Color"
                      value={draft.overlayColor}
                      disabled={submitting}
                      onChange={(overlayColor) => patchDraft({ overlayColor })}
                    />

                    <ColorPickerField
                      id={`${formId}-fill-color`}
                      label="Graphic Color"
                      value={draft.color}
                      disabled={submitting}
                      onChange={(color) => patchDraft({ color })}
                    />

                    <p className="manage-origins-modal__hint">({selectedGraphicLabel})</p>

                    <FormField
                      label="Geomodel Layer Graphic"
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
                          style={{ backgroundImage: `url("${selectedGraphicUrl}")` }}
                          aria-hidden="true"
                        />
                      </div>
                    </FormField>

                    <div
                      className="manage-origins-modal__graphic-grid"
                      role="listbox"
                      aria-label="Geomodel Layer graphics"
                    >
                      {filteredGraphics.map((graphic) => {
                        const isNoGraphic = graphic.filename === "no_graphic.png";
                        const selected = isNoGraphic
                          ? !draft.graphic
                          : draft.graphic === graphic.filename;
                        const url = getGeomodalLayerGraphicUrl(graphic.filename);
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
                            title={`${graphic.label} (${graphic.code})`}
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
                        Delete Geomodel Layer Type
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
        title="Delete Geomodel Layer Type"
        message={
          selectedEntry
            ? `This will remove "${selectedEntry.name}". You must save to apply this change.`
            : "This will remove the selected Geomodel Layer type. You must save to apply this change."
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
