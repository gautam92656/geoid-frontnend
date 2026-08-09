import type {
  WorkflowSettings,
  WorkflowFieldInputType,
  WorkflowStep,
  WorkflowStepCondition,
  WorkflowStepOption,
} from "./types";
import { ASTM_ENVIRO_WORKFLOW_NAME, ASTM_ENVIRO_WORKFLOW_STEPS } from "./astmEnviroWorkflowSteps";
import { cloneWorkflowStep } from "./workflow";
import { isRecord } from "./helpers";

function parseInputType(value: unknown): WorkflowFieldInputType | undefined {
  if (typeof value !== "string") return undefined;
  const allowed: readonly WorkflowFieldInputType[] = [
    "number",
    "checkbox",
    "options",
    "note",
    "color",
    "text",
  ];
  return allowed.includes(value as WorkflowFieldInputType)
    ? (value as WorkflowFieldInputType)
    : undefined;
}

function parseApiCondition(value: unknown): WorkflowStepCondition | null {
  if (!isRecord(value)) return null;
  const type = value.type;
  const field = typeof value.field === "string" ? value.field.trim() : "";
  if (
    type !== "enable" &&
    type !== "disable" &&
    type !== "show" &&
    type !== "hide" ||
    !field
  ) {
    return null;
  }

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
      typeof value.is_origin_type === "boolean"
        ? value.is_origin_type
        : typeof value.isOriginType === "boolean"
          ? value.isOriginType
          : inferredOriginType
            ? true
            : undefined,
    isRockGroup:
      typeof value.is_rock_group === "boolean"
        ? value.is_rock_group
        : typeof value.isRockGroup === "boolean"
          ? value.isRockGroup
          : undefined,
  };
}

function parseApiOption(value: unknown, index: number): WorkflowStepOption | null {
  if (!isRecord(value)) return null;
  const name = typeof value.name === "string" ? value.name.trim() : "";
  if (!name) return null;

  const rawValue = value.value;
  const optionValue =
    typeof rawValue === "string" || typeof rawValue === "number" || typeof rawValue === "boolean"
      ? String(rawValue)
      : name;

  const option: WorkflowStepOption = {
    id:
      typeof value.id === "string" || typeof value.id === "number"
        ? String(value.id)
        : `workflow-option-${index + 1}`,
    name,
    value: optionValue,
    visible: typeof value.visible === "boolean" ? value.visible : true,
  };

  if (typeof value.type === "string" && value.type.trim()) option.group = value.type.trim();
  if (typeof value.abbreviation === "string") option.abbreviation = value.abbreviation;
  if (value.is_default === true || value.isSelected === true) option.isDefault = true;
  if (typeof value.rock_group === "string" && value.rock_group.trim()) {
    option.rockGroup = value.rock_group.trim();
  }

  if (Array.isArray(value.conditions)) {
    const conditions = value.conditions
      .map((entry) => parseApiCondition(entry))
      .filter((entry): entry is WorkflowStepCondition => entry !== null);
    if (conditions.length > 0) option.conditions = conditions;
  }

  return option;
}

function parseApiWorkflowStep(value: unknown): WorkflowStep | null {
  if (!isRecord(value)) return null;
  const stepDetail = isRecord(value.step_detail) ? value.step_detail : null;
  if (!stepDetail) return null;

  const fieldType =
    typeof value.field_type === "string" ? value.field_type.trim() : "";
  const name =
    typeof stepDetail.display_name === "string" && stepDetail.display_name.trim()
      ? stepDetail.display_name.trim()
      : typeof stepDetail.name === "string" && stepDetail.name.trim()
        ? stepDetail.name.trim()
        : fieldType;
  if (!name) return null;

  const fieldName =
    typeof stepDetail.name === "string" && stepDetail.name.trim()
      ? stepDetail.name.trim()
      : fieldType || name;

  const options: WorkflowStepOption[] = [];
  if (Array.isArray(stepDetail.default_options)) {
    for (const [index, entry] of stepDetail.default_options.entries()) {
      const parsed = parseApiOption(entry, index);
      if (parsed) options.push(parsed);
    }
  }

  const conditions: WorkflowStepCondition[] = [];
  if (Array.isArray(stepDetail.conditions)) {
    for (const entry of stepDetail.conditions) {
      const parsed = parseApiCondition(entry);
      if (parsed) conditions.push(parsed);
    }
  }

  const id =
    typeof value.id === "string" || typeof value.id === "number"
      ? String(value.id)
      : `workflow-step-${name}`;

  const step: WorkflowStep = {
    id,
    name,
    fieldName,
    type: "element",
    inputType: parseInputType(stepDetail.type),
    databaseField:
      typeof stepDetail.database_field === "string"
        ? stepDetail.database_field
        : typeof value.database_field === "string"
          ? value.database_field
          : undefined,
    required: typeof stepDetail.required === "boolean" ? stepDetail.required : undefined,
  };

  if (typeof stepDetail.unit === "string") step.unit = stepDetail.unit;
  if (typeof stepDetail.option_set === "string") step.optionSet = stepDetail.option_set;
  if (options.length > 0) step.options = options;
  if (conditions.length > 0) step.conditions = conditions;
  if (stepDetail.multiple_options === true) step.multipleOptions = true;
  if (stepDetail.max_options_selected != null) {
    const max = Number(stepDetail.max_options_selected);
    if (!Number.isNaN(max)) step.maxOptionsSelected = max;
  }

  return step;
}

/** Map a workflow API payload (`workflow_steps`) into internal workflow steps. */
export function mapApiWorkflowSteps(value: unknown): WorkflowStep[] {
  if (!Array.isArray(value)) return [];

  const entries: Array<{ order: number; step: WorkflowStep }> = [];
  for (const entry of value) {
    const parsed = parseApiWorkflowStep(entry);
    if (!parsed) continue;
    const order =
      isRecord(entry) && typeof entry.order === "number" ? entry.order : entries.length + 1;
    entries.push({ order, step: parsed });
  }

  entries.sort((a, b) => a.order - b.order);
  return entries.map((entry) => entry.step);
}

/** Map a full workflow API response body into workflow settings. */
export function mapApiWorkflowResponseToSettings(value: unknown): WorkflowSettings {
  if (!isRecord(value)) {
    return {
      enabled: true,
      name: ASTM_ENVIRO_WORKFLOW_NAME,
      ignoreParentLegacySettings: true,
      steps: ASTM_ENVIRO_WORKFLOW_STEPS.map((step) => cloneWorkflowStep(step)),
      applyClassificationRules: true,
      classificationCodes: [],
    };
  }

  const data = isRecord(value.data) ? value.data : value;
  const workflowName =
    typeof data.workflow_name === "string" && data.workflow_name.trim()
      ? data.workflow_name.trim()
      : "ASTM Enviro Workflow";

  const apiSteps = mapApiWorkflowSteps(data.workflow_steps);
  const steps =
    apiSteps.length > 0
      ? apiSteps
      : ASTM_ENVIRO_WORKFLOW_STEPS.map((step) => cloneWorkflowStep(step));

  return {
    enabled: true,
    name: workflowName,
    ignoreParentLegacySettings: true,
    steps,
    applyClassificationRules: true,
    classificationCodes: [],
  };
}
