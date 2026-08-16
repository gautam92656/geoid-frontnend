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
import type { LogWellProbe, LogWellProbeFormPayload } from "../types/logWellProbe";
import {
  DEFAULT_WELL_PROBE_TYPE_OPTIONS,
  WELL_LOGS_MODULE_ID,
  parseWellProbeTypeOptions,
  type WellProbeTypeOption,
} from "../utils/configModules";
import { useUserWellProbeTypes } from "../hooks/useUserWellProbeTypes";
import { ManageWellProbeTypesModal } from "./configModules/ManageWellProbeTypesModal";

export type { LogWellProbeFormPayload };

type EditWellProbesModalProps = Readonly<{
  open: boolean;
  onClose: () => void;
  mode?: "add" | "edit";
  logConfigurationId: string;
  probeTypes: WellProbeTypeOption[];
  initialProbe?: LogWellProbe | null;
  onSubmit?: (payload: LogWellProbeFormPayload) => void | Promise<void>;
  onProbeTypesChange?: (options: WellProbeTypeOption[]) => void;
}>;

type DraftState = {
  probeTypeId: string;
  depthFrom: string;
  depthTo: string;
  comments: string;
};

type DraftErrors = {
  probeTypeId?: string;
  depthFrom?: string;
  depthTo?: string;
};

const COMPANY_PROBE_TYPE_OPTIONS =
  DEFAULT_WELL_PROBE_TYPE_OPTIONS.length > 0
    ? DEFAULT_WELL_PROBE_TYPE_OPTIONS
    : parseWellProbeTypeOptions([]);

function createDraft(
  probeTypes: WellProbeTypeOption[],
  initial: LogWellProbe | null | undefined
): DraftState {
  if (initial) {
    return {
      probeTypeId: initial.probeTypeId,
      depthFrom: initial.depthFrom,
      depthTo: initial.depthTo,
      comments: initial.comments,
    };
  }

  const firstActive = probeTypes.find((entry) => entry.active !== false && entry.id.trim());
  return {
    probeTypeId: firstActive?.id ?? "",
    depthFrom: "",
    depthTo: "",
    comments: "",
  };
}

