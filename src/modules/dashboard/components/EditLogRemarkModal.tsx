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
import type { LogRemark } from "../types/logRemark";
import {
  DEFAULT_REMARK_TYPE_OPTIONS,
  LOG_REMARKS_MODULE_ID,
  type RemarkTypeOption,
} from "../utils/configModules";
import { useUserRemarkTypes } from "../hooks/useUserRemarkTypes";
import { ManageRemarkTypesModal } from "./configModules/ManageRemarkTypesModal";

export type LogRemarkFormSubmitPayload = {
  depthFrom: string;
  depthTo: string;
  remarkTypeId: string;
  remarkTypeName: string;
  remarks: string;
};

type EditLogRemarkModalProps = Readonly<{
  open: boolean;
  onClose: () => void;
  mode?: "add" | "edit";
  logConfigurationId: string;
  remarkTypes: RemarkTypeOption[];
  initialRemark?: LogRemark | null;
  onSubmit?: (payload: LogRemarkFormSubmitPayload) => void | Promise<void>;
  onRemarkTypesChange?: (options: RemarkTypeOption[]) => void;
}>;

type DraftState = {
  remarkTypeId: string;
  depthFrom: string;
  depthTo: string;
  remarks: string;
};

type DraftErrors = {
  remarkTypeId?: string;
  depthFrom?: string;
  remarks?: string;
};

function createDraft(
  remarkTypes: RemarkTypeOption[],
  initial: LogRemark | null | undefined
): DraftState {
  if (initial) {
    return {
      remarkTypeId: initial.remarkTypeId,
      depthFrom: initial.depthFrom,
      depthTo: initial.depthTo,
      remarks: initial.remarks,
    };
  }

  const firstActive = remarkTypes.find((entry) => entry.active !== false && entry.id.trim());
  return {
    remarkTypeId: firstActive?.id ?? "",
    depthFrom: "",
    depthTo: "",
    remarks: "",
  };
}

