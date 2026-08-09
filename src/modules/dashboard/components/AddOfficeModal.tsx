"use client";

import type { FormEvent } from "react";
import { useCallback, useEffect, useId, useMemo, useState } from "react";
import { FileUpload, FormField, Input, Select, UiButton, ProjectModalPortal } from "@/shared/components/ui";
import { MAX_TABLE_PAGE_SIZE } from "@/shared/constants/pagination";
import { API_ERROR_MESSAGES, API_MESSAGES } from "@/shared/constants/apiMessages";
import { showApiError, showApiSuccess } from "@/shared/utils/apiToast";
import {
  createSupplier,
  formToSupplierPayload,
  listSuppliers,
} from "../services/supplierApi";
import type { OfficeFormState } from "../types/office";
import type { Supplier, SupplierFormState } from "../types/supplier";
import { validateOfficeForm, type OfficeFormErrors } from "../utils/officeFormUtils";
import { AddSupplierModal } from "./AddSupplierModal";

export type { OfficeFormState } from "../types/office";

const EMPTY_OFFICE_FORM: OfficeFormState = {
  name: "",
  address: "",
  phoneNumber: "",
  officeExternalId: "",
  officeNumber: "",
  state: "",
  laboratory: "",
  logoFile: null,
};

type AddOfficeModalProps = Readonly<{
  open: boolean;
  onClose: () => void;
  onSubmit: (office: OfficeFormState) => void | Promise<void>;
  submitting?: boolean;
}>;

