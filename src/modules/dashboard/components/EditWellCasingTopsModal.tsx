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
  LogWellCasingTop,
  LogWellCasingTopFormPayload,
} from "../types/logWellCasingTop";
import {
  DEFAULT_WELL_CASING_TOP_TYPE_OPTIONS,
  WELL_LOGS_MODULE_ID,
  type WellCasingTopTypeOption,
} from "../utils/configModules";
import { useUserWellCasingTops } from "../hooks/useUserWellCasingTops";
import { ManageWellCasingTopTypesModal } from "./configModules/ManageWellCasingTopTypesModal";

export type { LogWellCasingTopFormPayload };

type EditWellCasingTopsModalProps = Readonly<{
  open: boolean;
  onClose: () => void;
  mode?: "add" | "edit";
  logConfigurationId: string;
  casingTypes: WellCasingTopTypeOption[];
  initialCasingTop?: LogWellCasingTop | null;
  onSubmit?: (payload: LogWellCasingTopFormPayload) => void | Promise<void>;
  onCasingTypesChange?: (options: WellCasingTopTypeOption[]) => void;
}>;

type DraftState = {
  casingTypeId: string;
  elevation: string;
  depthFrom: string;
  depthTo: string;
  notes: string;
};

type DraftErrors = {
  casingTypeId?: string;
  elevation?: string;
  depthFrom?: string;
  depthTo?: string;
};

function createDraft(
  casingTypes: WellCasingTopTypeOption[],
  initial: LogWellCasingTop | null | undefined
): DraftState {
  if (initial) {
    return {
      casingTypeId: initial.casingTypeId,
      elevation: initial.elevation,
      depthFrom: initial.depthFrom,
      depthTo: initial.depthTo,
      notes: initial.notes,
    };
  }

  const firstType = casingTypes.find((entry) => entry.active !== false && entry.id.trim());
  return {
    casingTypeId: firstType?.id ?? "",
    elevation: "",
    depthFrom: "",
    depthTo: "",
    notes: "",
  };
}