export function EditLogRemarkModal({
  open,
  onClose,
  mode = "add",
  logConfigurationId,
  remarkTypes,
  initialRemark = null,
  onSubmit,
  onRemarkTypesChange,
}: EditLogRemarkModalProps) {
  const formId = useId();
  const [workingTypes, setWorkingTypes] = useState<RemarkTypeOption[]>(remarkTypes);
  const [draft, setDraft] = useState<DraftState>(() => createDraft(remarkTypes, initialRemark));
  const [errors, setErrors] = useState<DraftErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [manageTypesOpen, setManageTypesOpen] = useState(false);

  const canManageTypes = Boolean(logConfigurationId.trim());

  const remarkTypesApi = useUserRemarkTypes(LOG_REMARKS_MODULE_ID, {
    enabled: manageTypesOpen && canManageTypes,
    logConfigurationId,
  });

  const manageTypeOptions =
    manageTypesOpen && remarkTypesApi.items.length > 0
      ? remarkTypesApi.items
      : workingTypes;

  const activeTypes = useMemo(
    () => workingTypes.filter((entry) => entry.active !== false),
    [workingTypes]
  );

  const selectableTypes = useMemo(() => {
    if (mode !== "edit" || !initialRemark?.remarkTypeId) return activeTypes;
    const existing = workingTypes.find((entry) => entry.id === initialRemark.remarkTypeId);
    if (!existing || activeTypes.some((entry) => entry.id === existing.id)) {
      return activeTypes;
    }
    return [existing, ...activeTypes];
  }, [activeTypes, initialRemark, mode, workingTypes]);

  const selectedType = useMemo(
    () =>
      selectableTypes.find((entry) => entry.id === draft.remarkTypeId) ??
      workingTypes.find((entry) => entry.id === draft.remarkTypeId) ??
      null,
    [draft.remarkTypeId, selectableTypes, workingTypes]
  );

  useEffect(() => {
    if (!open) return;
    setWorkingTypes(remarkTypes);
    setDraft(createDraft(remarkTypes, mode === "edit" ? initialRemark : null));
    setErrors({});
    setSubmitting(false);
    setManageTypesOpen(false);
    // Reseed only when the dialog opens or the edit target changes — not when
    // remark types are refreshed after Manage, which would wipe in-progress input.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional
  }, [open, mode, initialRemark]);

  useEffect(() => {
    if (!open || workingTypes.length > 0 || remarkTypes.length === 0) return;
    setWorkingTypes(remarkTypes);
    setDraft(createDraft(remarkTypes, mode === "edit" ? initialRemark : null));
  }, [open, remarkTypes, workingTypes.length, mode, initialRemark]);

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

  const handleSaveRemarkTypes = async (options: RemarkTypeOption[]) => {
    try {
      const saved = await remarkTypesApi.save(options);
      setWorkingTypes(saved);
      onRemarkTypesChange?.(saved);
      setManageTypesOpen(false);
      showApiSuccess(undefined, "Remark types saved.");
    } catch (err) {
      showApiError(err, API_ERROR_MESSAGES.UPDATE_LOG_CONFIGURATION);
    }
  };

  const remarkTypeSelectOptions = useMemo(
    () => selectableTypes.map((entry) => ({ value: entry.id, label: entry.name })),
    [selectableTypes]
  );

  const validate = (): DraftErrors => {
    const next: DraftErrors = {};
    if (!draft.remarkTypeId.trim() || !selectedType) {
      next.remarkTypeId = "Remark type is required.";
    }
    if (!draft.depthFrom.trim()) {
      next.depthFrom = "Depth From is required.";
    }
    return next;
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!onSubmit || submitting) return;

    const nextErrors = validate();
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0 || !selectedType) return;

    const payload: LogRemarkFormSubmitPayload = {
      depthFrom: draft.depthFrom.trim(),
      depthTo: draft.depthTo.trim(),
      remarkTypeId: selectedType.id,
      remarkTypeName: selectedType.name,
      remarks: draft.remarks.trim(),
    };

    setSubmitting(true);
    try {
      await onSubmit(payload);
      showApiSuccess(
        undefined,
        mode === "edit" ? "Log remark updated." : "Log remark added."
      );
      onClose();
    } catch (err) {
      showApiError(err, API_ERROR_MESSAGES.SAVE_LOG_REMARK);
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) return null;

  const title = mode === "edit" ? "Edit Log Remarks" : "Add Log Remarks";

  return (
    <>
      <ProjectModalPortal open={open}>
        <div className="project-modal project-modal--stacked" role="presentation">
          <button
            type="button"
            className="project-modal__backdrop"
            aria-label="Close Log Remarks dialog"
            onClick={onClose}
          />
          <div
            className="project-modal__dialog project-modal__dialog--scroll project-modal__dialog--fields edit-log-remark-modal"
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
                <div className="project-modal__fields project-modal__fields--stack edit-log-remark-modal__fields">
                  <div
                    className={[
                      "ui-field",
                      "project-modal__field--full",
                      errors.remarkTypeId ? "ui-field--error" : "",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                  >
                    <div className="edit-log-remark-modal__type-field-head">
                      <label className="ui-field__label" htmlFor={`${formId}-type`}>
                        Select Remark Type
                        <span className="ui-field__required"> *</span>
                      </label>
                      {canManageTypes ? (
                        <UiButton
                          type="button"
                          variant="primary"
                          size="sm"
                          className="edit-log-remark-modal__manage-btn"
                          onClick={() => setManageTypesOpen(true)}
                          disabled={submitting}
                        >
                          Manage
                        </UiButton>
                      ) : null}
                    </div>
                    <Select
                      id={`${formId}-type`}
                      value={draft.remarkTypeId}
                      disabled={submitting || selectableTypes.length === 0 || mode === "edit"}
                      options={remarkTypeSelectOptions}
                      placeholder="Select remark type"
                      onChange={(value) => {
                        setDraft((current) => ({ ...current, remarkTypeId: value }));
                        setErrors((current) => ({ ...current, remarkTypeId: undefined }));
                      }}
                    />
                    {errors.remarkTypeId ? (
                      <p className="ui-field__error">{errors.remarkTypeId}</p>
                    ) : null}
                  </div>

                  {selectableTypes.length === 0 ? (
                    <p className="edit-log-remark-modal__hint">
                      No remark types are configured for this log configuration. Use Manage to add
                      remark types.
                    </p>
                  ) : null}

                  <div className="edit-log-remark-modal__row">
                    <FormField
                      label="Depth From (m)"
                      required
                      error={errors.depthFrom}
                      htmlFor={`${formId}-depth-from`}
                    >
                      <Input
                        id={`${formId}-depth-from`}
                        variant="ui"
                        type="number"
                        step="any"
                        value={draft.depthFrom}
                        placeholder="Type"
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

                    <FormField label="Depth To (m)" htmlFor={`${formId}-depth-to`}>
                      <Input
                        id={`${formId}-depth-to`}
                        variant="ui"
                        type="number"
                        step="any"
                        value={draft.depthTo}
                        placeholder="Optional"
                        disabled={submitting}
                        onChange={(event) =>
                          setDraft((current) => ({
                            ...current,
                            depthTo: event.target.value,
                          }))
                        }
                      />
                    </FormField>
                  </div>

                  <FormField
                    label="Remarks"
                    error={errors.remarks}
                    htmlFor={`${formId}-remarks`}
                    className="project-modal__field--full"
                  >
                    <textarea
                      id={`${formId}-remarks`}
                      className="ui-textarea"
                      rows={4}
                      value={draft.remarks}
                      placeholder="Enter remarks"
                      disabled={submitting}
                      onChange={(event) => {
                        const value = event.target.value;
                        setDraft((current) => ({ ...current, remarks: value }));
                        setErrors((current) => ({ ...current, remarks: undefined }));
                      }}
                    />
                  </FormField>
                </div>
              </div>

              <div className="project-modal__footer">
                <UiButton
                  type="button"
                  variant="outline"
                  onClick={onClose}
                  disabled={submitting}
                >
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

      <ManageRemarkTypesModal
        open={manageTypesOpen}
        options={manageTypeOptions}
        companyOptions={DEFAULT_REMARK_TYPE_OPTIONS}
        onClose={() => setManageTypesOpen(false)}
        onSave={(options) => {
          void handleSaveRemarkTypes(options);
        }}
      />
    </>
  );
}
