"use client";

import type { FormEvent } from "react";
import { useCallback, useEffect, useId, useMemo, useState } from "react";
import {
  ConfirmDialog,
  FormField,
  Input,
  Toggle,
  TrashIcon,
  UiButton,
  ProjectModalPortal,
} from "@/shared/components/ui";
import { API_ERROR_MESSAGES, API_MESSAGES } from "@/shared/constants/apiMessages";
import { showApiError, showApiSuccess } from "@/shared/utils/apiToast";
import {
  createEquipmentType,
  deleteEquipmentType,
  formToEquipmentTypePayload,
  updateEquipmentType,
} from "../services/equipmentTypeApi";
import type {
  EquipmentFieldDefinition,
  EquipmentFieldKey,
  EquipmentType,
  EquipmentTypeFormState,
} from "../types/equipmentType";
import {
  NAME_MAX_LENGTH,
  createNewEquipmentTypeForm,
  equipmentTypeToForm,
  sortEquipmentTypesAlphabetically,
  validateEquipmentTypeForm,
} from "../utils/equipmentTypeUtils";

type ManageEquipmentTypesModalProps = Readonly<{
  open: boolean;
  onClose: () => void;
  types: EquipmentType[];
  fieldDefinitions: EquipmentFieldDefinition[];
  onChange: (types: EquipmentType[]) => void;
  onCreated?: (type: EquipmentType) => void;
  startInAddMode?: boolean;
}>;