export function EditWellCasingTopsModal({
  open,
  onClose,
  mode = "add",
  logConfigurationId,
  casingTypes,
  initialCasingTop = null,
  onSubmit,
  onCasingTypesChange,
}: EditWellCasingTopsModalProps) {
  const formId = useId();
  const [workingTypes, setWorkingTypes] = useState<WellCasingTopTypeOption[]>(casingTypes);
  const [draft, setDraft] = useState<DraftState>(() => createDraft(casingTypes, initialCasingTop));
  const [errors, setErrors] = useState<DraftErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [manageTypesOpen, setManageTypesOpen] = useState(false);

  const canManageTypes = Boolean(logConfigurationId.trim());

  const casingTypesApi = useUserWellCasingTops(WELL_LOGS_MODULE_ID, {
    enabled: manageTypesOpen && canManageTypes,
    logConfigurationId,
  });

  const manageTypeOptions =
    manageTypesOpen && casingTypesApi.items.length > 0
      ? casingTypesApi.items
      : workingTypes;

  const activeTypes = useMemo(
    () => workingTypes.filter((entry) => entry.active !== false),
    [workingTypes]
  );

  const selectableTypes = useMemo(() => {
    if (mode !== "edit" || !initialCasingTop?.casingTypeId) return activeTypes;
    const existing = workingTypes.find((entry) => entry.id === initialCasingTop.casingTypeId);
    if (!existing || activeTypes.some((entry) => entry.id === existing.id)) {
      return activeTypes;
    }
    return [existing, ...activeTypes];
  }, [activeTypes, initialCasingTop, mode, workingTypes]);

  const selectedType = useMemo(
    () =>
      selectableTypes.find((entry) => entry.id === draft.casingTypeId) ??
      workingTypes.find((entry) => entry.id === draft.casingTypeId) ??
      null,
    [draft.casingTypeId, selectableTypes, workingTypes]
  );

  const allowNegativeDepth = Boolean(selectedType?.allowNegativeDepth);

  useEffect(() => {
    if (!open) return;
    setWorkingTypes(casingTypes);
    setDraft(createDraft(casingTypes, mode === "edit" ? initialCasingTop : null));
    setErrors({});
    setSubmitting(false);
    setManageTypesOpen(false);
    // Reseed only when the dialog opens or the edit target changes — not when
    // casing types are refreshed after Manage, which would wipe in-progress input.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional
  }, [open, mode, initialCasingTop]);

  useEffect(() => {
    if (!open || workingTypes.length > 0 || casingTypes.length === 0) return;
    setWorkingTypes(casingTypes);
    setDraft(createDraft(casingTypes, mode === "edit" ? initialCasingTop : null));
  }, [open, casingTypes, workingTypes.length, mode, initialCasingTop]);

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

  const handleSaveCasingTypes = async (options: WellCasingTopTypeOption[]) => {
    try {
      const saved = await casingTypesApi.save(options);
      setWorkingTypes(saved);
      onCasingTypesChange?.(saved);
      setManageTypesOpen(false);
      showApiSuccess(undefined, "Well casing top types saved.");
    } catch (err) {
      showApiError(err, API_ERROR_MESSAGES.UPDATE_LOG_CONFIGURATION);
    }
  };

  const casingTypeSelectOptions = useMemo(
    () => selectableTypes.map((entry) => ({ value: entry.id, label: entry.name })),
    [selectableTypes]
  );

  const validateNumeric = (value: string, label: string): string | undefined => {
    const trimmed = value.trim();
    if (!trimmed) return undefined;
    const numeric = Number(trimmed);
    if (!Number.isFinite(numeric)) return `${label} must be a valid number.`;
    if (!allowNegativeDepth && numeric < 0) {
      return `${label} cannot be negative for this casing type.`;
    }
    return undefined;
  };

  const validate = (): DraftErrors => {
    const next: DraftErrors = {};
    if (!draft.casingTypeId.trim() || !selectedType) {
      next.casingTypeId = "Casing type is required.";
    }
    const elevationError = validateNumeric(draft.elevation, "Elevation");
    if (elevationError) next.elevation = elevationError;
    const depthFromError = validateNumeric(draft.depthFrom, "Depth From");
    if (depthFromError) next.depthFrom = depthFromError;
    const depthToError = validateNumeric(draft.depthTo, "Depth To");
    if (depthToError) next.depthTo = depthToError;
    return next;
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!onSubmit || submitting) return;

    const nextErrors = validate();
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0 || !selectedType) return;

    const payload: LogWellCasingTopFormPayload = {
      casingTypeId: selectedType.id,
      casingTypeName: selectedType.name,
      elevation: draft.elevation.trim(),
      depthFrom: draft.depthFrom.trim(),
      depthTo: draft.depthTo.trim(),
      notes: draft.notes.trim(),
    };

    setSubmitting(true);
    try {
      await onSubmit(payload);
      showApiSuccess(
        undefined,
        mode === "edit" ? "Well casing top updated." : "Well casing top added."
      );
      onClose();
    } catch (err) {
      showApiError(err, "Failed to save well casing top.");
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) return null;

  const title = mode === "edit" ? "Edit Casing Installation Depth" : "Casing Installation Depth";

  return (
    <>
      <ProjectModalPortal open={open}>
        <div className="project-modal project-modal--stacked" role="presentation">
          <button
            type="button"
            className="project-modal__backdrop"
            aria-label="Close Casing Installation Depth dialog"
            onClick={onClose}
          />
          <div
            className="project-modal__dialog project-modal__dialog--scroll project-modal__dialog--fields edit-well-casings-modal"
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
                <div className="project-modal__fields project-modal__fields--stack edit-well-casings-modal__fields">
                  <div
                    className={[
                      "ui-field",
                      "project-modal__field--full",
                      errors.casingTypeId ? "ui-field--error" : "",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                  >
                    <div className="edit-well-casings-modal__type-field-head">
                      <label className="ui-field__label" htmlFor={`${formId}-casing-type`}>
                        Select casing type
                        <span className="ui-field__required"> *</span>
                      </label>
                      {canManageTypes ? (
                        <UiButton
                          type="button"
                          variant="primary"
                          size="sm"
                          className="edit-well-casings-modal__manage-btn"
                          onClick={() => setManageTypesOpen(true)}
                          disabled={submitting}
                        >
                          Manage
                        </UiButton>
                      ) : null}
                    </div>
                    <Select
                      id={`${formId}-casing-type`}
                      value={draft.casingTypeId}
                      disabled={submitting || selectableTypes.length === 0}
                      options={casingTypeSelectOptions}
                      placeholder="Select casing type"
                      onChange={(value) => {
                        setDraft((current) => ({
                          ...current,
                          casingTypeId: value,
                        }));
                        setErrors((current) => ({
                          ...current,
                          casingTypeId: undefined,
                          elevation: undefined,
                          depthFrom: undefined,
                          depthTo: undefined,
                        }));
                      }}
                    />
                    {errors.casingTypeId ? (
                      <p className="ui-field__error">{errors.casingTypeId}</p>
                    ) : null}
                  </div>

                  {selectableTypes.length === 0 ? (
                    <p className="edit-well-casings-modal__hint">
                      No well casing top types are configured for this log configuration. Use Manage
                      to add casing types.
                    </p>
                  ) : null}

                  <FormField
                    label="Elevation (m)"
                    error={errors.elevation}
                    htmlFor={`${formId}-elevation`}
                    className="project-modal__field--full"
                  >
                    <Input
                      id={`${formId}-elevation`}
                      variant="ui"
                      type="number"
                      step="any"
                      min={allowNegativeDepth ? undefined : 0}
                      value={draft.elevation}
                      placeholder="Elevation"
                      disabled={submitting}
                      onChange={(event) => {
                        setDraft((current) => ({
                          ...current,
                          elevation: event.target.value,
                        }));
                        setErrors((current) => ({ ...current, elevation: undefined }));
                      }}
                    />
                  </FormField>

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

                  <FormField
                    label="Notes"
                    htmlFor={`${formId}-notes`}
                    className="project-modal__field--full"
                  >
                    <textarea
                      id={`${formId}-notes`}
                      className="ui-textarea"
                      rows={3}
                      value={draft.notes}
                      placeholder="Notes"
                      disabled={submitting}
                      onChange={(event) =>
                        setDraft((current) => ({
                          ...current,
                          notes: event.target.value,
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

      <ManageWellCasingTopTypesModal
        open={manageTypesOpen}
        options={manageTypeOptions}
        companyOptions={DEFAULT_WELL_CASING_TOP_TYPE_OPTIONS}
        onClose={() => setManageTypesOpen(false)}
        onSave={(options) => {
          void handleSaveCasingTypes(options);
        }}
      />
    </>
  );
}
