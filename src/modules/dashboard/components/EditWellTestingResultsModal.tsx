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
import type { LogWellLog, LogWellLogFormPayload } from "../types/logWellLog";
import {
  WELL_LOGS_MODULE_ID,
  parseWellTypeOptions,
  type WellTypeOption,
} from "../utils/configModules";
import { DEFAULT_WELL_TYPE_OPTIONS } from "../utils/configModules/wellType";
import { useUserWellTypes } from "../hooks/useUserWellTypes";
import { ManageWellTypesModal } from "./configModules/ManageWellTypesModal";

export type { LogWellLogFormPayload };

type EditWellTestingResultsModalProps = Readonly<{
  open: boolean;
  onClose: () => void;
  mode?: "add" | "edit";
  logConfigurationId: string;
  wellTypes: WellTypeOption[];
  initialWellLog?: LogWellLog | null;
  onSubmit?: (payload: LogWellLogFormPayload) => void | Promise<void>;
  onWellTypesChange?: (options: WellTypeOption[]) => void;
}>;

type DraftState = {
  wellTypeId: string;
  depthFrom: string;
  depthTo: string;
  comments: string;
};

type DraftErrors = {
  wellTypeId?: string;
  depthFrom?: string;
  depthTo?: string;
};

const COMPANY_WELL_TYPE_OPTIONS = parseWellTypeOptions(DEFAULT_WELL_TYPE_OPTIONS, []);

function createDraft(
  wellTypes: WellTypeOption[],
  initial: LogWellLog | null | undefined
): DraftState {
  if (initial) {
    return {
      wellTypeId: initial.wellTypeId,
      depthFrom: initial.depthFrom,
      depthTo: initial.depthTo,
      comments: initial.comments,
    };
  }

  const firstActive = wellTypes.find((entry) => entry.active !== false && entry.id.trim());
  return {
    wellTypeId: firstActive?.id ?? "",
    depthFrom: "",
    depthTo: "",
    comments: "",
  };
}

