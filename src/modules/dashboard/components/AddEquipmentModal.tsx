"use client";

import type { FormEvent } from "react";
import { useEffect, useId, useMemo, useState } from "react";
import { DatePicker, FormField, Input, MultiSelect, UiButton, ProjectModalPortal } from "@/shared/components/ui";
import type { Equipment, EquipmentFormState } from "../types/equipment";
import type { EquipmentFieldDefinition, EquipmentType } from "../types/equipmentType";
import { EMPTY_EQUIPMENT_FORM } from "../types/equipment";
import {
  EQUIPMENT_FORM_FIELDS,
  type EquipmentFormErrors,
  getVisibleEquipmentFormFields,
  validateEquipmentForm,
  equipmentToForm,
} from "../utils/equipmentFormUtils";
import { EquipmentTypeField } from "./EquipmentTypeField";

type AddEquipmentModalProps = Readonly<{
  open: boolean;
  onClose: () => void;
  onSubmit: (form: EquipmentFormState) => void | Promise<void>;
  editingEquipment?: Equipment | null;
  submitting?: boolean;
  equipmentTypes: EquipmentType[];
  fieldDefinitions: EquipmentFieldDefinition[];
  onEquipmentTypesChange: (types: EquipmentType[]) => void;
  supplierOptions: readonly string[];
}>;

export function AddEquipmentModal({
  open,
  onClose,
  onSubmit,
  editingEquipment = null,
  submitting = false,
  equipmentTypes,
  fieldDefinitions,
  onEquipmentTypesChange,
  supplierOptions,
}: AddEquipmentModalProps) {
  const formId = useId();
  const isEditing = editingEquipment !== null;
  const [form, setForm] = useState<EquipmentFormState>(EMPTY_EQUIPMENT_FORM);
  const [errors, setErrors] = useState<EquipmentFormErrors>({});

  const selectedType = useMemo(
    () => equipmentTypes.find((type) => String(type.id) === form.equipmentTypeId) ?? null,
    [equipmentTypes, form.equipmentTypeId]
  );

  const visibleFields = useMemo(
    () => getVisibleEquipmentFormFields(selectedType),
    [selectedType]
  );

  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, onClose]);

  useEffect(() => {
    if (!open) {
      setForm(EMPTY_EQUIPMENT_FORM);
      setErrors({});
      return;
    }

    setForm(editingEquipment ? equipmentToForm(editingEquipment) : EMPTY_EQUIPMENT_FORM);
  }, [open, editingEquipment]);

  const update = <K extends keyof EquipmentFormState>(key: K, value: EquipmentFormState[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: undefined }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submitting) return;

    const nextErrors = validateEquipmentForm(form, selectedType);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    await onSubmit(form);
  };

  const renderField = (field: (typeof EQUIPMENT_FORM_FIELDS)[number]) => {
    const className = field.fullWidth ? "project-modal__field--full" : undefined;
    const fieldError = errors[field.key];

    if (field.inputType === "multiselect") {
      return (
        <FormField
          key={field.key}
          label={field.label}
          required={field.required}
          error={fieldError}
          className={className}
        >
          <MultiSelect
            value={form.suppliers}
            onChange={(value) => update("suppliers", value)}
            options={supplierOptions}
            placeholder={field.placeholder}
            search
            searchPlaceholder="Search suppliers…"
            floatingMenu
          />
        </FormField>
      );
    }

    if (field.inputType === "date") {
      return (
        <FormField
          key={field.key}
          label={field.label}
          required={field.required}
          error={fieldError}
          className={className}
        >
          <DatePicker
            value={form.dateOfCalibration}
            onChange={(value) => update("dateOfCalibration", value)}
            placeholder="Select date"
          />
        </FormField>
      );
    }

    const value = form[field.key as keyof EquipmentFormState] as string;

    return (
      <FormField
        key={field.key}
        label={field.label}
        required={field.required}
        error={fieldError}
        className={className}
      >
        <Input
          variant="ui"
          type={field.inputType === "number" ? "number" : "text"}
          step={field.inputType === "number" ? "any" : undefined}
          placeholder={field.placeholder}
          value={value}
          onChange={(event) => update(field.key as keyof EquipmentFormState, event.target.value)}
        />
      </FormField>
    );
  };

  return (
    <ProjectModalPortal open={open}>
      <div className="project-modal" role="presentation">
      <button
        type="button"
        className="project-modal__backdrop"
        aria-label={`Close ${isEditing ? "edit" : "add"} equipment dialog`}
        onClick={onClose}
      />

      <div
        className="project-modal__dialog project-modal__dialog--scroll project-modal__dialog--form"
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-equipment-title"
      >
        <div className="project-modal__header">
          <h2 id="add-equipment-title" className="project-modal__title">
            {isEditing ? "Edit Equipment" : "Add Equipment"}
          </h2>
          <p className="project-modal__subtitle">
            {isEditing
              ? "Update the equipment details."
              : "Please fill in the equipment details."}
          </p>
        </div>

        <form id={formId} className="project-modal__form" onSubmit={handleSubmit} noValidate>
          <div className="project-modal__body ui-scrollbar">
            <div className="project-modal__fields">
              <EquipmentTypeField
                types={equipmentTypes}
                fieldDefinitions={fieldDefinitions}
                onTypesChange={onEquipmentTypesChange}
                value={form.equipmentTypeId}
                onChange={(value) => update("equipmentTypeId", value)}
                required
                error={errors.equipmentTypeId}
                className="project-modal__field--full"
              />

              {visibleFields.map((field) => renderField(field))}
            </div>
          </div>

          <div className="project-modal__footer">
            <UiButton type="button" variant="ghost" onClick={onClose} disabled={submitting}>
              Cancel
            </UiButton>
            <UiButton type="submit" variant="primary" disabled={submitting}>
              {submitting ? "Submitting…" : isEditing ? "Save" : "Submit"}
            </UiButton>
          </div>
        </form>
      </div>
    </div>
    </ProjectModalPortal>
  );
}
