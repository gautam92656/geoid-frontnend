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
  LogDrillingMethod,
  LogDrillingMethodFormPayload,
  WindowedWindowlessValue,
} from "../types/logDrillingMethod";
import {
  DRILLING_OBSERVATIONS_MODULE_ID,
  parseDrillingTypeOptions,
  type DrillingTypeOption,
} from "../utils/configModules";
import { drillingObservationsModule } from "../utils/configModules/modules/drilling-observations";
import { useUserDrillingTypes } from "../hooks/useUserDrillingTypes";
import { ManageDrillingTypesModal } from "./configModules/ManageDrillingTypesModal";

export type { LogDrillingMethodFormPayload };

type EditDrillingMethodsModalProps = Readonly<{
  open: boolean;
  onClose: () => void;
  mode?: "add" | "edit";
  logConfigurationId: string;
  drillingTypes: DrillingTypeOption[];
  initialMethod?: LogDrillingMethod | null;
  onSubmit?: (payload: LogDrillingMethodFormPayload) => void | Promise<void>;
  onDrillingTypesChange?: (options: DrillingTypeOption[]) => void;
}>;

type DraftState = {
  drillingMethodId: string;
  windowedWindowless: WindowedWindowlessValue;
  diameter: string;
  depthFrom: string;
  depthTo: string;
  recovery: string;
  waterAdded: string;
  comments: string;
};

type DraftErrors = {
  drillingMethodId?: string;
  depthFrom?: string;
  depthTo?: string;
};

const WINDOWED_WINDOWLESS_OPTIONS = [
  { value: "windowed", label: "Windowed" },
  { value: "windowless", label: "Windowless" },
] as const;

const DEFAULT_DRILLING_TYPE_OPTIONS = parseDrillingTypeOptions(
  drillingObservationsModule.defaultOptions?.["drilling-types"] ?? []
);

function logKindLabel(option: DrillingTypeOption | null): string | null {
  if (!option) return null;
  return option.logKind === "core" ? "Coring" : "Boring";
}

function createDraft(
  drillingTypes: DrillingTypeOption[],
  initial: LogDrillingMethod | null | undefined
): DraftState {
  if (initial) {
    return {
      drillingMethodId: initial.drillingMethodId,
      windowedWindowless: initial.windowedWindowless,
      diameter: initial.diameter,
      depthFrom: initial.depthFrom,
      depthTo: initial.depthTo,
      recovery: initial.recovery,
      waterAdded: initial.waterAdded,
      comments: initial.comments,
    };
  }

  const firstActive = drillingTypes.find((entry) => entry.active !== false && entry.id.trim());
  return {
    drillingMethodId: firstActive?.id ?? "",
    windowedWindowless: "",
    diameter: "",
    depthFrom: "",
    depthTo: "",
    recovery: "",
    waterAdded: "",
    comments: "",
  };
}

