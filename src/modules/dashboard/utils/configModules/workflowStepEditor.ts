import {
  WORKFLOW_FIELD_INPUT_TYPES,
  WORKFLOW_STEP_CONDITION_TYPES,
  WORKFLOW_STEP_TYPES,
  type StoredModuleSettings,
  type WorkflowFieldInputType,
  type WorkflowStep,
  type WorkflowStepCondition,
  type WorkflowStepConditionType,
  type WorkflowStepType,
} from "./types";
import { MODULE_DATA_TYPES } from "./registry";
import { SUBSURFACES_MODULE_ID } from "./modules/subsurfaces";
import { findWorkflowStepByFieldRef } from "./workflowConditions";
import { mergeWorkflowStepOptions } from "./workflowStepOptions";

export const WORKFLOW_INPUT_TYPE_LABELS: Record<WorkflowFieldInputType, string> = {
  number: "Number",
  checkbox: "Checkbox",
  options: "Options",
  note: "Note",
  color: "Color",
  text: "Text",
};

export const WORKFLOW_STEP_TYPE_LABELS: Record<WorkflowStepType, string> = {
  element: "Element",
  variation: "Variation",
};

export const CONDITION_ACTION_LABELS: Record<WorkflowStepConditionType, string> = {
  enable: "Enable",
  disable: "Disable",
  show: "Show",
  hide: "Hide",
};

export const MAX_OPTIONS_SELECTED_CHOICES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] as const;

export const COMMON_DATABASE_FIELDS = [
  "trace_gravel",
  "depth",
  "asabove",
  "origin",
  "pavement_type",
  "pavement_note",
  "soil_type",
  "rock_type",
  "moisture",
  "color",
] as const;

export const WORKFLOW_INPUT_TYPE_OPTIONS = WORKFLOW_FIELD_INPUT_TYPES.map((value) => ({
  value,
  label: WORKFLOW_INPUT_TYPE_LABELS[value],
}));

export const WORKFLOW_STEP_TYPE_OPTIONS = WORKFLOW_STEP_TYPES.map((value) => ({
  value,
  label: WORKFLOW_STEP_TYPE_LABELS[value],
}));

export const CONDITION_ACTION_OPTIONS = WORKFLOW_STEP_CONDITION_TYPES.map((value) => ({
  value,
  label: CONDITION_ACTION_LABELS[value],
}));

export const YES_NO_OPTIONS = [
  { value: "yes", label: "Yes" },
  { value: "no", label: "No" },
] as const;

export const MULTIPLE_OPTIONS_CHOICES = [
  { value: "single", label: "Single option" },
  { value: "multiple", label: "Multiple options" },
] as const;

/** Synthetic When-field for comparing Origin option groups (Soil / Rock / Non-Soil). */
export const ORIGIN_TYPE_FIELD = "Origin Type";

export const ORIGIN_TYPE_VALUE_OPTIONS = [
  { value: "Soil", label: "Soil" },
  { value: "Rock", label: "Rock" },
  { value: "Non-Soil", label: "Non-Soil" },
] as const;

export const BOOLEAN_CONDITION_VALUE_OPTIONS = [
  { value: "true", label: "True" },
  { value: "false", label: "False" },
] as const;

function normalizeLabel(value: string): string {
  return value.trim().toLowerCase();
}

export function isOriginTypeWhenField(field: string, searchTerm?: string): boolean {
  const fieldNorm = normalizeLabel(field);
  const searchNorm = searchTerm ? normalizeLabel(searchTerm) : "";
  return fieldNorm === "origin type" || searchNorm === "origin type";
}

export function conditionUsesOriginType(
  condition: Pick<WorkflowStepCondition, "field" | "searchTerm" | "isOriginType">
): boolean {
  if (condition.isOriginType) return true;
  return isOriginTypeWhenField(condition.field, condition.searchTerm);
}

function hasOriginStep(steps: readonly WorkflowStep[]): boolean {
  return steps.some((step) => {
    if (step.optionSet === "origin") return true;
    const key = normalizeLabel(step.fieldName?.trim() || step.name);
    return key === "origin";
  });
}

/**
 * When-step picker options. Includes synthetic "Origin Type" when an Origin step exists,
 * because Tablogs conditions often compare Origin's group rather than the origin name.
 */
export function getWorkflowStepFieldOptions(steps: WorkflowStep[], currentStepId?: string) {
  const seen = new Set<string>();
  const options: Array<{ value: string; label: string }> = [];

  const push = (value: string, label: string) => {
    const key = normalizeLabel(value);
    if (!key || seen.has(key)) return;
    seen.add(key);
    options.push({ value, label });
  };

  if (hasOriginStep(steps)) {
    push(ORIGIN_TYPE_FIELD, ORIGIN_TYPE_FIELD);
  }

  for (const step of steps) {
    if (step.id === currentStepId) continue;
    const label = step.fieldName?.trim() || step.name.trim();
    push(label, label);
  }

  return options;
}

