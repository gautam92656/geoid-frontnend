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
import type { LogWellBackfill, LogWellBackfillFormPayload } from "../types/logWellBackfill";
import {
  DEFAULT_WELL_BACKFILL_TYPE_OPTIONS,
  WELL_LOGS_MODULE_ID,
  type WellBackfillTypeOption,
} from "../utils/configModules";
import { useUserWellBackfillTypes } from "../hooks/useUserWellBackfillTypes";
import { ManageWellBackfillTypesModal } from "./configModules/ManageWellBackfillTypesModal";

export type { LogWellBackfillFormPayload };

type EditWellBackfillModalProps = Readonly<{
  open: boolean;
  onClose: () => void;
  mode?: "add" | "edit";
  logConfigurationId: string;
  backfillTypes: WellBackfillTypeOption[];
  initialBackfill?: LogWellBackfill | null;
  onSubmit?: (payload: LogWellBackfillFormPayload) => void | Promise<void>;
  onBackfillTypesChange?: (options: WellBackfillTypeOption[]) => void;
}>;

type DraftState = {
  depthFrom: string;
  depthTo: string;
  backfillTypeId: string;
  comments: string;
};

type DraftErrors = {
  backfillTypeId?: string;
  depthFrom?: string;
  depthTo?: string;
};

function createDraft(
  backfillTypes: WellBackfillTypeOption[],
  initial: LogWellBackfill | null | undefined
): DraftState {
  if (initial) {
    return {
      depthFrom: initial.depthFrom,
      depthTo: initial.depthTo,
      backfillTypeId: initial.backfillTypeId,
      comments: initial.comments,
    };
  }

  const firstType = backfillTypes.find((entry) => entry.active !== false && entry.id.trim());
  return {
    depthFrom: "",
    depthTo: "",
    backfillTypeId: firstType?.id ?? "",
    comments: "",
  };
}