export function ManageEquipmentTypesModal({
  open,
  onClose,
  types,
  fieldDefinitions,
  onChange,
  onCreated,
  startInAddMode = false,
}: ManageEquipmentTypesModalProps) {
  const formId = useId();
  const searchId = useId();

  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [form, setForm] = useState<EquipmentTypeFormState>(() =>
    createNewEquipmentTypeForm(fieldDefinitions)
  );
  const [errors, setErrors] = useState<{ name?: string }>({});
  const [saving, setSaving] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

  const sortedTypes = useMemo(() => sortEquipmentTypesAlphabetically(types), [types]);

  const filteredTypes = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return sortedTypes;
    return sortedTypes.filter((type) => type.name.toLowerCase().includes(query));
  }, [searchQuery, sortedTypes]);

  const selectedType = useMemo(
    () => (selectedId ? types.find((type) => type.id === selectedId) ?? null : null),
    [selectedId, types]
  );

  const resetPanel = useCallback(
    (nextSelectedId: number | null, adding: boolean) => {
      setSelectedId(nextSelectedId);
      setIsAdding(adding);
      setErrors({});

      if (adding) {
        setForm(createNewEquipmentTypeForm(fieldDefinitions));
        return;
      }

      const type = nextSelectedId ? types.find((item) => item.id === nextSelectedId) : null;
      setForm(type ? equipmentTypeToForm(type) : createNewEquipmentTypeForm(fieldDefinitions));
    },
    [fieldDefinitions, types]
  );

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
  }, [open, onClose]);

  useEffect(() => {
    if (!open) {
      setSearchQuery("");
      setErrors({});
      setDeleteConfirmOpen(false);
      return;
    }

    const firstType = sortEquipmentTypesAlphabetically(types)[0];
    if (startInAddMode) {
      resetPanel(null, true);
    } else if (firstType) {
      resetPanel(firstType.id, false);
    } else {
      resetPanel(null, true);
    }
  }, [open, resetPanel, startInAddMode, types]);

  const isEditing = !isAdding && selectedType !== null;
  const nameLocked = isEditing && selectedType.isDefault;
  const canDelete = isEditing && !selectedType.isDefault;
  const panelTitle = isAdding ? "Add New Type" : selectedType?.name ?? "Equipment Type";
  const panelSubtitle = isEditing && selectedType.isDefault ? "Default" : isAdding ? "New" : "Custom";

  const update = <K extends keyof EquipmentTypeFormState>(key: K, value: EquipmentTypeFormState[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
    if (key === "name") {
      setErrors((current) => ({ ...current, name: undefined }));
    }
  };

  const toggleField = (key: EquipmentFieldKey, enabled: boolean) => {
    setForm((current) => ({
      ...current,
      fieldConfig: { ...current.fieldConfig, [key]: enabled },
    }));
  };

  const handleSelectType = (type: EquipmentType) => {
    resetPanel(type.id, false);
  };

  const handleAddClick = () => {
    resetPanel(null, true);
  };

  const requestDelete = () => {
    if (!selectedType || selectedType.isDefault || saving) return;
    setDeleteConfirmOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!selectedType || selectedType.isDefault || saving) return;

    setSaving(true);

    try {
      const { message } = await deleteEquipmentType(selectedType.id);
      const remaining = types.filter((type) => type.id !== selectedType.id);
      onChange(remaining);

      const nextType = sortEquipmentTypesAlphabetically(remaining)[0];
      if (nextType) {
        resetPanel(nextType.id, false);
      } else {
        resetPanel(null, true);
      }
      showApiSuccess(message, API_MESSAGES.EQUIPMENT_TYPE_DELETED);
      setDeleteConfirmOpen(false);
    } catch (err) {
      showApiError(err, API_ERROR_MESSAGES.DELETE_EQUIPMENT_TYPE);
    } finally {
      setSaving(false);
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const nextErrors = validateEquipmentTypeForm(form, types, selectedType?.id, nameLocked);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setSaving(true);

    try {
      const payload = formToEquipmentTypePayload(form);

      if (isAdding) {
        const { data: created, message } = await createEquipmentType(payload);
        onChange([...types, created]);
        onCreated?.(created);
        showApiSuccess(message, API_MESSAGES.EQUIPMENT_TYPE_ADDED);
        onClose();
        return;
      }

      if (!selectedType) return;

      const { data: updated, message } = await updateEquipmentType(selectedType.id, payload);
      onChange(types.map((type) => (type.id === updated.id ? updated : type)));
      showApiSuccess(message, API_MESSAGES.EQUIPMENT_TYPE_UPDATED);
      onClose();
    } catch (err) {
      showApiError(err, API_ERROR_MESSAGES.SAVE_EQUIPMENT_TYPE);
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
    <ProjectModalPortal open={open}>
      <div className="project-modal project-modal--stacked" role="presentation">
      <button
        type="button"
        className="project-modal__backdrop"
        aria-label="Close manage equipment types dialog"
        onClick={onClose}
      />

      <div
        className="project-modal__dialog project-modal__dialog--scroll project-modal__dialog--split project-modal__dialog--fields"
        role="dialog"
        aria-modal="true"
        aria-labelledby="manage-equipment-types-title"
      >
        <div className="project-modal__header">
          <h2 id="manage-equipment-types-title" className="project-modal__title">
            Manage Equipment Types
          </h2>
          <p className="project-modal__subtitle">
            Manage your existing equipment types by selecting from the left menu. You can also create
            a new equipment type.
          </p>
        </div>

        <form id={formId} className="project-modal__form" onSubmit={handleSubmit} noValidate>
          <div className="project-modal__body ui-scrollbar">
            <div className="project-modal__split">
              <aside className="project-modal__split-sidebar">
              <div className="project-modal__split-sidebar-head">
                <span className="project-modal__split-sidebar-label">Types</span>
                <UiButton type="button" variant="primary" size="sm" onClick={handleAddClick}>
                  Add
                </UiButton>
              </div>

              <Input
                id={searchId}
                variant="ui"
                type="search"
                className="project-modal__split-search"
                placeholder="Search types…"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                aria-label="Search equipment types"
              />

              <ul className="project-modal__type-list" role="listbox" aria-label="Equipment types">
                {filteredTypes.length === 0 ? (
                  <li className="project-modal__type-list-empty">No types found.</li>
                ) : (
                  filteredTypes.map((type) => {
                    const isSelected = !isAdding && selectedId === type.id;
                    return (
                      <li key={type.id}>
                        <button
                          type="button"
                          role="option"
                          aria-selected={isSelected}
                          className={[
                            "project-modal__type-item",
                            isSelected ? "is-selected" : "",
                          ]
                            .filter(Boolean)
                            .join(" ")}
                          onClick={() => handleSelectType(type)}
                        >
                          <span className="project-modal__type-item-name">{type.name}</span>
                          {type.status === "inactive" ? (
                            <span className="project-modal__type-item-badge">Inactive</span>
                          ) : null}
                        </button>
                      </li>
                    );
                  })
                )}
              </ul>
            </aside>

            <div className="project-modal__split-main">
              <div className="project-modal__split-main-head">
                <div className="project-modal__split-main-head-text">
                  <p className="project-modal__split-main-kicker">{panelSubtitle}</p>
                  <h3 className="project-modal__split-main-title">{panelTitle}</h3>
                </div>
                {canDelete ? (
                  <UiButton
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="ui-btn--danger"
                    onClick={requestDelete}
                    disabled={saving}
                  >
                    <TrashIcon />
                    Delete Type
                  </UiButton>
                ) : null}
              </div>

              <div className="project-modal__fields project-modal__fields--stack">
                <FormField
                  label="Equipment Type Name"
                  required={!nameLocked}
                  error={errors.name}
                  className="project-modal__field--full"
                >
                  <Input
                    variant="ui"
                    type="text"
                    placeholder="Equipment Type Name"
                    value={form.name}
                    onChange={(event) => update("name", event.target.value)}
                    disabled={nameLocked}
                    maxLength={NAME_MAX_LENGTH}
                  />
                </FormField>
              </div>

              {!isAdding ? (
                <div className="project-modal__field-toggles" role="group" aria-label="Equipment fields">
                  {fieldDefinitions.map(({ key, label }) => (
                    <div key={key} className="project-modal__field-toggle">
                      <span className="project-modal__field-toggle-label" title={label}>
                        {label}
                      </span>
                      <Toggle
                        checked={form.fieldConfig[key]}
                        onChange={(enabled) => toggleField(key, enabled)}
                        aria-label={`${label} ${form.fieldConfig[key] ? "enabled" : "disabled"}`}
                      />
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          </div>
          </div>

          <div className="project-modal__footer">
            <UiButton type="button" variant="ghost" onClick={onClose} disabled={saving}>
              Cancel
            </UiButton>
            <UiButton type="submit" variant="primary" disabled={saving}>
              {saving ? "Saving…" : "Save"}
            </UiButton>
          </div>
        </form>
      </div>
    </div>
    </ProjectModalPortal>

    <ConfirmDialog
      open={deleteConfirmOpen}
      title="Delete Equipment Type"
      message={
        selectedType
          ? `This will permanently remove "${selectedType.name}". This action cannot be undone.`
          : "This will permanently remove the selected equipment type. This action cannot be undone."
      }
      confirmLabel="Delete"
      variant="danger"
      loading={saving}
      onConfirm={() => void handleConfirmDelete()}
      onCancel={() => setDeleteConfirmOpen(false)}
    />
    </>
  );
}
