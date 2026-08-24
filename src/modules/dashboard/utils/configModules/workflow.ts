import {
  MODULE_OPTION_NAME_MAX_LENGTH,
  WORKFLOW_FIELD_INPUT_TYPES,
  WORKFLOW_NAME_MAX_LENGTH,
  WORKFLOW_STEP_CONDITION_TYPES,
  WORKFLOW_STEPS_MAX_COUNT,
  type WorkflowSettings,
  type WorkflowFieldInputType,
  type WorkflowStep,
  type WorkflowStepCondition,
  type WorkflowStepConditionType,
  type WorkflowStepOption,
  type WorkflowStepType,
} from "./types";
import { ASTM_ENVIRO_WORKFLOW_NAME, ASTM_ENVIRO_WORKFLOW_STEPS } from "./astmEnviroWorkflowSteps";
import {
  cloneClassificationCode,
  DEFAULT_CLASSIFICATION_CODES,
  parseClassificationCodes,
} from "./classification";
import { isRecord } from "./helpers";
import {
  groupForWorkflowStep,
  resolveLogReportFieldCode,
} from "../logReportFieldCodes";
import {
  type WorkflowPreviewValues,
  getWorkflowStepKey,
  isWorkflowOptionDisabled,
  isWorkflowOptionVisible,
  isWorkflowStepDisabled,
  isWorkflowStepVisible,
} from "./workflowConditions";