export function getDatabaseFieldSuggestions(steps: WorkflowStep[]) {
  const seen = new Set<string>(COMMON_DATABASE_FIELDS as readonly string[]);
  const suggestions: string[] = [...COMMON_DATABASE_FIELDS];

  for (const step of steps) {
    const field = step.databaseField?.trim();
    if (!field || seen.has(field)) continue;
    seen.add(field);
    suggestions.push(field);
  }

  return suggestions;
}

export function getManagedOptionSetChoices() {
  const dataTypes = MODULE_DATA_TYPES[SUBSURFACES_MODULE_ID] ?? [];
  return [
    { value: "", label: "No" },
    ...dataTypes.map((entry) => ({ value: entry.id, label: entry.name })),
  ];
}

export function createEmptyWorkflowStep(index: number): WorkflowStep {
  return {
    id: `workflow-step-${Date.now()}`,
    name: `Step ${index + 1}`,
    fieldName: `Step ${index + 1}`,
    type: "element",
    inputType: "text",
    required: false,
    conditions: [],
    // Multiple show rules are OR'd in Tablogs (e.g. Soil Type = Gravel OR Sand).
    conditionsOperator: "OR",
    options: [],
  };
}

export function stepShowsOptionsSection(step: WorkflowStep): boolean {
  return (step.inputType ?? "text") === "options";
}

export function createEmptyCondition(): WorkflowStepCondition {
  return {
    type: "show",
    field: "",
    value: "",
  };
}

/**
 * Build Is-value choices for the When step.
 * Origin Type → Soil/Rock/Non-Soil.
 * Checkbox → True/False.
 * Options/color → that step's option values.
 */
export function getConditionIsValueOptions(
  steps: readonly WorkflowStep[],
  condition: Pick<WorkflowStepCondition, "field" | "searchTerm" | "isOriginType">,
  subsurfaceSettings?: StoredModuleSettings
): Array<{ value: string; label: string }> {
  if (conditionUsesOriginType(condition)) {
    return ORIGIN_TYPE_VALUE_OPTIONS.map((entry) => ({ ...entry }));
  }

  const whenStep = findWorkflowStepByFieldRef(steps, condition.field, condition.searchTerm);
  if (!whenStep) return [];

  if (whenStep.inputType === "checkbox") {
    return BOOLEAN_CONDITION_VALUE_OPTIONS.map((entry) => ({ ...entry }));
  }

  if (whenStep.inputType === "options" || whenStep.inputType === "color" || whenStep.optionSet) {
    const options = mergeWorkflowStepOptions(whenStep, subsurfaceSettings);
    const seen = new Set<string>();
    const choices: Array<{ value: string; label: string }> = [];
    for (const option of options) {
      const value = option.value || option.name;
      const key = normalizeLabel(value);
      if (!key || seen.has(key)) continue;
      seen.add(key);
      choices.push({ value, label: option.name || value });
    }
    return choices;
  }

  return [];
}

/** Apply When-field change: set Origin Type flags, searchTerm, and a sensible default Is value. */
export function applyWhenFieldChange(
  condition: WorkflowStepCondition,
  field: string,
  steps: readonly WorkflowStep[]
): WorkflowStepCondition {
  const whenStep = findWorkflowStepByFieldRef(steps, field);
  const isOriginType = isOriginTypeWhenField(field);
  const next: WorkflowStepCondition = {
    ...condition,
    field,
    isOriginType: isOriginType ? true : undefined,
    searchTerm: isOriginType
      ? ORIGIN_TYPE_FIELD
      : whenStep
        ? whenStep.fieldName?.trim() || whenStep.name.trim()
        : field || undefined,
  };

  if (isOriginType) {
    next.value = typeof condition.value === "string" && condition.value ? condition.value : "Soil";
    return next;
  }

  if (whenStep?.inputType === "checkbox") {
    next.value =
      typeof condition.value === "boolean"
        ? condition.value
        : String(condition.value) === "true";
    return next;
  }

  if (condition.field !== field) {
    next.value = "";
  }

  return next;
}

/** Normalize condition value types before save (checkbox → boolean, Origin Type flag). */
export function normalizeConditionForSave(
  condition: WorkflowStepCondition,
  steps: readonly WorkflowStep[]
): WorkflowStepCondition {
  const isOriginType = conditionUsesOriginType(condition);
  const whenStep = findWorkflowStepByFieldRef(steps, condition.field, condition.searchTerm);

  let value = condition.value;
  if (whenStep?.inputType === "checkbox" || typeof value === "boolean") {
    if (typeof value === "boolean") {
      // keep
    } else if (String(value).toLowerCase() === "true") {
      value = true;
    } else if (String(value).toLowerCase() === "false") {
      value = false;
    }
  }

  return {
    ...condition,
    value,
    isOriginType: isOriginType ? true : condition.isOriginType,
    searchTerm:
      condition.searchTerm?.trim() ||
      (isOriginType
        ? ORIGIN_TYPE_FIELD
        : whenStep
          ? whenStep.fieldName?.trim() || whenStep.name.trim()
          : condition.field),
  };
}
