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
import type {
  LogDrillingCasing,
  LogDrillingCasingFormPayload,
} from "../types/logDrillingCasing";
import {
  DRILLING_OBSERVATIONS_MODULE_ID,
  parseDrillingCasingOptions,
  type DrillingCasingOption,
} from "../utils/configModules";
import { drillingObservationsModule } from "../utils/configModules/modules/drilling-observations";
import { useUserDrillingCasings } from "../hooks/useUserDrillingCasings";
import { ManageDrillingCasingsModal } from "./configModules/ManageDrillingCasingsModal";

export type { LogDrillingCasingFormPayload };

type EditDrillingCasingsModalProps = Readonly<{
  open: boolean;
  onClose: () => void;
  mode?: "add" | "edit";
  logConfigurationId: string;
  casingTypes: DrillingCasingOption[];
  initialCasing?: LogDrillingCasing | null;
  onSubmit?: (payload: LogDrillingCasingFormPayload) => void | Promise<void>;
  onCasingTypesChange?: (options: DrillingCasingOption[]) => void;
}>;

type DraftState = {
  casingTypeId: string;
  depthFrom: string;
  depthTo: string;
  comments: string;
};

type DraftErrors = {
  casingTypeId?: string;
  depthFrom?: string;
  depthTo?: string;
};

const DEFAULT_DRILLING_CASING_OPTIONS = parseDrillingCasingOptions(
  drillingObservationsModule.defaultOptions?.["drilling-casings"] ?? []
);

function createDraft(
  casingTypes: DrillingCasingOption[],
  initial: LogDrillingCasing | null | undefined
): DraftState {
  if (initial) {
    return {
      casingTypeId: initial.casingTypeId,
      depthFrom: initial.depthFrom,
      depthTo: initial.depthTo,
      comments: initial.comments,
    };
  }

  const firstActive = casingTypes.find((entry) => entry.active !== false && entry.id.trim());
  return {
    casingTypeId: firstActive?.id ?? "",
    depthFrom: "",
    depthTo: "",
    comments: "",
  };
}

