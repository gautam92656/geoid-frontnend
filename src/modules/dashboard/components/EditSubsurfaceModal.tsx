"use client";

import { useEffect, useId, useMemo, useState } from "react";
import { ProjectModalPortal, UiButton } from "@/shared/components/ui";
import { showApiError, showApiSuccess } from "@/shared/utils/apiToast";
import { API_ERROR_MESSAGES } from "@/shared/constants/apiMessages";
import {
  countVisibleWorkflowSteps,
  extractPreviewClassificationCode,
  matchPreviewClassification,
  type OriginOption,
  type NonSoilTypeOption,
  type RockTypeOption,
  type WorkflowPreviewValues,
  type WorkflowStep,
} from "../utils/configModuleSettings";
import {
  buildSubsurfacePreviewDescription,
  resolvePreviewClassificationDisplay,
} from "../utils/configModules/subsurfaceDescription";
import { useDynamicWorkflowForm } from "../hooks/useDynamicWorkflowForm";
import {
  readNonSoilTypeOptionsFromSettings,
  readOriginOptionsFromSettings,
  readRockTypeOptionsFromSettings,
  useSubsurfaceRuntime,
} from "../hooks/useSubsurfaceRuntime";
import { WorkflowPreviewForm } from "./configModules/WorkflowPreviewForm";
import { ManageOriginTypesModal } from "./configModules/ManageOriginTypesModal";
import { ManageRockTypesModal } from "./configModules/ManageRockTypesModal";
import { ManageNonSoilTypesModal } from "./configModules/ManageNonSoilTypesModal";

export type SubsurfaceFormSubmitPayload = {
  values: WorkflowPreviewValues;
  depth: string;
  classification: string;
  origin: string;
  description: string;
  consistency: string;
  moisture: string;
  remarks: string;
  hatch: "concrete" | "fill" | "clay" | "silt" | "sand" | "empty";
};

type EditSubsurfaceModalProps = Readonly<{
  open: boolean;
  onClose: () => void;
  logConfigurationId: string;
  /** Pre-fill form values when editing an existing stratum. */
  initialValues?: WorkflowPreviewValues;
  mode?: "add" | "edit";
  onSubmit?: (payload: SubsurfaceFormSubmitPayload) => void | Promise<void>;
}>;

function readPreviewSelection(
  values: WorkflowPreviewValues,
  key: string
): string[] {
  const raw = values[key];
  if (Array.isArray(raw)) {
    return raw.filter(
      (entry): entry is string => typeof entry === "string" && entry.trim().length > 0
    );
  }
  if (typeof raw === "string" && raw.trim()) return [raw.trim()];
  return [];
}

function readStepValue(values: WorkflowPreviewValues, step: WorkflowStep | undefined): string {
  if (!step) return "";
  const key = step.fieldName?.trim() || step.name.trim();
  return readPreviewSelection(values, key).join(", ");
}

function findStepByLabels(
  steps: readonly WorkflowStep[],
  labels: readonly string[]
): WorkflowStep | undefined {
  const normalized = new Set(labels.map((label) => label.toLowerCase()));
  return steps.find((step) => {
    const key = (step.fieldName?.trim() || step.name.trim()).toLowerCase();
    return normalized.has(key);
  });
}

function isOriginWorkflowStep(step: WorkflowStep): boolean {
  const label = (step.fieldName?.trim() || step.name.trim()).toLowerCase();
  return (
    step.optionSet === "origin" ||
    step.databaseField === "origin" ||
    label === "origin"
  );
}

function isRockTypeWorkflowStep(step: WorkflowStep): boolean {
  const label = (step.fieldName?.trim() || step.name.trim()).toLowerCase();
  return (
    step.optionSet === "rock_type" ||
    step.databaseField === "rock_type" ||
    label === "rock type"
  );
}

function isNonSoilTypeWorkflowStep(step: WorkflowStep): boolean {
  const label = (step.fieldName?.trim() || step.name.trim()).toLowerCase();
  return (
    step.optionSet === "non_soil_type" ||
    step.databaseField === "non_soil_type" ||
    step.databaseField === "pavement_type" ||
    label === "non-soil type" ||
    label === "non soil type"
  );
}

