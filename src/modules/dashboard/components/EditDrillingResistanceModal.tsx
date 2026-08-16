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
  LogDrillingResistance,
  LogDrillingResistanceFormPayload,
} from "../types/logDrillingResistance";
import {
  DRILLING_OBSERVATIONS_MODULE_ID,
  parseDrillingResistanceOptions,
  type DrillingResistanceOption,
} from "../utils/configModules";
import { drillingObservationsModule } from "../utils/configModules/modules/drilling-observations";
import { useUserDrillingResistances } from "../hooks/useUserDrillingResistances";
import { ManageDrillingResistanceTypesModal } from "./configModules/ManageDrillingResistanceTypesModal";

export type { LogDrillingResistanceFormPayload };

type EditDrillingResistanceModalProps = Readonly<{
  open: boolean;
  onClose: () => void;
  mode?: "add" | "edit";
  logConfigurationId: string;
  resistanceTypes: DrillingResistanceOption[];
  initialResistance?: LogDrillingResistance | null;
  onSubmit?: (payload: LogDrillingResistanceFormPayload) => void | Promise<void>;
  onResistanceTypesChange?: (options: DrillingResistanceOption[]) => void;
}>;

type DraftState = {
  resistanceTypeId: string;
  depthFrom: string;
  depthTo: string;
  comments: string;
};

type DraftErrors = {
  resistanceTypeId?: string;
  depthFrom?: string;
  depthTo?: string;
};

const DEFAULT_DRILLING_RESISTANCE_OPTIONS = parseDrillingResistanceOptions(
  drillingObservationsModule.defaultOptions?.["drilling-resistances"] ?? []
);

function createDraft(
  resistanceTypes: DrillingResistanceOption[],
  initial: LogDrillingResistance | null | undefined
): DraftState {
  if (initial) {
    return {
      resistanceTypeId: initial.resistanceTypeId,
      depthFrom: initial.depthFrom,
      depthTo: initial.depthTo,
      comments: initial.comments,
    };
  }

  const firstActive = resistanceTypes.find((entry) => entry.active !== false && entry.id.trim());
  return {
    resistanceTypeId: firstActive?.id ?? "",
    depthFrom: "",
    depthTo: "",
    comments: "",
  };
}

