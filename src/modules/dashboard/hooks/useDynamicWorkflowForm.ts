import { useCallback, useMemo, useState } from "react";
import type { StoredModuleSettings, WorkflowStep } from "../utils/configModules/types";
import type { WorkflowPreviewValues } from "../utils/configModules/workflowConditions";
import {
  sanitizeWorkflowPreviewValues,
  validateWorkflowPreview,
  type WorkflowPreviewValidationResult,
} from "../utils/configModules/workflowPreviewValidation";

type UseDynamicWorkflowFormOptions = {
  steps: readonly WorkflowStep[];
  subsurfaceSettings?: StoredModuleSettings;
  disabled?: boolean;
};

function readPreviewSelection(
  previewValues: WorkflowPreviewValues,
  key: string
): string[] {
  const raw = previewValues[key];
  if (Array.isArray(raw)) {
    return raw.filter(
      (entry): entry is string => typeof entry === "string" && entry.trim().length > 0
    );
  }
  if (typeof raw === "string" && raw.trim()) return [raw.trim()];
  return [];
}

/**
 * Reusable state for step-driven workflow preview forms.
 * Renders fields dynamically from workflow step definitions (options, conditions, validation).
 */
export function useDynamicWorkflowForm({
  steps,
  subsurfaceSettings,
  disabled = false,
}: UseDynamicWorkflowFormOptions) {
  const [previewValues, setPreviewValues] = useState<WorkflowPreviewValues>({});
  const [showValidation, setShowValidation] = useState(false);

  const applyPreviewValues = useCallback(
    (next: WorkflowPreviewValues) =>
      sanitizeWorkflowPreviewValues(steps, next, subsurfaceSettings),
    [steps, subsurfaceSettings]
  );

  const previewValidation = useMemo(
    (): WorkflowPreviewValidationResult =>
      validateWorkflowPreview(steps, previewValues),
    [previewValues, steps]
  );

  const setPreviewValue = useCallback(
    (key: string, value: string | string[] | boolean | null) => {
      setPreviewValues((current) => applyPreviewValues({ ...current, [key]: value }));
      setShowValidation(false);
    },
    [applyPreviewValues]
  );

  const togglePreviewOption = useCallback(
    (
      key: string,
      optionValue: string,
      allowsMultiple: boolean,
      maxSelected?: number
    ) => {
      setPreviewValues((current) => {
        const selected = readPreviewSelection(current, key);
        let patch: WorkflowPreviewValues;

        if (!allowsMultiple) {
          patch = { ...current, [key]: optionValue };
        } else {
          const isActive = selected.includes(optionValue);
          let next = isActive
            ? selected.filter((entry) => entry !== optionValue)
            : [...selected, optionValue];

          if (maxSelected && next.length > maxSelected) {
            next = next.slice(-maxSelected);
          }

          patch = { ...current, [key]: next };
        }

        return applyPreviewValues(patch);
      });
      setShowValidation(false);
    },
    [applyPreviewValues]
  );

  const resetPreview = useCallback(() => {
    setPreviewValues({});
    setShowValidation(false);
  }, []);

  const validatePreview = useCallback(() => {
    setShowValidation(true);
    return validateWorkflowPreview(steps, previewValues);
  }, [previewValues, steps]);

  return {
    previewValues,
    showValidation,
    previewValidation,
    disabled,
    setPreviewValue,
    togglePreviewOption,
    resetPreview,
    validatePreview,
    setShowValidation,
    setPreviewValues,
  };
}