function resolveHatchFromOrigin(
  origin: string
): "concrete" | "fill" | "clay" | "silt" | "sand" | "empty" {
  const normalized = origin.trim().toLowerCase();
  if (!normalized) return "empty";
  if (
    normalized.includes("non-soil") ||
    normalized.includes("non soil") ||
    normalized.includes("concrete") ||
    normalized.includes("pavement") ||
    normalized.includes("asphalt")
  ) {
    return "concrete";
  }
  if (normalized.includes("fill")) return "fill";
  if (normalized.includes("sand") || normalized.includes("dune")) return "sand";
  if (normalized.includes("silt")) return "silt";
  if (
    normalized.includes("clay") ||
    normalized.includes("natural") ||
    normalized.includes("topsoil") ||
    normalized.includes("soil")
  ) {
    return "clay";
  }
  return "empty";
}

export function EditSubsurfaceModal({
  open,
  onClose,
  logConfigurationId,
  initialValues,
  mode = "add",
  onSubmit,
}: EditSubsurfaceModalProps) {
  const formId = useId();
  const [manageOriginsOpen, setManageOriginsOpen] = useState(false);
  const [manageRockTypesOpen, setManageRockTypesOpen] = useState(false);
  const [manageNonSoilTypesOpen, setManageNonSoilTypesOpen] = useState(false);
  const [classificationPreviewOpen, setClassificationPreviewOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const {
    context,
    loading,
    error,
    saveOrigins,
    saveRockTypes,
    saveNonSoilTypes,
  } = useSubsurfaceRuntime({
    logConfigurationId,
    enabled: open && Boolean(logConfigurationId.trim()),
  });

  const workflow = context?.workflow;
  const subsurfaceSettings = context?.subsurfaceSettings;
  const steps = workflow?.steps ?? [];

  const {
    previewValues,
    showValidation,
    previewValidation,
    setPreviewValue,
    togglePreviewOption,
    resetPreview,
    validatePreview,
    setPreviewValues,
  } = useDynamicWorkflowForm({
    steps,
    subsurfaceSettings,
  });

  useEffect(() => {
    if (!open) {
      setClassificationPreviewOpen(false);
      return;
    }
    if (initialValues) {
      setPreviewValues(initialValues);
    } else {
      resetPreview();
    }
  }, [open, initialValues, resetPreview, setPreviewValues]);

  const visibleStepCount = useMemo(
    () => countVisibleWorkflowSteps(steps, previewValues, subsurfaceSettings),
    [steps, previewValues, subsurfaceSettings]
  );

  const classification = useMemo(() => {
    const matched = matchPreviewClassification(
      workflow?.classificationCodes ?? [],
      steps,
      previewValues,
      workflow?.applyClassificationRules ?? true
    );
    return resolvePreviewClassificationDisplay(
      steps,
      previewValues,
      subsurfaceSettings,
      matched
    );
  }, [workflow, steps, previewValues, subsurfaceSettings]);

  const classificationCode = useMemo(
    () => extractPreviewClassificationCode(classification),
    [classification]
  );

  const previewDescription = useMemo(
    () =>
      buildSubsurfacePreviewDescription(
        steps,
        previewValues,
        subsurfaceSettings,
        classification
      ),
    [steps, previewValues, subsurfaceSettings, classification]
  );

  const originOptions = useMemo(
    () => readOriginOptionsFromSettings(subsurfaceSettings),
    [subsurfaceSettings]
  );
  const rockTypeOptions = useMemo(
    () => readRockTypeOptionsFromSettings(subsurfaceSettings),
    [subsurfaceSettings]
  );
  const nonSoilTypeOptions = useMemo(
    () => readNonSoilTypeOptionsFromSettings(subsurfaceSettings),
    [subsurfaceSettings]
  );

  const title = mode === "edit" ? "Edit Subsurface Data" : "Add Subsurface Data";
  const submitLabel = mode === "edit" ? "Update" : "Add";
  const canSubmit = Boolean(workflow) && !loading && !submitting;

  const handleClose = () => {
    if (submitting) return;
    onClose();
  };

  const handleSubmit = async () => {
    if (!canSubmit) return;
    const validation = validatePreview();
    if (!validation.valid) return;

    const depthStep = findStepByLabels(steps, ["depth", "to depth", "from depth"]);
    const originStep = steps.find(isOriginWorkflowStep);
    const consistencyStep = findStepByLabels(steps, ["consistency", "density"]);
    const moistureStep = findStepByLabels(steps, ["moisture", "rock moisture"]);
    const originValue = readStepValue(previewValues, originStep);

    setSubmitting(true);
    try {
      await onSubmit?.({
        values: previewValues,
        depth: readStepValue(previewValues, depthStep),
        classification: classificationCode || classification.name,
        origin: originValue,
        description: previewDescription,
        consistency: readStepValue(previewValues, consistencyStep),
        moisture: readStepValue(previewValues, moistureStep),
        remarks: "",
        hatch: resolveHatchFromOrigin(originValue),
      });
      showApiSuccess(
        undefined,
        mode === "edit" ? "Subsurface layer updated." : "Subsurface layer added."
      );
      onClose();
    } catch (err) {
      showApiError(err, API_ERROR_MESSAGES.SAVE_SUBSURFACE_LAYER);
    } finally {
      setSubmitting(false);
    }
  };

  const handleSaveOrigins = async (options: OriginOption[]) => {
    try {
      await saveOrigins(options);
      setManageOriginsOpen(false);
      showApiSuccess(undefined, "Origin types saved.");
    } catch (err) {
      showApiError(err, API_ERROR_MESSAGES.UPDATE_LOG_CONFIGURATION);
    }
  };

  const handleSaveRockTypes = async (options: RockTypeOption[]) => {
    try {
      await saveRockTypes(options);
      setManageRockTypesOpen(false);
      showApiSuccess(undefined, "Rock types saved.");
    } catch (err) {
      showApiError(err, API_ERROR_MESSAGES.UPDATE_LOG_CONFIGURATION);
    }
  };

  const handleSaveNonSoilTypes = async (options: NonSoilTypeOption[]) => {
    try {
      await saveNonSoilTypes(options);
      setManageNonSoilTypesOpen(false);
      showApiSuccess(undefined, "Non-soil types saved.");
    } catch (err) {
      showApiError(err, API_ERROR_MESSAGES.UPDATE_LOG_CONFIGURATION);
    }
  };

  return (
    <>
      <ProjectModalPortal open={open}>
        <div className="project-modal" role="presentation">
          <button
            type="button"
            className="project-modal__backdrop"
            aria-label="Close subsurface dialog"
            onClick={handleClose}
          />

          <div
            className="project-modal__dialog project-modal__dialog--scroll project-modal__dialog--wide project-modal__dialog--form edit-subsurface-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby={`${formId}-title`}
          >
            <div className="project-modal__header edit-subsurface-modal__header">
              <h2 id={`${formId}-title`} className="project-modal__title">
                {title}
              </h2>
              {workflow && !loading && !error ? (
                <UiButton
                  type="button"
                  variant="outline"
                  size="sm"
                  className="edit-subsurface-modal__preview-btn"
                  onClick={() => setClassificationPreviewOpen(true)}
                  disabled={submitting}
                >
                  Preview Classification
                </UiButton>
              ) : null}
            </div>

            <div className="project-modal__body ui-scrollbar">
              {!logConfigurationId.trim() ? (
                <p className="edit-subsurface-modal__empty" role="status">
                  Select a log configuration on the Details tab before adding subsurface data.
                </p>
              ) : loading ? (
                <p className="edit-subsurface-modal__empty" role="status">
                  Loading subsurface workflow…
                </p>
              ) : error || !workflow ? (
                <p className="edit-subsurface-modal__empty" role="alert">
                  {error ?? "Subsurface workflow could not be loaded for this log configuration."}
                </p>
              ) : (
                <div className="edit-subsurface-modal__workflow">
                  {showValidation && !previewValidation.valid ? (
                    <p className="edit-subsurface-modal__validation-error" role="alert">
                      Fix {previewValidation.errorCount} required field
                      {previewValidation.errorCount === 1 ? "" : "s"} before saving.
                    </p>
                  ) : null}
                  <WorkflowPreviewForm
                    formId={formId}
                    steps={steps}
                    previewValues={previewValues}
                    subsurfaceSettings={subsurfaceSettings}
                    disabled={submitting}
                    visibleStepCount={visibleStepCount}
                    showPreviewValidation={showValidation}
                    previewValidation={previewValidation}
                    showValidationBar={false}
                    variant="entry"
                    onSetPreviewValue={setPreviewValue}
                    onTogglePreviewOption={togglePreviewOption}
                    onManageStep={(step) => {
                      if (isOriginWorkflowStep(step)) {
                        setManageOriginsOpen(true);
                        return;
                      }
                      if (isRockTypeWorkflowStep(step)) {
                        setManageRockTypesOpen(true);
                        return;
                      }
                      if (isNonSoilTypeWorkflowStep(step)) {
                        setManageNonSoilTypesOpen(true);
                      }
                    }}
                    onValidate={() => {
                      validatePreview();
                    }}
                  />
                </div>
              )}
            </div>

            <div className="project-modal__footer">
              <UiButton
                type="button"
                variant="ghost"
                onClick={handleClose}
                disabled={submitting}
              >
                Cancel
              </UiButton>
              <UiButton
                type="button"
                variant="primary"
                onClick={() => void handleSubmit()}
                disabled={!canSubmit || Boolean(error) || !workflow}
              >
                {submitting ? "Saving…" : submitLabel}
              </UiButton>
            </div>
          </div>
        </div>
      </ProjectModalPortal>

      <ProjectModalPortal open={open && classificationPreviewOpen}>
        <div className="project-modal" role="presentation">
          <button
            type="button"
            className="project-modal__backdrop"
            aria-label="Close classification preview"
            onClick={() => setClassificationPreviewOpen(false)}
          />
          <div
            className="project-modal__dialog edit-subsurface-modal__classification-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby={`${formId}-classification-title`}
          >
            <div className="project-modal__header">
              <h2
                id={`${formId}-classification-title`}
                className="project-modal__title"
              >
                Classification Preview
              </h2>
            </div>
            <div className="project-modal__body">
              <div className="edit-subsurface-modal__classification">
                <div className="edit-subsurface-modal__classification-codes">
                  <div>
                    <h5 className="edit-subsurface-modal__preview-label">
                      Preview Classification Name
                    </h5>
                    <div className="edit-subsurface-modal__preview-value">
                      {classification.name || "—"}
                    </div>
                  </div>
                  <div>
                    <h5 className="edit-subsurface-modal__preview-label">
                      Preview Classification Code
                    </h5>
                    <div className="edit-subsurface-modal__preview-value">
                      {classificationCode || "—"}
                    </div>
                  </div>
                </div>
                <div className="edit-subsurface-modal__classification-description">
                  <h5 className="edit-subsurface-modal__preview-label">
                    Preview Description
                  </h5>
                  <div className="edit-subsurface-modal__preview-value">
                    {previewDescription || "—"}
                  </div>
                </div>
              </div>
            </div>
            <div className="project-modal__footer">
              <UiButton
                type="button"
                variant="primary"
                onClick={() => setClassificationPreviewOpen(false)}
              >
                Close
              </UiButton>
            </div>
          </div>
        </div>
      </ProjectModalPortal>

      <ManageOriginTypesModal
        open={manageOriginsOpen}
        options={originOptions}
        onClose={() => setManageOriginsOpen(false)}
        onSave={(options) => {
          void handleSaveOrigins(options);
        }}
      />

      <ManageRockTypesModal
        open={manageRockTypesOpen}
        options={rockTypeOptions}
        onClose={() => setManageRockTypesOpen(false)}
        onSave={(options) => {
          void handleSaveRockTypes(options);
        }}
      />

      <ManageNonSoilTypesModal
        open={manageNonSoilTypesOpen}
        options={nonSoilTypeOptions}
        onClose={() => setManageNonSoilTypesOpen(false)}
        onSave={(options) => {
          void handleSaveNonSoilTypes(options);
        }}
      />
    </>
  );
}
