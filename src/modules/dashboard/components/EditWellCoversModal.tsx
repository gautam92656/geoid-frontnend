"use client";

import { useEffect, useId, useMemo, useState, type FormEvent } from "react";
import {
  FormField,
  Input,
  Select,
  UiButton,
  ProjectModalPortal,
} from "@/shared/components/ui";
import { showApiError, showApiSuccess } from "@/shared/utils/apiToast";
import { API_ERROR_MESSAGES } from "@/shared/constants/apiMessages";
import type { LogWellCover, LogWellCoverFormPayload } from "../types/logWellCover";
import {
  DEFAULT_WELL_COVER_TYPE_OPTIONS,
  WELL_LOGS_MODULE_ID,
  type WellCoverTypeOption,
} from "../utils/configModules";
import { useUserWellCoverTypes } from "../hooks/useUserWellCoverTypes";
import { ManageWellCoverTypesModal } from "./configModules/ManageWellCoverTypesModal";

export type { LogWellCoverFormPayload };

type EditWellCoversModalProps = Readonly<{
  open: boolean;
  onClose: () => void;
  mode?: "add" | "edit";
  logConfigurationId: string;
  wellCoverTypes: WellCoverTypeOption[];
  initialCover?: LogWellCover | null;
  onSubmit?: (payload: LogWellCoverFormPayload) => void | Promise<void>;
  onWellCoverTypesChange?: (options: WellCoverTypeOption[]) => void;
}>;

type DraftState = {
  wellCoverTypeId: string;
  depth: string;
  comments: string;
};

type DraftErrors = {
  wellCoverTypeId?: string;
  depth?: string;
};

function createDraft(
  wellCoverTypes: WellCoverTypeOption[],
  initial: LogWellCover | null | undefined
): DraftState {
  if (initial) {
    return {
      wellCoverTypeId: initial.wellCoverTypeId,
      depth: initial.depth,
      comments: initial.comments,
    };
  }

  const firstType = wellCoverTypes.find((entry) => entry.active !== false && entry.id.trim());
  return {
    wellCoverTypeId: firstType?.id ?? "",
    depth: "",
    comments: "",
  };
}