function createLocalId(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

export const DEFAULT_WORKFLOW_STEPS: WorkflowStep[] = ASTM_ENVIRO_WORKFLOW_STEPS.map((step) =>
  cloneWorkflowStep(step)
);

/** Replace workflow steps with the production template from workflow-builder-resp.sql. */
export function createWorkflowFromApiTemplate(): WorkflowSettings {
  return {
    ...DEFAULT_WORKFLOW_SETTINGS,
    steps: ASTM_ENVIRO_WORKFLOW_STEPS.map((step) => cloneWorkflowStep(step)),
  };
}

export const DEFAULT_WORKFLOW_SETTINGS: WorkflowSettings = {
  enabled: true,
  name: ASTM_ENVIRO_WORKFLOW_NAME,
  ignoreParentLegacySettings: true,
  steps: DEFAULT_WORKFLOW_STEPS.map((step) => cloneWorkflowStep(step)),
  applyClassificationRules: true,
  classificationCodes: DEFAULT_CLASSIFICATION_CODES.map((code) =>
    cloneClassificationCode(code)
  ),
};

function parseInputType(value: unknown): WorkflowFieldInputType | undefined {
  if (typeof value !== "string") return undefined;
  return (WORKFLOW_FIELD_INPUT_TYPES as readonly string[]).includes(value)
    ? (value as WorkflowFieldInputType)
    : undefined;
}

function parseConditionType(value: unknown): WorkflowStepConditionType | null {
  if (typeof value !== "string") return null;
  return (WORKFLOW_STEP_CONDITION_TYPES as readonly string[]).includes(value)
    ? (value as WorkflowStepConditionType)
    : null;
}

function parseStepOption(value: unknown, index: number): WorkflowStepOption | null {
  if (!isRecord(value)) return null;
  const name = typeof value.name === "string" ? value.name.trim() : "";
  if (!name) return null;
  const rawValue = value.value;
  const optionValue =
    typeof rawValue === "string" || typeof rawValue === "number" || typeof rawValue === "boolean"
      ? String(rawValue)
      : name;
  return {
    id:
      typeof value.id === "string" && value.id.trim()
        ? value.id.trim()
        : createLocalId(`workflow-option-${index + 1}`),
    name,
    value: optionValue,
    visible: typeof value.visible === "boolean" ? value.visible : true,
    group: typeof value.group === "string" ? value.group : undefined,
    rockGroup: typeof value.rockGroup === "string" ? value.rockGroup : undefined,
    abbreviation: typeof value.abbreviation === "string" ? value.abbreviation : undefined,
    isDefault: typeof value.isDefault === "boolean" ? value.isDefault : undefined,
    conditions: Array.isArray(value.conditions)
      ? value.conditions
          .map((entry) => parseStepCondition(entry))
          .filter((entry): entry is WorkflowStepCondition => entry !== null)
      : undefined,
  };
}

function parseStepCondition(value: unknown): WorkflowStepCondition | null {
  if (!isRecord(value)) return null;
  const type = parseConditionType(value.type);
  const field = typeof value.field === "string" ? value.field.trim() : "";
  if (!type || !field) return null;

  const raw = value.value;
  let conditionValue: string | boolean | number = "";
  if (typeof raw === "string" || typeof raw === "boolean" || typeof raw === "number") {
    conditionValue = raw;
  }

  const searchTerm = typeof value.searchTerm === "string" ? value.searchTerm : undefined;
  const fieldNorm = field.toLowerCase();
  const searchNorm = searchTerm?.trim().toLowerCase() ?? "";
  const inferredOriginType = fieldNorm === "origin type" || searchNorm === "origin type";

  return {
    type,
    field,
    value: conditionValue,
    searchTerm,
    isOriginType:
      typeof value.isOriginType === "boolean"
        ? value.isOriginType
        : typeof value.is_origin_type === "boolean"
          ? value.is_origin_type
          : inferredOriginType
            ? true
            : undefined,
    isRockGroup:
      typeof value.isRockGroup === "boolean"
        ? value.isRockGroup
        : typeof value.is_rock_group === "boolean"
          ? value.is_rock_group
          : undefined,
  };
}

export function cloneWorkflowStep(step: WorkflowStep): WorkflowStep {
  return {
    ...step,
    options: step.options?.map((option) => ({
      ...option,
      conditions: option.conditions?.map((condition) => ({ ...condition })),
    })),
    conditions: step.conditions?.map((condition) => ({ ...condition })),
  };
}

function parseWorkflowStep(value: unknown, index: number): WorkflowStep | null {
  if (!isRecord(value)) return null;
  const name = typeof value.name === "string" ? value.name.trim() : "";
  if (!name || name.length > MODULE_OPTION_NAME_MAX_LENGTH) return null;
  const type: WorkflowStepType = value.type === "variation" ? "variation" : "element";
  const id =
    typeof value.id === "string" && value.id.trim()
      ? value.id.trim()
      : `workflow-step-${index + 1}`;

  const options: WorkflowStepOption[] = [];
  if (Array.isArray(value.options)) {
    for (const [optionIndex, entry] of value.options.entries()) {
      const parsed = parseStepOption(entry, optionIndex);
      if (parsed) options.push(parsed);
    }
  }

  const conditions: WorkflowStepCondition[] = [];
  if (Array.isArray(value.conditions)) {
    for (const entry of value.conditions) {
      const parsed = parseStepCondition(entry);
      if (parsed) conditions.push(parsed);
    }
  }

  const step = {
    id,
    name,
    type,
    fieldName:
      typeof value.fieldName === "string" && value.fieldName.trim()
        ? value.fieldName.trim()
        : name,
    inputType: parseInputType(value.inputType),
    databaseField:
      typeof value.databaseField === "string" ? value.databaseField : undefined,
    required: typeof value.required === "boolean" ? value.required : undefined,
    unit: typeof value.unit === "string" ? value.unit : undefined,
    optionSet:
      typeof value.optionSet === "string" || value.optionSet === null
        ? value.optionSet
        : undefined,
    options: options.length > 0 ? options : undefined,
    conditions: conditions.length > 0 ? conditions : undefined,
    multipleOptions:
      typeof value.multipleOptions === "boolean" ? value.multipleOptions : undefined,
    maxOptionsSelected:
      typeof value.maxOptionsSelected === "number" ? value.maxOptionsSelected : undefined,
    allowFreeText: typeof value.allowFreeText === "boolean" ? value.allowFreeText : undefined,
    conditionsOperator:
      value.conditionsOperator === "OR" ? "OR" : value.conditionsOperator === "AND" ? "AND" : undefined,
    instructions: typeof value.instructions === "string" ? value.instructions : undefined,
  };

  const group = groupForWorkflowStep(step);
  if (group && step.options) {
    step.options = step.options.map((option) => {
      const known = resolveLogReportFieldCode(option.name || option.value || "", group);
      if (!known || known === (option.name || "").trim()) return option;
      if ((option.abbreviation || "").trim() === known) return option;
      return { ...option, abbreviation: known };
    });
  }

  return step;
}

const LEGACY_WORKFLOW_STEP_IDS = new Set([
  "as-above-prefix",
  "soil",
  "soil-type",
  "soil-name",
  "classification-code",
  "consistency",
  "colour",
  "moisture",
  "density",
  "soil-note",
]);

const LEGACY_WORKFLOW_STEP_NAMES = new Set([
  "as above prefix",
  "soil",
  "soil type",
  "soil name",
  "classification code",
]);

/** Detect description-builder placeholder steps (no field types / options). */
export function isLegacyWorkflowSteps(steps: readonly WorkflowStep[]): boolean {
  if (steps.length === 0) return true;

  if (steps.some((step) => LEGACY_WORKFLOW_STEP_IDS.has(step.id))) return true;

  const legacyNames = steps.filter((step) =>
    LEGACY_WORKFLOW_STEP_NAMES.has(step.name.trim().toLowerCase())
  ).length;
  if (legacyNames >= 3) return true;

  const withoutInputType = steps.filter((step) => !step.inputType).length;
  if (withoutInputType === steps.length && steps.length < 20) return true;

  return false;
}

/** Replace legacy description-builder steps with the production workflow_steps template. */
export function normalizeWorkflowSettings(
  settings: WorkflowSettings
): WorkflowSettings {
  if (!isLegacyWorkflowSteps(settings.steps)) {
    return settings;
  }

  const template = createWorkflowFromApiTemplate();
  return {
    ...settings,
    enabled: settings.enabled ?? template.enabled,
    name:
      settings.name.trim() === "Default Description Workflow" || !settings.name.trim()
        ? template.name
        : settings.name,
    ignoreParentLegacySettings: settings.ignoreParentLegacySettings ?? true,
    steps: template.steps.map((step) => cloneWorkflowStep(step)),
    applyClassificationRules: settings.applyClassificationRules ?? template.applyClassificationRules,
    classificationCodes:
      settings.classificationCodes.length > 0
        ? settings.classificationCodes
        : template.classificationCodes,
  };
}

export function parseWorkflowSettings(value: unknown): WorkflowSettings {
  if (!isRecord(value)) {
    return normalizeWorkflowSettings({
      enabled: DEFAULT_WORKFLOW_SETTINGS.enabled,
      name: DEFAULT_WORKFLOW_SETTINGS.name,
      ignoreParentLegacySettings: DEFAULT_WORKFLOW_SETTINGS.ignoreParentLegacySettings,
      steps: DEFAULT_WORKFLOW_SETTINGS.steps.map((step) => cloneWorkflowStep(step)),
      applyClassificationRules: DEFAULT_WORKFLOW_SETTINGS.applyClassificationRules,
      classificationCodes: DEFAULT_WORKFLOW_SETTINGS.classificationCodes.map((code) =>
        cloneClassificationCode(code)
      ),
    });
  }

  const nameRaw = typeof value.name === "string" ? value.name.trim() : "";
  const name =
    nameRaw && nameRaw.length <= WORKFLOW_NAME_MAX_LENGTH
      ? nameRaw
      : DEFAULT_WORKFLOW_SETTINGS.name;

  const steps: WorkflowStep[] = [];
  if (Array.isArray(value.steps)) {
    for (const [index, entry] of value.steps.entries()) {
      if (steps.length >= WORKFLOW_STEPS_MAX_COUNT) break;
      const parsed = parseWorkflowStep(entry, index);
      if (!parsed) continue;
      if (steps.some((step) => step.name.toLowerCase() === parsed.name.toLowerCase())) continue;
      steps.push(parsed);
    }
  }

  return normalizeWorkflowSettings({
    enabled: typeof value.enabled === "boolean" ? value.enabled : false,
    name,
    ignoreParentLegacySettings:
      typeof value.ignoreParentLegacySettings === "boolean"
        ? value.ignoreParentLegacySettings
        : DEFAULT_WORKFLOW_SETTINGS.ignoreParentLegacySettings,
    steps:
      steps.length > 0
        ? steps
        : DEFAULT_WORKFLOW_SETTINGS.steps.map((step) => cloneWorkflowStep(step)),
    applyClassificationRules:
      typeof value.applyClassificationRules === "boolean"
        ? value.applyClassificationRules
        : DEFAULT_WORKFLOW_SETTINGS.applyClassificationRules,
    classificationCodes: parseClassificationCodes(value.classificationCodes),
  });
}

export type { WorkflowPreviewValues } from "./workflowConditions";
export {
  getWorkflowFieldCompareValues,
  getWorkflowStepKey,
  isWorkflowOptionDisabled,
  isWorkflowOptionVisible,
  isWorkflowStepDisabled,
  isWorkflowStepVisible,
} from "./workflowConditions";

export function getWorkflowStepPreviewLabel(step: WorkflowStep): string {
  const base = step.fieldName?.trim() || step.name.trim();
  if (step.inputType === "number" && step.unit) {
    return `${base} (${step.unit})`;
  }
  return base;
}