export function EditWellTestingResultsModal({
  open,
  onClose,
  mode = "add",
  logConfigurationId,
  wellTypes,
  initialWellLog = null,
  onSubmit,
  onWellTypesChange,
}: EditWellTestingResultsModalProps) {
  const formId = useId();
  const [workingTypes, setWorkingTypes] = useState<WellTypeOption[]>(wellTypes);
  const [draft, setDraft] = useState<DraftState>(() => createDraft(wellTypes, initialWellLog));
  const [errors, setErrors] = useState<DraftErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [manageTypesOpen, setManageTypesOpen] = useState(false);

  const canManage = Boolean(logConfigurationId.trim());

  const wellTypesApi = useUserWellTypes(WELL_LOGS_MODULE_ID, {
    enabled: manageTypesOpen && canManage,
    logConfigurationId,
  });

  const manageTypeOptions =
    manageTypesOpen && wellTypesApi.items.length > 0 ? wellTypesApi.items : workingTypes;

  const activeTypes = useMemo(
    () => workingTypes.filter((entry) => entry.active !== false),
    [workingTypes]
  );

  const selectableTypes = useMemo(() => {
    if (mode !== "edit" || !initialWellLog?.wellTypeId) return activeTypes;
    const existing = workingTypes.find((entry) => entry.id === initialWellLog.wellTypeId);
    if (!existing || activeTypes.some((entry) => entry.id === existing.id)) {
      return activeTypes;
    }
    return [existing, ...activeTypes];
  }, [activeTypes, initialWellLog, mode, workingTypes]);

  const selectedType = useMemo(
    () =>
      selectableTypes.find((entry) => entry.id === draft.wellTypeId) ??
      workingTypes.find((entry) => entry.id === draft.wellTypeId) ??
      null,
    [draft.wellTypeId, selectableTypes, workingTypes]
  );

  const allowNegativeDepth = Boolean(selectedType?.allowNegativeDepth);

  useEffect(() => {
    if (!open) return;
    setWorkingTypes(wellTypes);
    setDraft(createDraft(wellTypes, mode === "edit" ? initialWellLog : null));
    setErrors({});
    setSubmitting(false);
    setManageTypesOpen(false);
    // Reseed only when the dialog opens or the edit target changes — not when
    // catalogs refresh after Manage, which would wipe in-progress input.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional
  }, [open, mode, initialWellLog]);

  useEffect(() => {
    if (!open || workingTypes.length > 0 || wellTypes.length === 0) return;
    setWorkingTypes(wellTypes);
    setDraft(createDraft(wellTypes, mode === "edit" ? initialWellLog : null));
  }, [open, wellTypes, workingTypes.length, mode, initialWellLog]);

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

  const handleSaveWellTypes = async (options: WellTypeOption[]) => {
    try {
      const saved = await wellTypesApi.save(options);
      setWorkingTypes(saved);
      onWellTypesChange?.(saved);
      setManageTypesOpen(false);
      showApiSuccess(undefined, "Well types saved.");
    } catch (err) {
      showApiError(err, API_ERROR_MESSAGES.UPDATE_LOG_CONFIGURATION);
    }
  };

  const wellTypeSelectOptions = useMemo(
    () => selectableTypes.map((entry) => ({ value: entry.id, label: entry.name })),
    [selectableTypes]
  );

  const validateDepth = (
    value: string,
    label: string
  ): string | undefined => {
    const trimmed = value.trim();
    if (!trimmed) return `${label} is required.`;
    const numeric = Number(trimmed);
    if (!Number.isFinite(numeric)) return `${label} must be a valid number.`;
    if (!allowNegativeDepth && numeric < 0) {
      return `${label} cannot be negative for this well type.`;
    }
    return undefined;
  };

  const validate = (): DraftErrors => {
    const next: DraftErrors = {};
    if (!draft.wellTypeId.trim() || !selectedType) {
      next.wellTypeId = "Well type is required.";
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

    const payload: LogWellLogFormPayload = {
      wellId: mode === "edit" ? (initialWellLog?.wellId ?? "") : "",
      depthFrom: draft.depthFrom.trim(),
      depthTo: draft.depthTo.trim(),
      wellTypeId: selectedType.id,
      wellTypeName: selectedType.name,
      comments: draft.comments.trim(),
    };

    setSubmitting(true);
    try {
      await onSubmit(payload);
      showApiSuccess(
        undefined,
        mode === "edit" ? "Well testing result updated." : "Well testing result added."
      );
      onClose();
    } catch (err) {
      showApiError(err, "Failed to save well testing result.");
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) return null;

  const title = mode === "edit" ? "Edit Well Testing Results" : "Well Testing Results";

  return (
    <>
      <ProjectModalPortal open={open}>
        <div className="project-modal project-modal--stacked" role="presentation">
          <button
            type="button"
            className="project-modal__backdrop"
            aria-label="Close Well Testing Results dialog"
            onClick={onClose}
          />
          <div
            className="project-modal__dialog project-modal__dialog--scroll project-modal__dialog--fields edit-well-testing-results-modal"
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
                <div className="project-modal__fields project-modal__fields--stack edit-well-testing-results-modal__fields">
                  <div
                    className={[
                      "ui-field",
                      "project-modal__field--full",
                      errors.wellTypeId ? "ui-field--error" : "",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                  >
                    <div className="edit-well-testing-results-modal__type-field-head">
                      <label className="ui-field__label" htmlFor={`${formId}-well-type`}>
                        Select well type
                        <span className="ui-field__required"> *</span>
                      </label>
                      {canManage ? (
                        <UiButton
                          type="button"
                          variant="primary"
                          size="sm"
                          className="edit-well-testing-results-modal__manage-btn"
                          onClick={() => setManageTypesOpen(true)}
                          disabled={submitting}
                        >
                          Manage
                        </UiButton>
                      ) : null}
                    </div>
                    <Select
                      id={`${formId}-well-type`}
                      value={draft.wellTypeId}
                      disabled={submitting || selectableTypes.length === 0}
                      options={wellTypeSelectOptions}
                      placeholder="Select well type"
                      onChange={(value) => {
                        setDraft((current) => ({
                          ...current,
                          wellTypeId: value,
                        }));
                        setErrors((current) => ({
                          ...current,
                          wellTypeId: undefined,
                          depthFrom: undefined,
                          depthTo: undefined,
                        }));
                      }}
                    />
                    {errors.wellTypeId ? (
                      <p className="ui-field__error">{errors.wellTypeId}</p>
                    ) : null}
                  </div>

                  {selectableTypes.length === 0 ? (
                    <p className="edit-well-testing-results-modal__hint">
                      No well types are configured for this log configuration. Use Manage to add
                      well types.
                    </p>
                  ) : null}

                  <FormField
                    label="Depth From (m)"
                    required
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
                    required
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

      <ManageWellTypesModal
        open={manageTypesOpen}
        options={manageTypeOptions}
        companyOptions={COMPANY_WELL_TYPE_OPTIONS}
        onClose={() => setManageTypesOpen(false)}
        onSave={(options) => {
          void handleSaveWellTypes(options);
        }}
      />
    </>
  );
}