export function EditDrillingResistanceModal({
  open,
  onClose,
  mode = "add",
  logConfigurationId,
  resistanceTypes,
  initialResistance = null,
  onSubmit,
  onResistanceTypesChange,
}: EditDrillingResistanceModalProps) {
  const formId = useId();
  const [workingTypes, setWorkingTypes] = useState<DrillingResistanceOption[]>(resistanceTypes);
  const [draft, setDraft] = useState<DraftState>(() =>
    createDraft(resistanceTypes, initialResistance)
  );
  const [errors, setErrors] = useState<DraftErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [manageTypesOpen, setManageTypesOpen] = useState(false);

  const canManageTypes = Boolean(logConfigurationId.trim());

  const resistanceTypesApi = useUserDrillingResistances(DRILLING_OBSERVATIONS_MODULE_ID, {
    enabled: manageTypesOpen && canManageTypes,
    logConfigurationId,
  });

  const manageTypeOptions =
    manageTypesOpen && resistanceTypesApi.items.length > 0
      ? resistanceTypesApi.items
      : workingTypes;

  const activeTypes = useMemo(
    () => workingTypes.filter((entry) => entry.active !== false),
    [workingTypes]
  );

  const selectableTypes = useMemo(() => {
    if (mode !== "edit" || !initialResistance?.resistanceTypeId) return activeTypes;
    const existing = workingTypes.find((entry) => entry.id === initialResistance.resistanceTypeId);
    if (!existing || activeTypes.some((entry) => entry.id === existing.id)) {
      return activeTypes;
    }
    return [existing, ...activeTypes];
  }, [activeTypes, initialResistance, mode, workingTypes]);

  const selectedType = useMemo(
    () =>
      selectableTypes.find((entry) => entry.id === draft.resistanceTypeId) ??
      workingTypes.find((entry) => entry.id === draft.resistanceTypeId) ??
      null,
    [draft.resistanceTypeId, selectableTypes, workingTypes]
  );

  useEffect(() => {
    if (!open) return;
    setWorkingTypes(resistanceTypes);
    setDraft(createDraft(resistanceTypes, mode === "edit" ? initialResistance : null));
    setErrors({});
    setSubmitting(false);
    setManageTypesOpen(false);
    // Reseed only when the dialog opens or the edit target changes — not when
    // resistance types are refreshed after Manage, which would wipe in-progress input.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional
  }, [open, mode, initialResistance]);

  useEffect(() => {
    if (!open || workingTypes.length > 0 || resistanceTypes.length === 0) return;
    setWorkingTypes(resistanceTypes);
    setDraft(createDraft(resistanceTypes, mode === "edit" ? initialResistance : null));
  }, [open, resistanceTypes, workingTypes.length, mode, initialResistance]);

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

  const handleSaveResistanceTypes = async (options: DrillingResistanceOption[]) => {
    try {
      const saved = await resistanceTypesApi.save(options);
      setWorkingTypes(saved);
      onResistanceTypesChange?.(saved);
      setManageTypesOpen(false);
      showApiSuccess(undefined, "Drilling resistances saved.");
    } catch (err) {
      showApiError(err, API_ERROR_MESSAGES.UPDATE_LOG_CONFIGURATION);
    }
  };

  const resistanceSelectOptions = useMemo(
    () => selectableTypes.map((entry) => ({ value: entry.id, label: entry.name })),
    [selectableTypes]
  );

  const validate = (): DraftErrors => {
    const next: DraftErrors = {};
    if (!draft.resistanceTypeId.trim() || !selectedType) {
      next.resistanceTypeId = "Resistance is required.";
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

    const payload: LogDrillingResistanceFormPayload = {
      depthFrom: draft.depthFrom.trim(),
      depthTo: draft.depthTo.trim(),
      resistanceTypeId: selectedType.id,
      resistanceTypeName: selectedType.name,
      comments: draft.comments.trim(),
    };

    setSubmitting(true);
    try {
      await onSubmit(payload);
      showApiSuccess(
        undefined,
        mode === "edit" ? "Drilling resistance updated." : "Drilling resistance added."
      );
      onClose();
    } catch (err) {
      showApiError(err, "Failed to save drilling resistance.");
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) return null;

  const title = mode === "edit" ? "Edit Drilling Resistance" : "Drilling Resistance";

  return (
    <>
      <ProjectModalPortal open={open}>
        <div className="project-modal project-modal--stacked" role="presentation">
          <button
            type="button"
            className="project-modal__backdrop"
            aria-label="Close Drilling Resistance dialog"
            onClick={onClose}
          />
          <div
            className="project-modal__dialog project-modal__dialog--scroll project-modal__dialog--fields edit-drilling-resistance-modal"
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
                <div className="project-modal__fields project-modal__fields--stack edit-drilling-resistance-modal__fields">
                  <div
                    className={[
                      "ui-field",
                      "project-modal__field--full",
                      errors.resistanceTypeId ? "ui-field--error" : "",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                  >
                    <div className="edit-drilling-resistance-modal__type-field-head">
                      <label className="ui-field__label" htmlFor={`${formId}-resistance`}>
                        Select Resistance
                        <span className="ui-field__required"> *</span>
                      </label>
                      {canManageTypes ? (
                        <UiButton
                          type="button"
                          variant="primary"
                          size="sm"
                          className="edit-drilling-resistance-modal__manage-btn"
                          onClick={() => setManageTypesOpen(true)}
                          disabled={submitting}
                        >
                          Manage
                        </UiButton>
                      ) : null}
                    </div>
                    <Select
                      id={`${formId}-resistance`}
                      value={draft.resistanceTypeId}
                      disabled={submitting || selectableTypes.length === 0}
                      options={resistanceSelectOptions}
                      placeholder="Select Resistance"
                      onChange={(value) => {
                        setDraft((current) => ({
                          ...current,
                          resistanceTypeId: value,
                        }));
                        setErrors((current) => ({ ...current, resistanceTypeId: undefined }));
                      }}
                    />
                    {errors.resistanceTypeId ? (
                      <p className="ui-field__error">{errors.resistanceTypeId}</p>
                    ) : null}
                  </div>

                  {selectableTypes.length === 0 ? (
                    <p className="edit-drilling-resistance-modal__hint">
                      No drilling resistances are configured for this log configuration. Use Manage
                      to add resistance types.
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

      <ManageDrillingResistanceTypesModal
        open={manageTypesOpen}
        options={manageTypeOptions}
        companyOptions={DEFAULT_DRILLING_RESISTANCE_OPTIONS}
        onClose={() => setManageTypesOpen(false)}
        onSave={(options) => {
          void handleSaveResistanceTypes(options);
        }}
      />
    </>
  );
}
