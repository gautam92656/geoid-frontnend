"use client";

import type { FormEvent } from "react";
import { useEffect, useId, useMemo, useState } from "react";
import { FormField, Input, Select, UiButton, ProjectModalPortal } from "@/shared/components/ui";
import { ACTIVE_INACTIVE_OPTIONS } from "../data/statusOptions";
import type { LogConfiguration, LogConfigurationStatus } from "../types/logConfiguration";

type LogConfigurationFormState = {
  name: string;
  status: LogConfigurationStatus;
};

type EditLogConfigurationModalProps = Readonly<{
  open: boolean;
  onClose: () => void;
  configuration: LogConfiguration | null;
  configurations: LogConfiguration[];
  onSubmit: (form: LogConfigurationFormState) => void | Promise<void>;
  submitting?: boolean;
}>;

function normalizeName(value: string): string {
  return value.trim().toLowerCase();
}

function validateForm(
  form: LogConfigurationFormState,
  configurations: LogConfiguration[],
  editingId: string | null
): Partial<Record<"name", string>> {
  const trimmedName = form.name.trim();
  if (!trimmedName) {
    return { name: "Name is required." };
  }

  const duplicate = configurations.some(
    (config) =>
      config.id !== editingId && normalizeName(config.name) === normalizeName(trimmedName)
  );
  if (duplicate) {
    return { name: "A log configuration with this name already exists." };
  }

  return {};
}

export function EditLogConfigurationModal({
  open,
  onClose,
  configuration,
  configurations,
  onSubmit,
  submitting = false,
}: EditLogConfigurationModalProps) {
  const formId = useId();
  const [form, setForm] = useState<LogConfigurationFormState>({ name: "", status: "active" });
  const [errors, setErrors] = useState<Partial<Record<"name", string>>>({});

  const initialForm = useMemo(
    (): LogConfigurationFormState => ({
      name: configuration?.name ?? "",
      status: configuration?.status ?? "active",
    }),
    [configuration]
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
  }, [onClose, open]);

  useEffect(() => {
    if (!open) {
      setForm({ name: "", status: "active" });
      setErrors({});
      return;
    }

    setForm(initialForm);
    setErrors({});
  }, [initialForm, open]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submitting || !configuration) return;

    const nextErrors = validateForm(form, configurations, configuration.id);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    await onSubmit({
      name: form.name.trim(),
      status: form.status,
    });
  };

  return (
    <ProjectModalPortal open={open}>
      <div className="project-modal project-modal--stacked" role="presentation">
        <button
          type="button"
          className="project-modal__backdrop"
          aria-label="Close edit log configuration dialog"
          onClick={onClose}
        />

        <div
          className="project-modal__dialog project-modal__dialog--fields"
          role="dialog"
          aria-modal="true"
          aria-labelledby="edit-log-config-title"
        >
          <div className="project-modal__header">
            <h2 id="edit-log-config-title" className="project-modal__title">
              Edit Log Configuration
            </h2>
            <p className="project-modal__subtitle">Update the name or status for this configuration.</p>
          </div>

          <form id={formId} className="project-modal__body" onSubmit={(event) => void handleSubmit(event)}>
            <FormField label="Log Configuration Name" htmlFor={`${formId}-name`} error={errors.name}>
              <Input
                id={`${formId}-name`}
                variant="ui"
                value={form.name}
                onChange={(event) => {
                  setForm((current) => ({ ...current, name: event.target.value }));
                  setErrors((current) => ({ ...current, name: undefined }));
                }}
                disabled={submitting}
              />
            </FormField>

            <FormField label="Status" htmlFor={`${formId}-status`}>
              <Select
                id={`${formId}-status`}
                value={form.status}
                onChange={(value) =>
                  setForm((current) => ({ ...current, status: value as LogConfigurationStatus }))
                }
                options={ACTIVE_INACTIVE_OPTIONS}
                disabled={submitting}
              />
            </FormField>
          </form>

          <div className="project-modal__footer">
            <UiButton type="button" variant="ghost" onClick={onClose} disabled={submitting}>
              Cancel
            </UiButton>
            <UiButton type="submit" form={formId} variant="primary" disabled={submitting || !configuration}>
              {submitting ? "Saving…" : "Save changes"}
            </UiButton>
          </div>
        </div>
      </div>
    </ProjectModalPortal>
  );
}