export function AddOfficeModal({
  open,
  onClose,
  onSubmit,
  submitting = false,
}: AddOfficeModalProps) {
  const formId = useId();
  const [form, setForm] = useState<OfficeFormState>(EMPTY_OFFICE_FORM);
  const [laboratorySuppliers, setLaboratorySuppliers] = useState<Supplier[]>([]);
  const [loadingLaboratories, setLoadingLaboratories] = useState(false);
  const [isManageSupplierOpen, setIsManageSupplierOpen] = useState(false);
  const [submittingSupplier, setSubmittingSupplier] = useState(false);
  const [errors, setErrors] = useState<OfficeFormErrors>({});

  const laboratoryOptions = useMemo(
    () =>
      laboratorySuppliers
        .filter((supplier) => supplier.status === "active")
        .map((supplier) => supplier.businessName),
    [laboratorySuppliers]
  );

  const loadLaboratories = useCallback(async () => {
    setLoadingLaboratories(true);
    try {
      const result = await listSuppliers(1, MAX_TABLE_PAGE_SIZE, {
        supplierType: "Laboratory",
        status: "active",
      });
      setLaboratorySuppliers(result.data);
      return result.data;
    } catch (err) {
      showApiError(err, API_ERROR_MESSAGES.LOAD_LABORATORIES);
      return [];
    } finally {
      setLoadingLaboratories(false);
    }
  }, []);

  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !isManageSupplierOpen) onClose();
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, onClose, isManageSupplierOpen]);

  useEffect(() => {
    if (!open) {
      setForm(EMPTY_OFFICE_FORM);
      setLaboratorySuppliers([]);
      setIsManageSupplierOpen(false);
      setErrors({});
      return;
    }

    void loadLaboratories();
  }, [open, loadLaboratories]);

  const isBusy = submitting || submittingSupplier || loadingLaboratories;

  const update = <K extends keyof OfficeFormState>(key: K, value: OfficeFormState[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: undefined }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submitting) return;

    const nextErrors = validateOfficeForm(form);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    await onSubmit(form);
  };

  const handleAddLaboratorySupplier = async (supplierForm: SupplierFormState) => {
    setSubmittingSupplier(true);
    try {
      const { data, message } = await createSupplier(formToSupplierPayload(supplierForm));
      setIsManageSupplierOpen(false);

      const laboratories = await loadLaboratories();
      const createdLaboratory =
        laboratories.find((supplier) => supplier.id === data.id) ?? data;
      update("laboratory", createdLaboratory.businessName);

      showApiSuccess(message, API_MESSAGES.LABORATORY_SUPPLIER_ADDED);
    } catch (err) {
      showApiError(err, API_ERROR_MESSAGES.ADD_LABORATORY_SUPPLIER);
      throw err;
    } finally {
      setSubmittingSupplier(false);
    }
  };

  return (
    <>
      <ProjectModalPortal open={open}>
        <div className="project-modal project-modal--stacked" role="presentation">
        <button
          type="button"
          className="project-modal__backdrop"
          aria-label="Close add office dialog"
          onClick={onClose}
        />

        <div
          className="project-modal__dialog project-modal__dialog--scroll project-modal__dialog--wide"
          role="dialog"
          aria-modal="true"
          aria-labelledby="add-office-title"
        >
          <div className="project-modal__header">
            <h2 id="add-office-title" className="project-modal__title">
              Add Office
            </h2>
            <p className="project-modal__subtitle">Please fill in the details of the office.</p>
          </div>

          <form id={formId} className="project-modal__form" onSubmit={handleSubmit} noValidate>
            <div className="project-modal__body ui-scrollbar">
              <div className="project-modal__fields project-modal__fields--stack">
                <FormField label="Name" required error={errors.name}>
                  <Input
                    variant="ui"
                    type="text"
                    placeholder="Office Name"
                    value={form.name}
                    onChange={(e) => update("name", e.target.value)}
                    autoFocus
                    disabled={submitting}
                  />
                </FormField>

                <FormField label="Address">
                  <textarea
                    className="ui-textarea"
                    placeholder="Address"
                    rows={3}
                    value={form.address}
                    onChange={(e) => update("address", e.target.value)}
                    disabled={submitting}
                  />
                </FormField>

                <FormField label="Phone Number">
                  <Input
                    variant="ui"
                    type="tel"
                    placeholder="Phone Number"
                    value={form.phoneNumber}
                    onChange={(e) => update("phoneNumber", e.target.value)}
                    disabled={submitting}
                  />
                </FormField>

                <FormField label="Office External ID">
                  <Input
                    variant="ui"
                    type="text"
                    placeholder="Office External ID"
                    value={form.officeExternalId}
                    onChange={(e) => update("officeExternalId", e.target.value)}
                    disabled={submitting}
                  />
                </FormField>

                <FormField label="Office Number">
                  <Input
                    variant="ui"
                    type="text"
                    placeholder="Office Number"
                    value={form.officeNumber}
                    onChange={(e) => update("officeNumber", e.target.value)}
                    disabled={submitting}
                  />
                </FormField>

                <FormField label="State">
                  <Input
                    variant="ui"
                    type="text"
                    placeholder="State"
                    value={form.state}
                    onChange={(e) => update("state", e.target.value)}
                    disabled={submitting}
                  />
                </FormField>
              </div>

              <div className="project-modal__section">
                <h3 className="project-modal__section-title">Office Defaults</h3>

                <FormField label="Laboratory">
                  <div className="project-modal__inline">
                    <Select
                      className="project-modal__inline-control"
                      value={form.laboratory}
                      onChange={(value) => update("laboratory", value)}
                      options={laboratoryOptions}
                      placeholder={
                        loadingLaboratories ? "Loading laboratories…" : "Select Laboratory"
                      }
                      search
                      searchPlaceholder="Search laboratories…"
                      disabled={loadingLaboratories || submittingSupplier || submitting}
                    />
                    <UiButton
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setIsManageSupplierOpen(true)}
                      disabled={loadingLaboratories || submittingSupplier || submitting}
                    >
                      {submittingSupplier ? "Saving…" : "Manage"}
                    </UiButton>
                  </div>
                </FormField>
              </div>

              <div className="project-modal__section">
                <h3 className="project-modal__section-title">Upload Logo</h3>

                <FileUpload
                  value={form.logoFile}
                  onChange={(file) => update("logoFile", file)}
                  accept="image/png,image/jpeg,image/jpg,image/svg+xml,image/webp"
                  hint="PNG, JPG, SVG or WEBP up to 5 MB"
                />
              </div>
            </div>

            <div className="project-modal__footer">
              <UiButton type="button" variant="ghost" onClick={onClose} disabled={isBusy}>
                Cancel
              </UiButton>
              <UiButton type="submit" variant="primary" disabled={isBusy}>
                {submitting ? "Submitting…" : "Submit"}
              </UiButton>
            </div>
          </form>
        </div>
      </div>
      </ProjectModalPortal>

      <AddSupplierModal
        open={isManageSupplierOpen}
        onClose={() => setIsManageSupplierOpen(false)}
        onSubmit={handleAddLaboratorySupplier}
        suppliers={laboratorySuppliers}
        submitting={submittingSupplier}
        defaultSupplierType="Laboratory"
        lockSupplierType
      />
    </>
  );
}