export function EditWellBackfillModal({
  open,
  onClose,
  mode = "add",
  logConfigurationId,
  backfillTypes,
  initialBackfill = null,
  onSubmit,
  onBackfillTypesChange,
}: EditWellBackfillModalProps) {
  const formId = useId();
  const [workingTypes, setWorkingTypes] = useState<WellBackfillTypeOption[]>(backfillTypes);
  const [draft, setDraft] = useState<DraftState>(() => createDraft(backfillTypes, initialBackfill));
  const [errors, setErrors] = useState<DraftErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [manageTypesOpen, setManageTypesOpen] = useState(false);

  const canManageTypes = Boolean(logConfigurationId.trim());

  const backfillTypesApi = useUserWellBackfillTypes(WELL_LOGS_MODULE_ID, {
    enabled: manageTypesOpen && canManageTypes,
    logConfigurationId,
  });

  const manageTypeOptions =
    manageTypesOpen && backfillTypesApi.items.length > 0
      ? backfillTypesApi.items
      : workingTypes;

  const activeTypes = useMemo(
    () => workingTypes.filter((entry) => entry.active !== false),
    [workingTypes]
  );

  const selectableTypes = useMemo(() => {
    if (mode !== "edit" || !initialBackfill?.backfillTypeId) return activeTypes;
    const existing = workingTypes.find((entry) => entry.id === initialBackfill.backfillTypeId);
    if (!existing || activeTypes.some((entry) => entry.id === existing.id)) {
      return activeTypes;
    }
    return [existing, ...activeTypes];
  }, [activeTypes, initialBackfill, mode, workingTypes]);

  const selectedType = useMemo(
    () =>
      selectableTypes.find((entry) => entry.id === draft.backfillTypeId) ??
      workingTypes.find((entry) => entry.id === draft.backfillTypeId) ??
      null,
    [draft.backfillTypeId, selectableTypes, workingTypes]
  );

  const allowNegativeDepth = Boolean(selectedType?.allowNegativeDepth);

  useEffect(() => {
    if (!open) return;
    setWorkingTypes(backfillTypes);
    setDraft(createDraft(backfillTypes, mode === "edit" ? initialBackfill : null));
    setErrors({});
    setSubmitting(false);
    setManageTypesOpen(false);
    // Reseed only when the dialog opens or the edit target changes — not when
    // backfill types are refreshed after Manage, which would wipe in-progress input.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional
  }, [open, mode, initialBackfill]);

  useEffect(() => {
    if (!open || workingTypes.length > 0 || backfillTypes.length === 0) return;
    setWorkingTypes(backfillTypes);
    setDraft(createDraft(backfillTypes, mode === "edit" ? initialBackfill : null));
  }, [open, backfillTypes, workingTypes.length, mode, initialBackfill]);

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

  const handleSaveBackfillTypes = async (options: WellBackfillTypeOption[]) => {
    try {
      const saved = await backfillTypesApi.save(options);
      setWorkingTypes(saved);
      onBackfillTypesChange?.(saved);
      setManageTypesOpen(false);
      showApiSuccess(undefined, "Well backfill types saved.");
    } catch (err) {
      showApiError(err, API_ERROR_MESSAGES.UPDATE_LOG_CONFIGURATION);
    }
  };

  const backfillTypeSelectOptions = useMemo(
    () => selectableTypes.map((entry) => ({ value: entry.id, label: entry.name })),
    [selectableTypes]
  );

  const validateDepth = (value: string, label: string): string | undefined => {
    const trimmed = value.trim();
    if (!trimmed) return undefined;
    const numeric = Number(trimmed);
    if (!Number.isFinite(numeric)) return `${label} must be a valid number.`;
    if (!allowNegativeDepth && numeric < 0) {
      return `${label} cannot be negative for this backfill type.`;
    }
    return undefined;
  };

  const validate = (): DraftErrors => {
    const next: DraftErrors = {};
    if (!draft.backfillTypeId.trim() || !selectedType) {
      next.backfillTypeId = "Backfill type is required.";
    }
    const depthFromError = validateDepth(draft.depthFrom, "Depth From");
    if (depthFromError) next.depthFrom = depthFromError;
    const depthToError = validateDepth(draft.depthTo, "Depth To");
    if (depthToError) next.depthTo = depthToError;
    return next;
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!onSubmit || submitting) return;

    const nextErrors = validate();
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0 || !selectedType) return;

    const payload: LogWellBackfillFormPayload = {
      depthFrom: draft.depthFrom.trim(),
      depthTo: draft.depthTo.trim(),
      backfillTypeId: selectedType.id,
      backfillTypeName: selectedType.name,
      comments: draft.comments.trim(),
    };

    setSubmitting(true);
    try {
      await onSubmit(payload);
      showApiSuccess(
        undefined,
        mode === "edit" ? "Well backfill updated." : "Well backfill added."
      );
      onClose();
    } catch (err) {
      showApiError(err, "Failed to save well backfill.");
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) return null;

  const title = mode === "edit" ? "Edit Backfill Testing Results" : "Backfill Testing Results";

  return (
    <>
      <ProjectModalPortal open={open}>
        <div className="project-modal project-modal--stacked" role="presentation">
          <button
            type="button"
            className="project-modal__backdrop"
            aria-label="Close Backfill Testing Results dialog"
            onClick={onClose}
          />
          <div
            className="project-modal__dialog project-modal__dialog--scroll project-modal__dialog--fields edit-well-backfill-modal"
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
                <div className="project-modal__fields project-modal__fields--stack edit-well-backfill-modal__fields">
                  <FormField
                    label="Depth From (m)"
                    error={errors.depthFrom}
                    htmlFor={`${formId}-depth-from`}
                    className="project-modal__field--full"
                  >
                    <Input
                      id={`${formId}-depth-from`}
                      variant="ui"
                      type="number"
                      step="any"
                      min={allowNegativeDepth ? undefined : 0}
                      value={draft.depthFrom}
                      placeholder="Depth From"
                      disabled={submitting}
                      onChange={(event) => {
                        setDraft((current) => ({
                          ...current,
                          depthFrom: event.target.value,
                        }));
                        setErrors((current) => ({ ...current, depthFrom: undefined }));
                      }}
                    />
                  </FormField>

                  <FormField
                    label="Depth To (m)"
                    error={errors.depthTo}
                    htmlFor={`${formId}-depth-to`}
                    className="project-modal__field--full"
                  >
                    <Input
                      id={`${formId}-depth-to`}
                      variant="ui"
                      type="number"
                      step="any"
                      min={allowNegativeDepth ? undefined : 0}
                      value={draft.depthTo}
                      placeholder="Depth To"
                      disabled={submitting}
                      onChange={(event) => {
                        setDraft((current) => ({
                          ...current,
                          depthTo: event.target.value,
                        }));
                        setErrors((current) => ({ ...current, depthTo: undefined }));
                      }}
                    />
                  </FormField>

                  <div
                    className={[
                      "ui-field",
                      "project-modal__field--full",
                      errors.backfillTypeId ? "ui-field--error" : "",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                  >
                    <div className="edit-well-backfill-modal__type-field-head">
                      <label className="ui-field__label" htmlFor={`${formId}-backfill-type`}>
                        Select Backfill type
                        <span className="ui-field__required"> *</span>
                      </label>
                      {canManageTypes ? (
                        <UiButton
                          type="button"
                          variant="primary"
                          size="sm"
                          className="edit-well-backfill-modal__manage-btn"
                          onClick={() => setManageTypesOpen(true)}
                          disabled={submitting}
                        >
                          Manage
                        </UiButton>
                      ) : null}
                    </div>
                    <Select
                      id={`${formId}-backfill-type`}
                      value={draft.backfillTypeId}
                      disabled={submitting || selectableTypes.length === 0}
                      options={backfillTypeSelectOptions}
                      placeholder="Select backfill type"
                      onChange={(value) => {
                        setDraft((current) => ({
                          ...current,
                          backfillTypeId: value,
                        }));
                        setErrors((current) => ({
                          ...current,
                          backfillTypeId: undefined,
                          depthFrom: undefined,
                          depthTo: undefined,
                        }));
                      }}
                    />
                    {errors.backfillTypeId ? (
                      <p className="ui-field__error">{errors.backfillTypeId}</p>
                    ) : null}
                  </div>

                  {selectableTypes.length === 0 ? (
                    <p className="edit-well-backfill-modal__hint">
                      No well backfill types are configured for this log configuration. Use Manage
                      to add backfill types.
                    </p>
                  ) : null}

                  <FormField
                    label="Notes"
                    htmlFor={`${formId}-notes`}
                    className="project-modal__field--full"
                  >
                    <textarea
                      id={`${formId}-notes`}
                      className="ui-textarea"
                      rows={3}
                      value={draft.comments}
                      placeholder="Notes"
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

      <ManageWellBackfillTypesModal
        open={manageTypesOpen}
        options={manageTypeOptions}
        companyOptions={DEFAULT_WELL_BACKFILL_TYPE_OPTIONS}
        onClose={() => setManageTypesOpen(false)}
        onSave={(options) => {
          void handleSaveBackfillTypes(options);
        }}
      />
    </>
  );
}
