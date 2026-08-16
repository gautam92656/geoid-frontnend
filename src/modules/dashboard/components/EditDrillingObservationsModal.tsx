"use client";

import { useEffect, useId, useMemo, useState, type FormEvent } from "react";
import {
  DatePicker,
  FormField,
  Input,
  Select,
  TimePicker,
  UiButton,
  ProjectModalPortal,
} from "@/shared/components/ui";
import { showApiError, showApiSuccess } from "@/shared/utils/apiToast";
import { API_ERROR_MESSAGES } from "@/shared/constants/apiMessages";
import type { LogDrillingObservation } from "../types/logDrillingObservation";
import {
  DEFAULT_DRILLING_OBSERVATION_OPTIONS,
  DRILLING_OBSERVATIONS_MODULE_ID,
  type DrillingObservationOption,
} from "../utils/configModules";
import { useUserDrillingObservations } from "../hooks/useUserDrillingObservations";
import { ManageDrillingObservationsModal } from "./configModules/ManageDrillingObservationsModal";

export type LogDrillingObservationFormSubmitPayload = {
  depth: string;
  depthOfCasing: string;
  depthToWater: string;
  observationTypeId: string;
  observationTypeName: string;
  observationDate: string;
  observationTime: string;
  comments: string;
};

type EditDrillingObservationsModalProps = Readonly<{
  open: boolean;
  onClose: () => void;
  mode?: "add" | "edit";
  logConfigurationId: string;
  observationTypes: DrillingObservationOption[];
  initialObservation?: LogDrillingObservation | null;
  onSubmit?: (payload: LogDrillingObservationFormSubmitPayload) => void | Promise<void>;
  onObservationTypesChange?: (options: DrillingObservationOption[]) => void;
}>;

type DraftState = {
  observationTypeId: string;
  depth: string;
  depthOfCasing: string;
  depthToWater: string;
  observationDate: string;
  observationTime: string;
  comments: string;
};

type DraftErrors = {
  observationTypeId?: string;
  depth?: string;
  observationDate?: string;
  observationTime?: string;
};

function createDraft(
  observationTypes: DrillingObservationOption[],
  initial: LogDrillingObservation | null | undefined
): DraftState {
  if (initial) {
    return {
      observationTypeId: initial.observationTypeId,
      depth: initial.depth,
      depthOfCasing: initial.depthOfCasing,
      depthToWater: initial.depthToWater,
      observationDate: initial.observationDate,
      observationTime: initial.observationTime,
      comments: initial.comments,
    };
  }

  const firstActive = observationTypes.find(
    (entry) => entry.active !== false && entry.id.trim()
  );
  return {
    observationTypeId: firstActive?.id ?? "",
    depth: "",
    depthOfCasing: "",
    depthToWater: "",
    observationDate: "",
    observationTime: "",
    comments: "",
  };
}