export function EditWellCoversModal({
  open,
  onClose,
  mode = "add",
  logConfigurationId,
  wellCoverTypes,
  initialCover = null,
  onSubmit,
  onWellCoverTypesChange,
}: EditWellCoversModalProps) {
  const formId = useId();
  const [workingTypes, setWorkingTypes] = useState<WellCoverTypeOption[]>(wellCoverTypes);
  const [draft, setDraft] = useState<DraftState>(() => createDraft(wellCoverTypes, initialCover));
  const [errors, setErrors] = useState<DraftErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [manageTypesOpen, setManageTypesOpen] = useState(false);

  const canManageTypes = Boolean(logConfigurationId.trim());

  const wellCoverTypesApi = useUserWellCoverTypes(WELL_LOGS_MODULE_ID, {
    enabled: manageTypesOpen && canManageTypes,
    logConfigurationId,
  });

  const manageTypeOptions =
    manageTypesOpen && wellCoverTypesApi.items.length > 0
      ? wellCoverTypesApi.items
      : workingTypes;

  const activeTypes = useMemo(
    () => workingTypes.filter((entry) => entry.active !== false),
    [workingTypes]
  );

  const selectableTypes = useMemo(() => {
    if (mode !== "edit" || !initialCover?.wellCoverTypeId) return activeTypes;
    const existing = workingTypes.find((entry) => entry.id === initialCover.wellCoverTypeId);
    if (!existing || activeTypes.some((entry) => entry.id === existing.id)) {
      return activeTypes;
    }
    return [existing, ...activeTypes];
  }, [activeTypes, initialCover, mode, workingTypes]);

  const selectedType = useMemo(
    () =>
      selectableTypes.find((entry) => entry.id === draft.wellCoverTypeId) ??
      workingTypes.find((entry) => entry.id === draft.wellCoverTypeId) ??
      null,
    [draft.wellCoverTypeId, selectableTypes, workingTypes]
  );

  const allowNegativeDepth = Boolean(selectedType?.allowNegativeDepth);

  useEffect(() => {
    if (!open) return;
    setWorkingTypes(wellCoverTypes);
    setDraft(createDraft(wellCoverTypes, mode === "edit" ? initialCover : null));
    setErrors({});
    setSubmitting(false);
    setManageTypesOpen(false);
    // Reseed only when the dialog opens or the edit target changes — not when
    // cover types are refreshed after Manage, which would wipe in-progress input.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional
  }, [open, mode, initialCover]);

  useEffect(() => {
    if (!open || workingTypes.length > 0 || wellCoverTypes.length === 0) return;
    setWorkingTypes(wellCoverTypes);
    setDraft(createDraft(wellCoverTypes, mode === "edit" ? initialCover : null));
  }, [open, wellCoverTypes, workingTypes.length, mode, initialCover]);

  useEffect(() => {
    if (!open || manageTypesOpen) return;
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
  }, [open, manageTypesOpen, onClose]);

  const handleSaveWellCoverTypes = async (options: WellCoverTypeOption[]) => {
    try {
      const saved = await wellCoverTypesApi.save(options);
      setWorkingTypes(saved);
      onWellCoverTypesChange?.(saved);
      setManageTypesOpen(false);
      showApiSuccess(undefined, "Well cover types saved.");
    } catch (err) {
      showApiError(err, API_ERROR_MESSAGES.UPDATE_LOG_CONFIGURATION);
    }
  };

  const coverTypeSelectOptions = useMemo(
    () => selectableTypes.map((entry) => ({ value: entry.id, label: entry.name })),
    [selectableTypes]
  );

  const validate = (): DraftErrors => {
    const next: DraftErrors = {};
    if (!draft.wellCoverTypeId.trim() || !selectedType) {
      next.wellCoverTypeId = "Well cover type is required.";
    }

    const trimmedDepth = draft.depth.trim();
    if (trimmedDepth) {
      const numeric = Number(trimmedDepth);
      if (!Number.isFinite(numeric)) {
        next.depth = "Depth must be a valid number.";
      } else if (!allowNegativeDepth && numeric < 0) {
        next.depth = "Depth cannot be negative for this well cover type.";
      }
    }

    return next;
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!onSubmit || submitting) return;

    const nextErrors = validate();
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0 || !selectedType) return;

    const payload: LogWellCoverFormPayload = {
      wellId: mode === "edit" ? (initialCover?.wellId ?? "") : "",
      wellIdLabel: mode === "edit" ? (initialCover?.wellIdLabel ?? "") : "",
      wellCoverTypeId: selectedType.id,
      wellCoverTypeName: selectedType.name,
      depth: draft.depth.trim(),
      comments: draft.comments.trim(),
    };

    setSubmitting(true);
    try {
      await onSubmit(payload);
      showApiSuccess(
        undefined,
        mode === "edit" ? "Well cover updated." : "Well cover added."
      );
      onClose();
    } catch (err) {
      showApiError(err, "Failed to save well cover.");
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) return null;

  const title = mode === "edit" ? "Edit Well Cover" : "Well Cover";

  return (
    <>
      <ProjectModalPortal open={open}>
        <div className="project-modal project-modal--stacked" role="presentation">
          <button
            type="button"
            className="project-modal__backdrop"
            aria-label="Close Well Cover dialog"
            onClick={onClose}
          />
          <div
            className="project-modal__dialog project-modal__dialog--scroll project-modal__dialog--fields edit-well-covers-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby={`${formId}-title`}
          >
            <div className="project-modal__header">
              <h2 id={`${formId}-title`} className="project-modal__title">
                {title}
              </h2>
            </div>

            <form className="project-modal__form" onSubmit={(e) => void handleSubmit(e)} noValidate>
              <div className="project-modal__body ui-scrollbar">
                <div className="project-modal__fields project-modal__fields--stack edit-well-covers-modal__fields">
                  <div
                    className={[
                      "ui-field",
                      "project-modal__field--full",
                      errors.wellCoverTypeId ? "ui-field--error" : "",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                  >
                    <div className="edit-well-covers-modal__type-field-head">
                      <label className="ui-field__label" htmlFor={`${formId}-cover-type`}>
                        Select Well Cover Type
                        <span className="ui-field__required"> *</span>
                      </label>
                      {canManageTypes ? (
                        <UiButton
                          type="button"
                          variant="primary"
                          size="sm"
                          className="edit-well-covers-modal__manage-btn"
                          onClick={() => setManageTypesOpen(true)}
                          disabled={submitting}
                        >
                          Manage
                        </UiButton>
                      ) : null}
                    </div>
                    <Select
                      id={`${formId}-cover-type`}
                      value={draft.wellCoverTypeId}
                      disabled={submitting || selectableTypes.length === 0}
                      options={coverTypeSelectOptions}
                      placeholder="Select well cover type"
                      onChange={(value) => {
                        setDraft((current) => ({
                          ...current,
                          wellCoverTypeId: value,
                        }));
                        setErrors((current) => ({
                          ...current,
                          wellCoverTypeId: undefined,
                          depth: undefined,
                        }));
                      }}
                    />
                    {errors.wellCoverTypeId ? (
                      <p className="ui-field__error">{errors.wellCoverTypeId}</p>
                    ) : null}
                  </div>

                  {selectableTypes.length === 0 ? (
                    <p className="edit-well-covers-modal__hint">
                      No well cover types are configured for this log configuration. Use Manage to
                      add cover types.
                    </p>
                  ) : null}

                  <FormField
                    label="Depth (m)"
                    error={errors.depth}
                    htmlFor={`${formId}-depth`}
                    className="project-modal__field--full"
                  >
                    <Input
                      id={`${formId}-depth`}
                      variant="ui"
                      type="number"
                      step="any"
                      min={allowNegativeDepth ? undefined : 0}
                      value={draft.depth}
                      placeholder="Depth From"
                      disabled={submitting}
                      onChange={(event) => {
                        setDraft((current) => ({
                          ...current,
                          depth: event.target.value,
                        }));
                        setErrors((current) => ({ ...current, depth: undefined }));
                      }}
                    />
                  </FormField>

                  <FormField
                    label="Comments"
                    htmlFor={`${formId}-comments`}
                    className="project-modal__field--full"
                  >
                    <textarea
                      id={`${formId}-comments`}
                      className="ui-textarea"
                      rows={3}
                      value={draft.comments}
                      placeholder="Comments"
                      disabled={submitting}
                      onChange={(event) =>
                        setDraft((current) => ({
                          ...current,
                          comments: event.target.value,
                        }))
                      }
                    />
                  </FormField>
                </div>
              </div>

              <div className="project-modal__footer">
                <UiButton type="button" variant="outline" onClick={onClose} disabled={submitting}>
                  Cancel
                </UiButton>
                <UiButton type="submit" variant="primary" disabled={submitting}>
                  {submitting ? "Saving…" : "Submit"}
                </UiButton>
              </div>
            </form>
          </div>
        </div>
      </ProjectModalPortal>

      <ManageWellCoverTypesModal
        open={manageTypesOpen}
        options={manageTypeOptions}
        companyOptions={DEFAULT_WELL_COVER_TYPE_OPTIONS}
        onClose={() => setManageTypesOpen(false)}
        onSave={(options) => {
          void handleSaveWellCoverTypes(options);
        }}
      />
    </>
  );
}