export function EditDrillingMethodsModal({
  open,
  onClose,
  mode = "add",
  logConfigurationId,
  drillingTypes,
  initialMethod = null,
  onSubmit,
  onDrillingTypesChange,
}: EditDrillingMethodsModalProps) {
  const formId = useId();
  const [workingTypes, setWorkingTypes] = useState<DrillingTypeOption[]>(drillingTypes);
  const [draft, setDraft] = useState<DraftState>(() => createDraft(drillingTypes, initialMethod));
  const [errors, setErrors] = useState<DraftErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [manageTypesOpen, setManageTypesOpen] = useState(false);

  const canManageTypes = Boolean(logConfigurationId.trim());

  const drillingTypesApi = useUserDrillingTypes(DRILLING_OBSERVATIONS_MODULE_ID, {
    enabled: manageTypesOpen && canManageTypes,
    logConfigurationId,
  });

  const manageTypeOptions =
    manageTypesOpen && drillingTypesApi.items.length > 0
      ? drillingTypesApi.items
      : workingTypes;

  const activeTypes = useMemo(
    () => workingTypes.filter((entry) => entry.active !== false),
    [workingTypes]
  );

  const selectableTypes = useMemo(() => {
    if (mode !== "edit" || !initialMethod?.drillingMethodId) return activeTypes;
    const existing = workingTypes.find((entry) => entry.id === initialMethod.drillingMethodId);
    if (!existing || activeTypes.some((entry) => entry.id === existing.id)) {
      return activeTypes;
    }
    return [existing, ...activeTypes];
  }, [activeTypes, initialMethod, mode, workingTypes]);

  const selectedType = useMemo(
    () =>
      selectableTypes.find((entry) => entry.id === draft.drillingMethodId) ??
      workingTypes.find((entry) => entry.id === draft.drillingMethodId) ??
      null,
    [draft.drillingMethodId, selectableTypes, workingTypes]
  );

  const showWindowedWindowless = Boolean(selectedType?.enableWindowedWindowless);
  const showRecovery = Boolean(selectedType?.enableRecoveryField);
  const showWaterAdded = Boolean(selectedType?.waterAdded);
  const methodKindLabel = logKindLabel(selectedType);

  useEffect(() => {
    if (!open) return;
    setWorkingTypes(drillingTypes);
    setDraft(createDraft(drillingTypes, mode === "edit" ? initialMethod : null));
    setErrors({});
    setSubmitting(false);
    setManageTypesOpen(false);
    // Reseed only when the dialog opens or the edit target changes — not when
    // drilling types are refreshed after Manage, which would wipe in-progress input.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional
  }, [open, mode, initialMethod]);

  useEffect(() => {
    if (!open || workingTypes.length > 0 || drillingTypes.length === 0) return;
    setWorkingTypes(drillingTypes);
    setDraft(createDraft(drillingTypes, mode === "edit" ? initialMethod : null));
  }, [open, drillingTypes, workingTypes.length, mode, initialMethod]);

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

  const handleSaveDrillingTypes = async (options: DrillingTypeOption[]) => {
    try {
      const saved = await drillingTypesApi.save(options);
      setWorkingTypes(saved);
      onDrillingTypesChange?.(saved);
      setManageTypesOpen(false);
      showApiSuccess(undefined, "Drilling types saved.");
    } catch (err) {
      showApiError(err, API_ERROR_MESSAGES.UPDATE_LOG_CONFIGURATION);
    }
  };

  const drillingMethodSelectOptions = useMemo(
    () => selectableTypes.map((entry) => ({ value: entry.id, label: entry.name })),
    [selectableTypes]
  );

  const validate = (): DraftErrors => {
    const next: DraftErrors = {};
    if (!draft.drillingMethodId.trim() || !selectedType) {
      next.drillingMethodId = "Drilling method is required.";
    }
    if (!draft.depthFrom.trim()) {
      next.depthFrom = "Depth From is required.";
    }
    if (!draft.depthTo.trim()) {
      next.depthTo = "Depth To is required.";
    }
    return next;
  };

  const handleDrillingMethodChange = (value: string) => {
    const nextType =
      selectableTypes.find((entry) => entry.id === value) ??
      workingTypes.find((entry) => entry.id === value) ??
      null;

    setDraft((current) => ({
      ...current,
      drillingMethodId: value,
      windowedWindowless: nextType?.enableWindowedWindowless
        ? current.windowedWindowless
        : "",
      recovery: nextType?.enableRecoveryField ? current.recovery : "",
      waterAdded: nextType?.waterAdded ? current.waterAdded : "",
    }));
    setErrors((current) => ({ ...current, drillingMethodId: undefined }));
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!onSubmit || submitting) return;

    const nextErrors = validate();
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0 || !selectedType) return;

    const payload: LogDrillingMethodFormPayload = {
      depthFrom: draft.depthFrom.trim(),
      depthTo: draft.depthTo.trim(),
      drillingMethodId: selectedType.id,
      drillingMethodName: selectedType.name,
      windowedWindowless: showWindowedWindowless ? draft.windowedWindowless : "",
      diameter: draft.diameter.trim(),
      recovery: showRecovery ? draft.recovery.trim() : "",
      waterAdded: showWaterAdded ? draft.waterAdded.trim() : "",
      comments: draft.comments.trim(),
    };

    setSubmitting(true);
    try {
      await onSubmit(payload);
      showApiSuccess(
        undefined,
        mode === "edit" ? "Drilling method updated." : "Drilling method added."
      );
      onClose();
    } catch (err) {
      showApiError(err, "Failed to save drilling method.");
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) return null;

  const title = mode === "edit" ? "Edit Drilling Method" : "Drilling Method";

  return (
    <>
      <ProjectModalPortal open={open}>
        <div className="project-modal project-modal--stacked" role="presentation">
          <button
            type="button"
            className="project-modal__backdrop"
            aria-label="Close Drilling Method dialog"
            onClick={onClose}
          />
          <div
            className="project-modal__dialog project-modal__dialog--scroll project-modal__dialog--fields edit-drilling-methods-modal"
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
                <div className="project-modal__fields project-modal__fields--stack edit-drilling-methods-modal__fields">
                  <div
                    className={[
                      "ui-field",
                      "project-modal__field--full",
                      errors.drillingMethodId ? "ui-field--error" : "",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                  >
                    <div className="edit-drilling-methods-modal__type-field-head">
                      <label className="ui-field__label" htmlFor={`${formId}-method`}>
                        Select Drilling Method
                        <span className="ui-field__required"> *</span>
                      </label>
                      {canManageTypes ? (
                        <UiButton
                          type="button"
                          variant="primary"
                          size="sm"
                          className="edit-drilling-methods-modal__manage-btn"
                          onClick={() => setManageTypesOpen(true)}
                          disabled={submitting}
                        >
                          Manage
                        </UiButton>
                      ) : null}
                    </div>
                    <Select
                      id={`${formId}-method`}
                      value={draft.drillingMethodId}
                      disabled={submitting || selectableTypes.length === 0}
                      options={drillingMethodSelectOptions}
                      placeholder="Select drilling method"
                      onChange={handleDrillingMethodChange}
                    />
                    {errors.drillingMethodId ? (
                      <p className="ui-field__error">{errors.drillingMethodId}</p>
                    ) : null}
                  </div>

                  {selectableTypes.length === 0 ? (
                    <p className="edit-drilling-methods-modal__hint">
                      No drilling methods are configured for this log configuration. Use Manage to
                      add drilling types.
                    </p>
                  ) : null}

                  {methodKindLabel ? (
                    <p className="edit-drilling-methods-modal__kind-label">
                      Drilling Method: {methodKindLabel}
                    </p>
                  ) : null}

                  {showWindowedWindowless ? (
                    <FormField
                      label="Windowed / Windowless"
                      htmlFor={`${formId}-windowed`}
                      className="project-modal__field--full"
                    >
                      <Select
                        id={`${formId}-windowed`}
                        value={draft.windowedWindowless}
                        disabled={submitting}
                        options={[...WINDOWED_WINDOWLESS_OPTIONS]}
                        placeholder="Select windowed / windowless"
                        onChange={(value) =>
                          setDraft((current) => ({
                            ...current,
                            windowedWindowless: value as WindowedWindowlessValue,
                          }))
                        }
                      />
                    </FormField>
                  ) : null}

                  <FormField
                    label="Diameter (mm)"
                    htmlFor={`${formId}-diameter`}
                    className="project-modal__field--full"
                  >
                    <Input
                      id={`${formId}-diameter`}
                      variant="ui"
                      type="number"
                      step="any"
                      value={draft.diameter}
                      placeholder="Diameter"
                      disabled={submitting}
                      onChange={(event) =>
                        setDraft((current) => ({
                          ...current,
                          diameter: event.target.value,
                        }))
                      }
                    />
                  </FormField>

                  <div className="edit-drilling-methods-modal__row">
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
                  </div>

                  {showRecovery ? (
                    <FormField
                      label="Recovery (m)"
                      htmlFor={`${formId}-recovery`}
                      className="project-modal__field--full"
                    >
                      <Input
                        id={`${formId}-recovery`}
                        variant="ui"
                        type="number"
                        step="any"
                        value={draft.recovery}
                        placeholder="Recovery"
                        disabled={submitting}
                        onChange={(event) =>
                          setDraft((current) => ({
                            ...current,
                            recovery: event.target.value,
                          }))
                        }
                      />
                    </FormField>
                  ) : null}

                  {showWaterAdded ? (
                    <FormField
                      label="Water Added (L)"
                      htmlFor={`${formId}-water-added`}
                      className="project-modal__field--full"
                    >
                      <Input
                        id={`${formId}-water-added`}
                        variant="ui"
                        type="number"
                        step="any"
                        value={draft.waterAdded}
                        placeholder="Water Added"
                        disabled={submitting}
                        onChange={(event) =>
                          setDraft((current) => ({
                            ...current,
                            waterAdded: event.target.value,
                          }))
                        }
                      />
                    </FormField>
                  ) : null}

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

      <ManageDrillingTypesModal
        open={manageTypesOpen}
        options={manageTypeOptions}
        companyOptions={DEFAULT_DRILLING_TYPE_OPTIONS}
        onClose={() => setManageTypesOpen(false)}
        onSave={(options) => {
          void handleSaveDrillingTypes(options);
        }}
      />
    </>
  );
}