export function EditDrillingObservationsModal({
  open,
  onClose,
  mode = "add",
  logConfigurationId,
  observationTypes,
  initialObservation = null,
  onSubmit,
  onObservationTypesChange,
}: EditDrillingObservationsModalProps) {
  const formId = useId();
  const [workingTypes, setWorkingTypes] =
    useState<DrillingObservationOption[]>(observationTypes);
  const [draft, setDraft] = useState<DraftState>(() =>
    createDraft(observationTypes, initialObservation)
  );
  const [errors, setErrors] = useState<DraftErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [manageTypesOpen, setManageTypesOpen] = useState(false);

  const canManageTypes = Boolean(logConfigurationId.trim());

  const observationTypesApi = useUserDrillingObservations(DRILLING_OBSERVATIONS_MODULE_ID, {
    enabled: manageTypesOpen && canManageTypes,
    logConfigurationId,
  });

  const manageTypeOptions =
    manageTypesOpen && observationTypesApi.items.length > 0
      ? observationTypesApi.items
      : workingTypes;

  const activeTypes = useMemo(
    () => workingTypes.filter((entry) => entry.active !== false),
    [workingTypes]
  );

  const selectableTypes = useMemo(() => {
    if (mode !== "edit" || !initialObservation?.observationTypeId) return activeTypes;
    const existing = workingTypes.find(
      (entry) => entry.id === initialObservation.observationTypeId
    );
    if (!existing || activeTypes.some((entry) => entry.id === existing.id)) {
      return activeTypes;
    }
    return [existing, ...activeTypes];
  }, [activeTypes, initialObservation, mode, workingTypes]);

  const selectedType = useMemo(
    () =>
      selectableTypes.find((entry) => entry.id === draft.observationTypeId) ??
      workingTypes.find((entry) => entry.id === draft.observationTypeId) ??
      null,
    [draft.observationTypeId, selectableTypes, workingTypes]
  );

  const depthRequired = Boolean(selectedType?.depthRequired);
  const dateTimeRequired = Boolean(selectedType?.observationDateTimeRequired);
  const showDepthOfCasing = Boolean(selectedType?.isDepthOfCasing);
  const showDepthToWater = Boolean(selectedType?.isDepthToWater);

  useEffect(() => {
    if (!open) return;
    setWorkingTypes(observationTypes);
    setDraft(createDraft(observationTypes, mode === "edit" ? initialObservation : null));
    setErrors({});
    setSubmitting(false);
    setManageTypesOpen(false);
    // Reseed only when the dialog opens or the edit target changes — not when
    // observation types are refreshed after Manage, which would wipe in-progress input.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional
  }, [open, mode, initialObservation]);

  useEffect(() => {
    if (!open || workingTypes.length > 0 || observationTypes.length === 0) return;
    setWorkingTypes(observationTypes);
    setDraft(createDraft(observationTypes, mode === "edit" ? initialObservation : null));
  }, [open, observationTypes, workingTypes.length, mode, initialObservation]);

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

  const handleSaveObservationTypes = async (options: DrillingObservationOption[]) => {
    try {
      const saved = await observationTypesApi.save(options);
      setWorkingTypes(saved);
      onObservationTypesChange?.(saved);
      setManageTypesOpen(false);
      showApiSuccess(undefined, "Drilling observation types saved.");
    } catch (err) {
      showApiError(err, API_ERROR_MESSAGES.UPDATE_LOG_CONFIGURATION);
    }
  };

  const observationTypeSelectOptions = useMemo(
    () => selectableTypes.map((entry) => ({ value: entry.id, label: entry.name })),
    [selectableTypes]
  );

  const validate = (): DraftErrors => {
    const next: DraftErrors = {};
    if (!draft.observationTypeId.trim() || !selectedType) {
      next.observationTypeId = "Observation type is required.";
    }
    if (depthRequired && !draft.depth.trim()) {
      next.depth = "Depth is required.";
    }
    if (dateTimeRequired && !draft.observationDate.trim()) {
      next.observationDate = "Observation date is required.";
    }
    if (dateTimeRequired && !draft.observationTime.trim()) {
      next.observationTime = "Observation time is required.";
    }
    return next;
  };

  const handleObservationTypeChange = (value: string) => {
    const nextType =
      selectableTypes.find((entry) => entry.id === value) ??
      workingTypes.find((entry) => entry.id === value) ??
      null;

    setDraft((current) => ({
      ...current,
      observationTypeId: value,
      depthOfCasing: nextType?.isDepthOfCasing ? current.depthOfCasing : "",
      depthToWater: nextType?.isDepthToWater ? current.depthToWater : "",
    }));
    setErrors((current) => ({
      ...current,
      observationTypeId: undefined,
      depth: undefined,
      observationDate: undefined,
      observationTime: undefined,
    }));
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!onSubmit || submitting) return;

    const nextErrors = validate();
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0 || !selectedType) return;

    const payload: LogDrillingObservationFormSubmitPayload = {
      depth: draft.depth.trim(),
      depthOfCasing: showDepthOfCasing ? draft.depthOfCasing.trim() : "",
      depthToWater: showDepthToWater ? draft.depthToWater.trim() : "",
      observationTypeId: selectedType.id,
      observationTypeName: selectedType.name,
      observationDate: draft.observationDate.trim(),
      observationTime: draft.observationTime.trim(),
      comments: draft.comments.trim(),
    };

    setSubmitting(true);
    try {
      await onSubmit(payload);
      showApiSuccess(
        undefined,
        mode === "edit" ? "Drilling observation updated." : "Drilling observation added."
      );
      onClose();
    } catch (err) {
      showApiError(err, API_ERROR_MESSAGES.SAVE_LOG_DRILLING_OBSERVATION);
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) return null;

  const title =
    mode === "edit" ? "Edit Drilling Observation" : "Select Observation Type";

  return (
    <>
      <ProjectModalPortal open={open}>
        <div className="project-modal project-modal--stacked" role="presentation">
          <button
            type="button"
            className="project-modal__backdrop"
            aria-label="Close Drilling Observation dialog"
            onClick={onClose}
          />
          <div
            className="project-modal__dialog project-modal__dialog--scroll project-modal__dialog--fields edit-drilling-observations-modal"
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
                <div className="project-modal__fields project-modal__fields--stack edit-drilling-observations-modal__fields">
                  <div
                    className={[
                      "ui-field",
                      "project-modal__field--full",
                      errors.observationTypeId ? "ui-field--error" : "",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                  >
                    <div className="edit-drilling-observations-modal__type-field-head">
                      <label className="ui-field__label" htmlFor={`${formId}-type`}>
                        Select Observation Type
                        <span className="ui-field__required"> *</span>
                      </label>
                      {canManageTypes ? (
                        <UiButton
                          type="button"
                          variant="primary"
                          size="sm"
                          className="edit-drilling-observations-modal__manage-btn"
                          onClick={() => setManageTypesOpen(true)}
                          disabled={submitting}
                        >
                          Manage
                        </UiButton>
                      ) : null}
                    </div>
                    <Select
                      id={`${formId}-type`}
                      value={draft.observationTypeId}
                      disabled={submitting || selectableTypes.length === 0}
                      options={observationTypeSelectOptions}
                      placeholder="Select observation type"
                      onChange={handleObservationTypeChange}
                    />
                    {errors.observationTypeId ? (
                      <p className="ui-field__error">{errors.observationTypeId}</p>
                    ) : null}
                  </div>

                  {selectableTypes.length === 0 ? (
                    <p className="edit-drilling-observations-modal__hint">
                      No observation types are configured for this log configuration. Use Manage to
                      add observation types.
                    </p>
                  ) : null}

                  <FormField
                    label="Depth (m)"
                    required={depthRequired}
                    error={errors.depth}
                    htmlFor={`${formId}-depth`}
                    className="project-modal__field--full"
                  >
                    <Input
                      id={`${formId}-depth`}
                      variant="ui"
                      type="number"
                      step="any"
                      value={draft.depth}
                      placeholder="Depth"
                      disabled={submitting}
                      onChange={(event) => {
                        setDraft((current) => ({ ...current, depth: event.target.value }));
                        setErrors((current) => ({ ...current, depth: undefined }));
                      }}
                    />
                  </FormField>

                  {showDepthOfCasing ? (
                    <FormField
                      label="Depth of Casing"
                      htmlFor={`${formId}-depth-casing`}
                      className="project-modal__field--full"
                    >
                      <Input
                        id={`${formId}-depth-casing`}
                        variant="ui"
                        type="number"
                        step="any"
                        value={draft.depthOfCasing}
                        placeholder="Enter Depth of Casing"
                        disabled={submitting}
                        onChange={(event) =>
                          setDraft((current) => ({
                            ...current,
                            depthOfCasing: event.target.value,
                          }))
                        }
                      />
                    </FormField>
                  ) : null}

                  {showDepthToWater ? (
                    <FormField
                      label="Depth to Water"
                      htmlFor={`${formId}-depth-water`}
                      className="project-modal__field--full"
                    >
                      <Input
                        id={`${formId}-depth-water`}
                        variant="ui"
                        type="number"
                        step="any"
                        value={draft.depthToWater}
                        placeholder="Enter Depth to Water"
                        disabled={submitting}
                        onChange={(event) =>
                          setDraft((current) => ({
                            ...current,
                            depthToWater: event.target.value,
                          }))
                        }
                      />
                    </FormField>
                  ) : null}

                  <FormField
                    label="Observation Date"
                    required={dateTimeRequired}
                    error={errors.observationDate}
                    htmlFor={`${formId}-date`}
                    className="project-modal__field--full"
                  >
                    <DatePicker
                      id={`${formId}-date`}
                      value={draft.observationDate}
                      placeholder="Select date"
                      disabled={submitting}
                      onChange={(value) => {
                        setDraft((current) => ({ ...current, observationDate: value }));
                        setErrors((current) => ({ ...current, observationDate: undefined }));
                      }}
                    />
                  </FormField>

                  <FormField
                    label="Observation Time"
                    required={dateTimeRequired}
                    error={errors.observationTime}
                    htmlFor={`${formId}-time`}
                    className="project-modal__field--full"
                  >
                    <TimePicker
                      id={`${formId}-time`}
                      value={draft.observationTime}
                      placeholder="Observation Time"
                      disabled={submitting}
                      onChange={(value) => {
                        setDraft((current) => ({ ...current, observationTime: value }));
                        setErrors((current) => ({ ...current, observationTime: undefined }));
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

      <ManageDrillingObservationsModal
        open={manageTypesOpen}
        options={manageTypeOptions}
        companyOptions={DEFAULT_DRILLING_OBSERVATION_OPTIONS}
        onClose={() => setManageTypesOpen(false)}
        onSave={(options) => {
          void handleSaveObservationTypes(options);
        }}
      />
    </>
  );
}