export function EditDrillingCasingsModal({
  open,
  onClose,
  mode = "add",
  logConfigurationId,
  casingTypes,
  initialCasing = null,
  onSubmit,
  onCasingTypesChange,
}: EditDrillingCasingsModalProps) {
  const formId = useId();
  const [workingTypes, setWorkingTypes] = useState<DrillingCasingOption[]>(casingTypes);
  const [draft, setDraft] = useState<DraftState>(() => createDraft(casingTypes, initialCasing));
  const [errors, setErrors] = useState<DraftErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [manageTypesOpen, setManageTypesOpen] = useState(false);

  const canManageTypes = Boolean(logConfigurationId.trim());

  const casingTypesApi = useUserDrillingCasings(DRILLING_OBSERVATIONS_MODULE_ID, {
    enabled: manageTypesOpen && canManageTypes,
    logConfigurationId,
  });

  const manageTypeOptions =
    manageTypesOpen && casingTypesApi.items.length > 0 ? casingTypesApi.items : workingTypes;

  const activeTypes = useMemo(
    () => workingTypes.filter((entry) => entry.active !== false),
    [workingTypes]
  );

  const selectableTypes = useMemo(() => {
    if (mode !== "edit" || !initialCasing?.casingTypeId) return activeTypes;
    const existing = workingTypes.find((entry) => entry.id === initialCasing.casingTypeId);
    if (!existing || activeTypes.some((entry) => entry.id === existing.id)) {
      return activeTypes;
    }
    return [existing, ...activeTypes];
  }, [activeTypes, initialCasing, mode, workingTypes]);

  const selectedType = useMemo(
    () =>
      selectableTypes.find((entry) => entry.id === draft.casingTypeId) ??
      workingTypes.find((entry) => entry.id === draft.casingTypeId) ??
      null,
    [draft.casingTypeId, selectableTypes, workingTypes]
  );

  useEffect(() => {
    if (!open) return;
    setWorkingTypes(casingTypes);
    setDraft(createDraft(casingTypes, mode === "edit" ? initialCasing : null));
    setErrors({});
    setSubmitting(false);
    setManageTypesOpen(false);
    // Reseed only when the dialog opens or the edit target changes — not when
    // casing types are refreshed after Manage, which would wipe in-progress input.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional
  }, [open, mode, initialCasing]);

  useEffect(() => {
    if (!open || workingTypes.length > 0 || casingTypes.length === 0) return;
    setWorkingTypes(casingTypes);
    setDraft(createDraft(casingTypes, mode === "edit" ? initialCasing : null));
  }, [open, casingTypes, workingTypes.length, mode, initialCasing]);

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

  const handleSaveCasingTypes = async (options: DrillingCasingOption[]) => {
    try {
      const saved = await casingTypesApi.save(options);
      setWorkingTypes(saved);
      onCasingTypesChange?.(saved);
      setManageTypesOpen(false);
      showApiSuccess(undefined, "Drilling casings saved.");
    } catch (err) {
      showApiError(err, API_ERROR_MESSAGES.UPDATE_LOG_CONFIGURATION);
    }
  };

  const casingSelectOptions = useMemo(
    () => selectableTypes.map((entry) => ({ value: entry.id, label: entry.name })),
    [selectableTypes]
  );

  const validate = (): DraftErrors => {
    const next: DraftErrors = {};
    if (!draft.casingTypeId.trim() || !selectedType) {
      next.casingTypeId = "Casing type is required.";
    }
    if (!draft.depthFrom.trim()) {
      next.depthFrom = "Depth From is required.";
    }
    if (!draft.depthTo.trim()) {
      next.depthTo = "Depth To is required.";
    }
    return next;
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!onSubmit || submitting) return;

    const nextErrors = validate();
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0 || !selectedType) return;

    const payload: LogDrillingCasingFormPayload = {
      depthFrom: draft.depthFrom.trim(),
      depthTo: draft.depthTo.trim(),
      casingTypeId: selectedType.id,
      casingTypeName: selectedType.name,
      comments: draft.comments.trim(),
    };

    setSubmitting(true);
    try {
      await onSubmit(payload);
      showApiSuccess(
        undefined,
        mode === "edit" ? "Drilling casing updated." : "Drilling casing added."
      );
      onClose();
    } catch (err) {
      showApiError(err, "Failed to save drilling casing.");
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) return null;

  const title = mode === "edit" ? "Edit Drilling Casing" : "Drilling Casing";

  return (
    <>
      <ProjectModalPortal open={open}>
        <div className="project-modal project-modal--stacked" role="presentation">
          <button
            type="button"
            className="project-modal__backdrop"
            aria-label="Close Drilling Casing dialog"
            onClick={onClose}
          />
          <div
            className="project-modal__dialog project-modal__dialog--scroll project-modal__dialog--fields edit-drilling-casing-modal"
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
                <div className="project-modal__fields project-modal__fields--stack edit-drilling-casing-modal__fields">
                  <div
                    className={[
                      "ui-field",
                      "project-modal__field--full",
                      errors.casingTypeId ? "ui-field--error" : "",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                  >
                    <div className="edit-drilling-casing-modal__type-field-head">
                      <label className="ui-field__label" htmlFor={`${formId}-casing`}>
                        Select Casing Type
                        <span className="ui-field__required"> *</span>
                      </label>
                      {canManageTypes ? (
                        <UiButton
                          type="button"
                          variant="primary"
                          size="sm"
                          className="edit-drilling-casing-modal__manage-btn"
                          onClick={() => setManageTypesOpen(true)}
                          disabled={submitting}
                        >
                          Manage
                        </UiButton>
                      ) : null}
                    </div>
                    <Select
                      id={`${formId}-casing`}
                      value={draft.casingTypeId}
                      disabled={submitting || selectableTypes.length === 0}
                      options={casingSelectOptions}
                      placeholder="Select Casing Type"
                      onChange={(value) => {
                        setDraft((current) => ({
                          ...current,
                          casingTypeId: value,
                        }));
                        setErrors((current) => ({ ...current, casingTypeId: undefined }));
                      }}
                    />
                    {errors.casingTypeId ? (
                      <p className="ui-field__error">{errors.casingTypeId}</p>
                    ) : null}
                  </div>

                  {selectableTypes.length === 0 ? (
                    <p className="edit-drilling-casing-modal__hint">
                      No drilling casings are configured for this log configuration. Use Manage to
                      add casing types.
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

      <ManageDrillingCasingsModal
        open={manageTypesOpen}
        options={manageTypeOptions}
        companyOptions={DEFAULT_DRILLING_CASING_OPTIONS}
        onClose={() => setManageTypesOpen(false)}
        onSave={(options) => {
          void handleSaveCasingTypes(options);
        }}
      />
    </>
  );
}
