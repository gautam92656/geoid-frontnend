"use client";

import type { FormEvent } from "react";
import { useEffect, useId, useState } from "react";
import { FormField, Input, MultiSelect, Select, UiButton, ProjectModalPortal } from "@/shared/components/ui";
import type { Supplier, SupplierFormState } from "../types/supplier";

import {
  LAB_TEST_TYPES,
  SUPPLIER_RELATIONSHIPS,
  SUPPLIER_TYPES,
} from "../data/supplierOptions";
import { ACTIVE_INACTIVE_OPTIONS } from "../data/statusOptions";
import { supplierToForm, validateSupplierForm, type SupplierFormErrors } from "../utils/supplierFormUtils";

const EMPTY_SUPPLIER_FORM: SupplierFormState = {
  businessName: "",
  supplierType: "",
  supplierRelationship: "",
  supplierExternalId: "",
  labTestTypes: [],
  firstName: "",
  lastName: "",
  address: "",
  email: "",
  phone: "",
  abn: "",
  status: "active",
};

type AddSupplierModalProps = Readonly<{
  open: boolean;
  onClose: () => void;
  onSubmit: (supplier: SupplierFormState) => void | Promise<void>;
  suppliers: Supplier[];
  editingSupplier?: Supplier | null;
  submitting?: boolean;
  defaultSupplierType?: SupplierFormState["supplierType"];
  lockSupplierType?: boolean;
}>;

export function AddSupplierModal({
  open,
  onClose,
  onSubmit,
  suppliers,
  editingSupplier = null,
  submitting = false,
  defaultSupplierType = "",
  lockSupplierType = false,
}: AddSupplierModalProps) {
  const formId = useId();
  const isEditing = editingSupplier !== null;
  const [form, setForm] = useState<SupplierFormState>(EMPTY_SUPPLIER_FORM);
  const [errors, setErrors] = useState<SupplierFormErrors>({});

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
      setForm(EMPTY_SUPPLIER_FORM);
      setErrors({});
      return;
    }

    setForm(
      editingSupplier
        ? supplierToForm(editingSupplier)
        : {
            ...EMPTY_SUPPLIER_FORM,
            supplierType: defaultSupplierType,
          }
    );
    setErrors({});
  }, [open, editingSupplier, defaultSupplierType]);

  const isEquipment = form.supplierType === "Equipment";
  const isLaboratory = form.supplierType === "Laboratory";

  const update = <K extends keyof SupplierFormState>(key: K, value: SupplierFormState[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
    if (key === "businessName" || key === "email" || key === "supplierType") {
      setErrors((current) => ({ ...current, [key]: undefined }));
    }
  };

  const handleSupplierTypeChange = (supplierType: string) => {
    setForm((current) => ({
      ...current,
      supplierType,
      abn: supplierType === "Equipment" ? current.abn : "",
      supplierExternalId: supplierType === "Laboratory" ? current.supplierExternalId : "",
      labTestTypes: supplierType === "Laboratory" ? current.labTestTypes : [],
    }));
    setErrors((current) => ({ ...current, supplierType: undefined }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submitting) return;

    const nextErrors = validateSupplierForm(form, suppliers, editingSupplier?.id);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    await onSubmit(form);
  };

  return (
    <ProjectModalPortal open={open}>
      <div className="project-modal project-modal--stacked" role="presentation">
      <button
        type="button"
        className="project-modal__backdrop"
        aria-label={`Close ${isEditing ? "edit" : "add"} supplier dialog`}
        onClick={onClose}
      />

      <div
        className="project-modal__dialog project-modal__dialog--scroll"
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-supplier-title"
      >
        <div className="project-modal__header">
          <h2 id="add-supplier-title" className="project-modal__title">
            {isEditing ? "Edit Supplier" : "Add Supplier"}
          </h2>
          <p className="project-modal__subtitle">
            {isEditing
              ? "Update the details of the supplier."
              : "Please fill in the details of the supplier."}
          </p>
        </div>

        <form id={formId} className="project-modal__form" onSubmit={handleSubmit} noValidate>
          <div className="project-modal__body ui-scrollbar">
            <div className="project-modal__fields">
              <FormField
                label="Supplier Type"
                required
                error={errors.supplierType}
                className="project-modal__field--full"
              >
                <Select
                  value={form.supplierType}
                  onChange={handleSupplierTypeChange}
                  options={SUPPLIER_TYPES}
                  placeholder="Select type"
                  floatingMenu
                  disabled={lockSupplierType || submitting}
                />
              </FormField>

              {isLaboratory ? (
                <FormField label="Lab Test Types" className="project-modal__field--full">
                  <MultiSelect
                    value={form.labTestTypes}
                    onChange={(value) => update("labTestTypes", value)}
                    options={LAB_TEST_TYPES}
                    placeholder="Select lab test types"
                    search
                    searchPlaceholder="Search test types…"
                    floatingMenu
                  />
                </FormField>
              ) : null}

              <FormField
                label="Business Name"
                required
                error={errors.businessName}
                className="project-modal__field--full"
              >
                <Input
                  variant="ui"
                  type="text"
                  placeholder="Business Name"
                  value={form.businessName}
                  onChange={(e) => update("businessName", e.target.value)}
                />
              </FormField>

              {isLaboratory ? (
                <FormField label="Supplier External ID" className="project-modal__field--full">
                  <Input
                    variant="ui"
                    type="text"
                    placeholder="Supplier External ID"
                    value={form.supplierExternalId}
                    onChange={(e) => update("supplierExternalId", e.target.value)}
                  />
                </FormField>
              ) : null}

              <FormField label="Supplier Relationship">
                <Select
                  value={form.supplierRelationship}
                  onChange={(value) => update("supplierRelationship", value)}
                  options={SUPPLIER_RELATIONSHIPS}
                  placeholder="Select relationship"
                  floatingMenu
                />
              </FormField>

              <FormField label="First Name">
                <Input
                  variant="ui"
                  type="text"
                  placeholder="First Name"
                  value={form.firstName}
                  onChange={(e) => update("firstName", e.target.value)}
                />
              </FormField>

              <FormField label="Last Name">
                <Input
                  variant="ui"
                  type="text"
                  placeholder="Last Name"
                  value={form.lastName}
                  onChange={(e) => update("lastName", e.target.value)}
                />
              </FormField>

              <FormField label="Address" className="project-modal__field--full">
                <textarea
                  className="ui-textarea"
                  placeholder="Address"
                  rows={3}
                  value={form.address}
                  onChange={(e) => update("address", e.target.value)}
                />
              </FormField>

              <FormField label="Email" error={errors.email}>
                <Input
                  variant="ui"
                  type="email"
                  placeholder="Email"
                  value={form.email}
                  onChange={(e) => update("email", e.target.value)}
                />
              </FormField>

              {isEquipment ? (
                <FormField label="ABN">
                  <Input
                    variant="ui"
                    type="text"
                    placeholder="ABN"
                    value={form.abn}
                    onChange={(e) => update("abn", e.target.value)}
                  />
                </FormField>
              ) : null}

              <FormField label="Phone">
                <Input
                  variant="ui"
                  type="tel"
                  placeholder="Phone"
                  value={form.phone}
                  onChange={(e) => update("phone", e.target.value)}
                />
              </FormField>

              <FormField label="Status">
                <Select
                  value={form.status}
                  onChange={(value) => update("status", value as SupplierFormState["status"])}
                  options={ACTIVE_INACTIVE_OPTIONS}
                  placeholder="Select status"
                  floatingMenu
                />
              </FormField>
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
