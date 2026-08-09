"use client";

import type { FormEvent } from "react";
import { useEffect, useId, useMemo, useState } from "react";
import { FormField, Input, Select, UiButton, ProjectModalPortal } from "@/shared/components/ui";
import type {
  HeaderFooterReportType,
  HeaderFooterTemplate,
  HeaderFooterTemplateFormState,
  HeaderFooterTemplateKind,
} from "../types/headerFooterTemplate";

const KIND_OPTIONS: ReadonlyArray<{ value: HeaderFooterTemplateKind; label: string }> = [
  { value: "header", label: "Header" },
  { value: "footer", label: "Footer" },
];

const REPORT_TYPE_OPTIONS: ReadonlyArray<{ value: string; label: string }> = [
  { value: "", label: "Not Set" },
  { value: "borelog", label: "Borelog" },
  { value: "corelog", label: "Corelog" },
];

function emptyForm(kind: HeaderFooterTemplateKind = "header"): HeaderFooterTemplateFormState {
  return {
    name: "",
    kind,
    reportType: "",
  };
}

function normalizeName(value: string): string {
  return value.trim().toLowerCase();
}

type AddHeaderFooterTemplateModalProps = Readonly<{
  open: boolean;
  onClose: () => void;
  onSubmit: (form: HeaderFooterTemplateFormState) => void | Promise<void>;
  templates?: HeaderFooterTemplate[];
  editingTemplate?: HeaderFooterTemplate | null;
  defaultKind?: HeaderFooterTemplateKind;
  submitting?: boolean;
}>;

export function AddHeaderFooterTemplateModal({
  open,
  onClose,
  onSubmit,
  templates = [],
  editingTemplate = null,
  defaultKind = "header",
  submitting = false,
}: AddHeaderFooterTemplateModalProps) {
  const formId = useId();
  const isEditing = editingTemplate !== null;
  const [form, setForm] = useState<HeaderFooterTemplateFormState>(() => emptyForm(defaultKind));
  const [errors, setErrors] = useState<{ name?: string }>({});

  const titleId = useId();

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
      setForm(emptyForm(defaultKind));
      setErrors({});
      return;
    }

    if (editingTemplate) {
      setForm({
        name: editingTemplate.name,
        kind: editingTemplate.kind,
        reportType: editingTemplate.reportType ?? "",
      });
    } else {
      setForm(emptyForm(defaultKind));
    }
    setErrors({});
  }, [open, editingTemplate, defaultKind]);

  const existingNamesForKind = useMemo(() => {
    return new Set(
      templates
        .filter(
          (template) =>
            template.kind === form.kind &&
            (!editingTemplate || template.id !== editingTemplate.id)
        )
        .map((template) => normalizeName(template.name))
    );
  }, [editingTemplate, form.kind, templates]);

  const update = <K extends keyof HeaderFooterTemplateFormState>(
    key: K,
    value: HeaderFooterTemplateFormState[K]
  ) => {
    setForm((current) => ({ ...current, [key]: value }));
    if (key === "name") {
      setErrors((current) => ({ ...current, name: undefined }));
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submitting) return;

    const trimmedName = form.name.trim();
    const nextErrors: { name?: string } = {};
    if (!trimmedName) {
      nextErrors.name = "Template name is required.";
    } else if (existingNamesForKind.has(normalizeName(trimmedName))) {
      nextErrors.name = "A template with this name already exists for this type.";
    }

    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    await onSubmit({
      ...form,
      name: trimmedName,
    });
  };

  return (
    <ProjectModalPortal open={open}>
      <div className="project-modal project-modal--stacked" role="presentation">
        <button
          type="button"
          className="project-modal__backdrop"
          aria-label={`Close ${isEditing ? "edit" : "add"} template dialog`}
          onClick={onClose}
        />

        <div
          className="project-modal__dialog"
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
        >
          <div className="project-modal__header">
            <h2 id={titleId} className="project-modal__title">
              {isEditing ? "Edit Template" : "New Template"}
            </h2>
            <p className="project-modal__subtitle">
              {isEditing
                ? "Update the header or footer template details."
                : "Create a reusable header or footer template for reports."}
            </p>
          </div>

          <form id={formId} className="project-modal__form" onSubmit={handleSubmit} noValidate>
            <div className="project-modal__fields">
              <FormField
                label="Name"
                required
                error={errors.name}
                className="project-modal__field--full"
              >
                <Input
                  variant="ui"
                  type="text"
                  placeholder="Template name"
                  value={form.name}
                  onChange={(e) => update("name", e.target.value)}
                  autoFocus
                />
              </FormField>

              <FormField label="Kind" required>
                <Select
                  value={form.kind}
                  onChange={(value) => update("kind", value as HeaderFooterTemplateKind)}
                  options={[...KIND_OPTIONS]}
                  placeholder="Select kind"
                  floatingMenu
                  disabled={isEditing}
                />
              </FormField>

              <FormField label="Type">
                <Select
                  value={form.reportType}
                  onChange={(value) =>
                    update("reportType", value as HeaderFooterReportType | "")
                  }
                  options={[...REPORT_TYPE_OPTIONS]}
                  placeholder="Select type"
                  floatingMenu
                />
              </FormField>
            </div>

            <div className="project-modal__footer">
              <UiButton type="button" variant="ghost" onClick={onClose} disabled={submitting}>
                Cancel
              </UiButton>
              <UiButton type="submit" variant="primary" disabled={submitting}>
                {submitting ? "Saving…" : isEditing ? "Save" : "Create"}
              </UiButton>
            </div>
          </form>
        </div>
      </div>
    </ProjectModalPortal>
  );
}
