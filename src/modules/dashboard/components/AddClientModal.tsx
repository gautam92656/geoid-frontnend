"use client";

import type { FormEvent } from "react";
import { useEffect, useId, useState } from "react";
import { FormField, Input, Select, UiButton, ProjectModalPortal } from "@/shared/components/ui";
import { ACTIVE_INACTIVE_OPTIONS } from "../data/statusOptions";
import type { Client, ClientFormState } from "../types/client";
import { clientToForm, validateClientForm } from "../utils/clientFormUtils";

const EMPTY_CLIENT_FORM: ClientFormState = {
  companyName: "",
  companyContact: "",
  email: "",
  phone: "",
  externalId: "",
  status: "active",
};

type AddClientModalProps = Readonly<{
  open: boolean;
  onClose: () => void;
  onSubmit: (client: ClientFormState) => void | Promise<void>;
  clients?: Client[];
  editingClient?: Client | null;
  submitting?: boolean;
}>;

export function AddClientModal({
  open,
  onClose,
  onSubmit,
  clients = [],
  editingClient = null,
  submitting = false,
}: AddClientModalProps) {
  const formId = useId();
  const isEditing = editingClient !== null;
  const [form, setForm] = useState<ClientFormState>(EMPTY_CLIENT_FORM);
  const [errors, setErrors] = useState<{ companyName?: string; email?: string }>({});

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
      setForm(EMPTY_CLIENT_FORM);
      setErrors({});
      return;
    }

    setForm(editingClient ? clientToForm(editingClient) : EMPTY_CLIENT_FORM);
    setErrors({});
  }, [open, editingClient]);

  const update = <K extends keyof ClientFormState>(key: K, value: ClientFormState[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
    if (key === "companyName" || key === "email") {
      setErrors((current) => ({ ...current, [key]: undefined }));
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submitting) return;

    const nextErrors = validateClientForm(form, clients, editingClient?.id);
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
        aria-label={`Close ${isEditing ? "edit" : "add"} client dialog`}
        onClick={onClose}
      />

      <div
        className="project-modal__dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-client-title"
      >
        <div className="project-modal__header">
          <h2 id="add-client-title" className="project-modal__title">
            {isEditing ? "Edit Client" : "Add Client"}
          </h2>
          <p className="project-modal__subtitle">
            {isEditing
              ? "Update the details of the client."
              : "Please fill in the details of the client."}
          </p>
        </div>

        <form id={formId} className="project-modal__form" onSubmit={handleSubmit} noValidate>
          <div className="project-modal__fields">
            <FormField
              label="Company Name"
              required
              error={errors.companyName}
              className="project-modal__field--full"
            >
              <Input
                variant="ui"
                type="text"
                placeholder="Company Name"
                value={form.companyName}
                onChange={(e) => update("companyName", e.target.value)}
                autoFocus
              />
            </FormField>

            <FormField label="Company Contact" className="project-modal__field--full">
              <Input
                variant="ui"
                type="text"
                placeholder="Company Contact"
                value={form.companyContact}
                onChange={(e) => update("companyContact", e.target.value)}
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

            <FormField label="Phone">
              <Input
                variant="ui"
                type="tel"
                placeholder="Phone"
                value={form.phone}
                onChange={(e) => update("phone", e.target.value)}
              />
            </FormField>

            <FormField label="External ID" className="project-modal__field--full">
              <Input
                variant="ui"
                type="text"
                placeholder="External ID"
                value={form.externalId}
                onChange={(e) => update("externalId", e.target.value)}
              />
            </FormField>

            {isEditing ? (
              <FormField label="Status">
                <Select
                  value={form.status}
                  onChange={(value) => update("status", value as ClientFormState["status"])}
                  options={ACTIVE_INACTIVE_OPTIONS}
                  placeholder="Select status"
                  floatingMenu
                />
              </FormField>
            ) : null}
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
