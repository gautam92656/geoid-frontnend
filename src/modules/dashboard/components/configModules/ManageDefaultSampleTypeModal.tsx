"use client";

import type { FormEvent } from "react";
import { useEffect, useId, useMemo, useState } from "react";
import { FormField, Select, UiButton, ProjectModalPortal } from "@/shared/components/ui";

export type DefaultSampleTypeChoice = Readonly<{
  id: string;
  name: string;
}>;

type ManageDefaultSampleTypeModalProps = Readonly<{
  open: boolean;
  /** Currently saved default sample type (first entry when stored as a list). */
  selected: DefaultSampleTypeChoice | null;
  /** Sample types available to choose from (Samples module / company defaults). */
  sampleTypeOptions: ReadonlyArray<DefaultSampleTypeChoice>;
  onClose: () => void;
  onSelect: (option: DefaultSampleTypeChoice) => void | Promise<void>;
}>;

export function ManageDefaultSampleTypeModal({
  open,
  selected,
  sampleTypeOptions,
  onClose,
  onSelect,
}: ManageDefaultSampleTypeModalProps) {
  const formId = useId();
  const titleId = useId();
  const [selectedId, setSelectedId] = useState("");
  const [error, setError] = useState<string | undefined>();
  const [submitting, setSubmitting] = useState(false);

  const selectOptions = useMemo(
    () =>
      sampleTypeOptions
        .filter((entry) => entry.id.trim() && entry.name.trim())
        .map((entry) => ({ value: entry.id, label: entry.name })),
    [sampleTypeOptions]
  );

  useEffect(() => {
    if (!open) return;
    const initialId = selected?.id?.trim() ?? "";
    const exists = selectOptions.some((entry) => entry.value === initialId);
    setSelectedId(exists ? initialId : "");
    setError(undefined);
    setSubmitting(false);
  }, [open, selected, selectOptions]);

  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !submitting) {
        event.stopImmediatePropagation();
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown, true);
    return () => window.removeEventListener("keydown", handleKeyDown, true);
  }, [onClose, open, submitting]);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const trimmedId = selectedId.trim();
    if (!trimmedId) {
      setError("Please select a default sample type.");
      return;
    }

    const choice =
      sampleTypeOptions.find((entry) => entry.id === trimmedId) ??
      selectOptions
        .filter((entry) => entry.value === trimmedId)
        .map((entry) => ({ id: entry.value, name: entry.label }))[0];

    if (!choice) {
      setError("Please select a default sample type.");
      return;
    }

    setError(undefined);
    setSubmitting(true);
    try {
      await onSelect({ id: choice.id, name: choice.name });
    } catch {
      // Parent surfaces errors; keep modal open for retry.
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) return null;

  return (
    <ProjectModalPortal open={open}>
      <div className="project-modal project-modal--stacked" role="presentation">
        <button
          type="button"
          className="project-modal__backdrop"
          aria-label="Close Sample Type dialog"
          onClick={onClose}
          disabled={submitting}
        />

        <div
          className="project-modal__dialog project-modal__dialog--scroll manage-default-sample-type-modal"
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
        >
          <form id={formId} className="project-modal__form" onSubmit={handleSubmit}>
            <div className="project-modal__header">
              <h2 id={titleId} className="project-modal__title">
                Sample Type
              </h2>
              <p className="project-modal__subtitle">Please select a Default Sample Type</p>
            </div>

            <div className="project-modal__body ui-scrollbar">
              <FormField
                label="Sample Type"
                required
                error={error}
                htmlFor={`${formId}-sample-type`}
                className="project-modal__field--full"
              >
                <Select
                  id={`${formId}-sample-type`}
                  value={selectedId}
                  disabled={submitting || selectOptions.length === 0}
                  search
                  searchPlaceholder="Search..."
                  placeholder={
                    selectOptions.length === 0
                      ? "No sample types available"
                      : "Select Sample Type"
                  }
                  options={selectOptions}
                  floatingMenu
                  onChange={(value) => {
                    setSelectedId(value);
                    if (error) setError(undefined);
                  }}
                />
              </FormField>

              {selectOptions.length === 0 ? (
                <p className="manage-origins-modal__hint">
                  Add Sample Types in the Samples module, then return here to choose a default.
                </p>
              ) : null}
            </div>

            <div className="project-modal__footer">
              <UiButton type="button" variant="ghost" onClick={onClose} disabled={submitting}>
                Cancel
              </UiButton>
              <UiButton
                type="submit"
                variant="primary"
                form={formId}
                disabled={submitting || selectOptions.length === 0}
              >
                Select
              </UiButton>
            </div>
          </form>
        </div>
      </div>
    </ProjectModalPortal>
  );
}