export function EditWellProbesModal({
  open,
  onClose,
  mode = "add",
  logConfigurationId,
  probeTypes,
  initialProbe = null,
  onSubmit,
  onProbeTypesChange,
}: EditWellProbesModalProps) {
  const formId = useId();
  const [workingTypes, setWorkingTypes] = useState<WellProbeTypeOption[]>(probeTypes);
  const [draft, setDraft] = useState<DraftState>(() => createDraft(probeTypes, initialProbe));
  const [errors, setErrors] = useState<DraftErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [manageTypesOpen, setManageTypesOpen] = useState(false);

  const canManage = Boolean(logConfigurationId.trim());

  const probeTypesApi = useUserWellProbeTypes(WELL_LOGS_MODULE_ID, {
    enabled: manageTypesOpen && canManage,
    logConfigurationId,
  });

  const manageTypeOptions =
    manageTypesOpen && probeTypesApi.items.length > 0 ? probeTypesApi.items : workingTypes;

  const activeTypes = useMemo(
    () => workingTypes.filter((entry) => entry.active !== false),
    [workingTypes]
  );

  const selectableTypes = useMemo(() => {
    if (mode !== "edit" || !initialProbe?.probeTypeId) return activeTypes;
    const existing = workingTypes.find((entry) => entry.id === initialProbe.probeTypeId);
    if (!existing || activeTypes.some((entry) => entry.id === existing.id)) {
      return activeTypes;
    }
    return [existing, ...activeTypes];
  }, [activeTypes, initialProbe, mode, workingTypes]);

  const selectedType = useMemo(
    () =>
      selectableTypes.find((entry) => entry.id === draft.probeTypeId) ??
      workingTypes.find((entry) => entry.id === draft.probeTypeId) ??
      null,
    [draft.probeTypeId, selectableTypes, workingTypes]
  );

  const showDepthTo = Boolean(selectedType?.recordDepthTo);
  const allowNegativeDepth = Boolean(selectedType?.allowNegativeDepth);

  useEffect(() => {
    if (!open) return;
    setWorkingTypes(probeTypes);
    setDraft(createDraft(probeTypes, mode === "edit" ? initialProbe : null));
    setErrors({});
    setSubmitting(false);
    setManageTypesOpen(false);
    // Reseed only when the dialog opens or the edit target changes — not when
    // catalogs refresh after Manage, which would wipe in-progress input.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional
  }, [open, mode, initialProbe]);

  useEffect(() => {
    if (!open || workingTypes.length > 0 || probeTypes.length === 0) return;
    setWorkingTypes(probeTypes);
    setDraft(createDraft(probeTypes, mode === "edit" ? initialProbe : null));
  }, [open, probeTypes, workingTypes.length, mode, initialProbe]);

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

  const handleSaveProbeTypes = async (options: WellProbeTypeOption[]) => {
    try {
      const saved = await probeTypesApi.save(options);
      setWorkingTypes(saved);
      onProbeTypesChange?.(saved);
      setManageTypesOpen(false);
      showApiSuccess(undefined, "Well probe types saved.");
    } catch (err) {
      showApiError(err, API_ERROR_MESSAGES.UPDATE_LOG_CONFIGURATION);
    }
  };

  const probeTypeSelectOptions = useMemo(
    () => selectableTypes.map((entry) => ({ value: entry.id, label: entry.name })),
    [selectableTypes]
  );

  const handleProbeTypeChange = (value: string) => {
    const nextType =
      selectableTypes.find((entry) => entry.id === value) ??
      workingTypes.find((entry) => entry.id === value) ??
      null;

    setDraft((current) => ({
      ...current,
      probeTypeId: value,
      depthTo: nextType?.recordDepthTo ? current.depthTo : "",
    }));
    setErrors((current) => ({
      ...current,
      probeTypeId: undefined,
      depthFrom: undefined,
      depthTo: undefined,
    }));
  };

  const validateDepth = (
    value: string,
    label: string,
    required: boolean
  ): string | undefined => {
    const trimmed = value.trim();
    if (!trimmed) {
      return required ? `${label} is required.` : undefined;
    }
    const numeric = Number(trimmed);
    if (!Number.isFinite(numeric)) return `${label} must be a valid number.`;
    if (!allowNegativeDepth && numeric < 0) {
      return `${label} cannot be negative for this probe type.`;
    }
    return undefined;
  };

  const validate = (): DraftErrors => {
    const next: DraftErrors = {};
    if (!draft.probeTypeId.trim() || !selectedType) {
      next.probeTypeId = "Probe type is required.";
    }
    const depthFromError = validateDepth(draft.depthFrom, "Depth From", true);
    if (depthFromError) next.depthFrom = depthFromError;
    if (showDepthTo) {
      const depthToError = validateDepth(draft.depthTo, "Depth To", false);
      if (depthToError) next.depthTo = depthToError;
    }
    return next;
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!onSubmit || submitting) return;

    const nextErrors = validate();
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0 || !selectedType) return;

    const payload: LogWellProbeFormPayload = {
      wellId: mode === "edit" ? (initialProbe?.wellId ?? "") : "",
      wellIdLabel: mode === "edit" ? (initialProbe?.wellIdLabel ?? "") : "",
      probeTypeId: selectedType.id,
      probeTypeName: selectedType.name,
      depthFrom: draft.depthFrom.trim(),
      depthTo: showDepthTo ? draft.depthTo.trim() : "",
      comments: draft.comments.trim(),
    };

    setSubmitting(true);
    try {
      await onSubmit(payload);
      showApiSuccess(
        undefined,
        mode === "edit" ? "Well probe updated." : "Well probe added."
      );
      onClose();
    } catch (err) {
      showApiError(err, "Failed to save well probe.");
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) return null;

  const title = mode === "edit" ? "Edit Probe Installation Depth" : "Probe Installation Depth";

  return (
    <>
      <ProjectModalPortal open={open}>
        <div className="project-modal project-modal--stacked" role="presentation">
          <button
            type="button"
            className="project-modal__backdrop"
            aria-label="Close Probe Installation Depth dialog"
            onClick={onClose}
          />
          <div
            className="project-modal__dialog project-modal__dialog--scroll project-modal__dialog--fields edit-well-probes-modal"
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
                <div className="project-modal__fields project-modal__fields--stack edit-well-probes-modal__fields">
                  <div
                    className={[
                      "ui-field",
                      "project-modal__field--full",
                      errors.probeTypeId ? "ui-field--error" : "",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                  >
                    <div className="edit-well-probes-modal__type-field-head">
                      <label className="ui-field__label" htmlFor={`${formId}-probe-type`}>
                        Select probe type
                        <span className="ui-field__required"> *</span>
                      </label>
                      {canManage ? (
                        <UiButton
                          type="button"
                          variant="primary"
                          size="sm"
                          className="edit-well-probes-modal__manage-btn"
                          onClick={() => setManageTypesOpen(true)}
                          disabled={submitting}
                        >
                          Manage
                        </UiButton>
                      ) : null}
                    </div>
                    <Select
                      id={`${formId}-probe-type`}
                      value={draft.probeTypeId}
                      disabled={submitting || selectableTypes.length === 0}
                      options={probeTypeSelectOptions}
                      placeholder="Select probe type"
                      onChange={handleProbeTypeChange}
                    />
                    {errors.probeTypeId ? (
                      <p className="ui-field__error">{errors.probeTypeId}</p>
                    ) : null}
                  </div>

                  {selectableTypes.length === 0 ? (
                    <p className="edit-well-probes-modal__hint">
                      No probe types are configured for this log configuration. Use Manage to add
                      probe types.
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

                  {showDepthTo ? (
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

      <ManageWellProbeTypesModal
        open={manageTypesOpen}
        options={manageTypeOptions}
        companyOptions={COMPANY_PROBE_TYPE_OPTIONS}
        onClose={() => setManageTypesOpen(false)}
        onSave={(options) => {
          void handleSaveProbeTypes(options);
        }}
      />
    </>
  );
}
