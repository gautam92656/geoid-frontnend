import type { StoredModuleSettings, WorkflowStep } from "./types";
import {
  type WorkflowPreviewValues,
  getWorkflowStepKey,
  isWorkflowOptionVisible,
  isWorkflowStepDisabled,
  isWorkflowStepVisible,
} from "./workflowConditions";
import { mergeWorkflowStepOptions } from "./workflowStepOptions";

export type WorkflowPreviewValidationResult = {
  valid: boolean;
  errorCount: number;
  errors: Record<string, string>;
};

function readSelection(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.filter(
      (entry): entry is string => typeof entry === "string" && entry.trim().length > 0
    );
  }
  if (typeof value === "string" && value.trim()) return [value.trim()];
  return [];
}

function isStepValueEmpty(step: WorkflowStep, value: unknown): boolean {
  const inputType = step.inputType ?? "text";

  if (inputType === "checkbox") {
    return false;
  }

  if (inputType === "options") {
    return readSelection(value).length === 0;
  }

  if (typeof value === "string") return value.trim().length === 0;
  if (Array.isArray(value)) return value.length === 0;
  if (typeof value === "boolean") return false;
  return value == null;
}

function getStepLabel(step: WorkflowStep): string {
  return step.fieldName?.trim() || step.name.trim();
}

export function validateWorkflowPreview(
  steps: readonly WorkflowStep[],
  values: WorkflowPreviewValues
): WorkflowPreviewValidationResult {
  const errors: Record<string, string> = {};

  for (const step of steps) {
    if (!isWorkflowStepVisible(step, steps, values)) continue;
    if (isWorkflowStepDisabled(step, steps, values)) continue;

    const key = getWorkflowStepKey(step);
    const label = getStepLabel(step);
    const value = values[key];

    if (step.required && isStepValueEmpty(step, value)) {
      errors[key] = `${label} is required.`;
    }

    if (step.inputType === "options" && step.multipleOptions && step.maxOptionsSelected) {
      const selected = readSelection(value);
      if (selected.length > step.maxOptionsSelected) {
        errors[key] = `Select up to ${step.maxOptionsSelected} options for ${label}.`;
      }
    }

    if (step.inputType === "number" && value != null && value !== "") {
      const raw = typeof value === "string" ? value : String(value);
      if (Number.isNaN(Number(raw))) {
        errors[key] = `${label} must be a valid number.`;
      }
    }
  }

  return {
    valid: Object.keys(errors).length === 0,
    errorCount: Object.keys(errors).length,
    errors,
  };
}

export function sanitizeWorkflowPreviewValues(
  steps: readonly WorkflowStep[],
  values: WorkflowPreviewValues,
  subsurfaceSettings?: StoredModuleSettings
): WorkflowPreviewValues {
  const enrichedSteps = steps.map((step) => {
    const merged = mergeWorkflowStepOptions(step, subsurfaceSettings);
    if (merged.length === 0) return step;
    return { ...step, options: merged };
  });
  const next: WorkflowPreviewValues = { ...values };

  for (const step of enrichedSteps) {
    const key = getWorkflowStepKey(step);

    // Only clear values for hidden steps. Disabled steps keep their values so
    // toggling As above / enable rules does not wipe Origin Type chains.
    if (!isWorkflowStepVisible(step, enrichedSteps, next)) {
      delete next[key];
      continue;
    }

    if (isWorkflowStepDisabled(step, enrichedSteps, next)) {
      continue;
    }

    if (step.inputType !== "options" || !step.options?.length) continue;

    const raw = next[key];
    const selected = readSelection(raw);
    if (selected.length === 0) continue;

    const allowed = new Set<string>();
    for (const option of step.options) {
      if (!isWorkflowOptionVisible(option, enrichedSteps, next)) continue;
      allowed.add(option.value);
      allowed.add(option.name);
    }

    const filtered = selected.filter((entry) => allowed.has(entry));
    if (filtered.length === 0) {
      delete next[key];
    } else if (step.multipleOptions) {
      next[key] = filtered;
    } else {
      next[key] = filtered[0];
    }
  }

  return next;
}

export function countVisibleWorkflowSteps(
  steps: readonly WorkflowStep[],
  values: WorkflowPreviewValues,
  subsurfaceSettings?: StoredModuleSettings
): number {
  const enrichedSteps = steps.map((step) => {
    const merged = mergeWorkflowStepOptions(step, subsurfaceSettings);
    if (merged.length === 0) return step;
    return { ...step, options: merged };
  });
  return enrichedSteps.filter((step) => isWorkflowStepVisible(step, enrichedSteps, values)).length;
}
