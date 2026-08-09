import type {
  WorkflowStep,
  WorkflowStepCondition,
  WorkflowStepOption,
} from "./types";

export type WorkflowPreviewValues = Record<
  string,
  string | boolean | string[] | null | undefined
>;

const ORIGIN_TYPE_ALIASES: Record<string, readonly string[]> = {
  soil: ["soil"],
  rock: ["rock"],
  pavement: ["pavement", "non-soil"],
  "non-soil": ["non-soil", "pavement"],
};

function normalizeCompareValue(value: unknown): string {
  if (typeof value === "boolean") return value ? "true" : "false";
  if (value == null) return "";
  return String(value).trim().toLowerCase();
}

function matchesOriginTypeAlias(compareValue: string, expected: string): boolean {
  const expectedNorm = normalizeCompareValue(expected);
  const compareNorm = normalizeCompareValue(compareValue);
  if (compareNorm === expectedNorm) return true;

  const expectedAliases = ORIGIN_TYPE_ALIASES[expectedNorm] ?? [expectedNorm];
  const compareAliases = ORIGIN_TYPE_ALIASES[compareNorm] ?? [compareNorm];
  return expectedAliases.some((alias) => compareAliases.includes(alias));
}

export function getWorkflowStepKey(step: WorkflowStep): string {
  return step.fieldName?.trim() || step.name.trim();
}

function stepLabels(step: WorkflowStep): string[] {
  return [step.fieldName, step.name]
    .filter((label): label is string => Boolean(label?.trim()))
    .map((label) => label.trim().toLowerCase());
}

/** Resolve a condition When-field / searchTerm to a workflow step. */
export function findWorkflowStepByFieldRef(
  steps: readonly WorkflowStep[],
  field: string,
  searchTerm?: string
): WorkflowStep | undefined {
  const refs = [field, searchTerm]
    .filter((entry): entry is string => Boolean(entry?.trim()))
    .map((entry) => entry.trim().toLowerCase());

  return steps.find((step) => {
    const labels = stepLabels(step);
    return refs.some((ref) => labels.includes(ref));
  });
}

function findOriginStep(steps: readonly WorkflowStep[]): WorkflowStep | undefined {
  return steps.find(
    (step) => step.optionSet === "origin" || getWorkflowStepKey(step).toLowerCase() === "origin"
  );
}

function findRockTypeStep(steps: readonly WorkflowStep[]): WorkflowStep | undefined {
  return steps.find(
    (step) =>
      step.databaseField === "rock_type" ||
      getWorkflowStepKey(step).toLowerCase() === "rock type"
  );
}

function readSelectedValue(
  fieldValues: WorkflowPreviewValues,
  key: string
): string | undefined {
  const raw = fieldValues[key];
  if (typeof raw === "string" && raw.trim()) return raw.trim();
  if (Array.isArray(raw) && raw.length > 0) {
    const first = raw[0];
    return typeof first === "string" && first.trim() ? first.trim() : undefined;
  }
  return undefined;
}

function findOptionByValue(
  options: readonly WorkflowStepOption[],
  selected: string
): WorkflowStepOption | undefined {
  const selectedNorm = normalizeCompareValue(selected);
  return options.find(
    (option) =>
      normalizeCompareValue(option.value) === selectedNorm ||
      normalizeCompareValue(option.name) === selectedNorm
  );
}

function getSelectedOriginOption(
  steps: readonly WorkflowStep[],
  fieldValues: WorkflowPreviewValues
): WorkflowStepOption | undefined {
  const originStep = findOriginStep(steps);
  if (!originStep?.options) return undefined;
  const selected = readSelectedValue(fieldValues, getWorkflowStepKey(originStep));
  if (!selected) return undefined;
  return findOptionByValue(originStep.options, selected);
}

function expandOriginTypeValues(group: string): string[] {
  const normalized = normalizeCompareValue(group);
  const values = new Set<string>([normalized]);
  for (const [key, aliases] of Object.entries(ORIGIN_TYPE_ALIASES)) {
    if (key === normalized || aliases.includes(normalized)) {
      values.add(key);
      for (const alias of aliases) values.add(alias);
    }
  }
  return [...values];
}

function getOriginTypeValues(
  steps: readonly WorkflowStep[],
  fieldValues: WorkflowPreviewValues
): string[] {
  const option = getSelectedOriginOption(steps, fieldValues);
  if (option?.group) return expandOriginTypeValues(option.group);

  // Fallback when option metadata has no group but the stored value is itself a type label.
  const originStep = findOriginStep(steps);
  if (!originStep) return [];
  const selected = readSelectedValue(fieldValues, getWorkflowStepKey(originStep));
  if (!selected) return [];
  const normalized = normalizeCompareValue(selected);
  if (
    normalized === "soil" ||
    normalized === "rock" ||
    normalized === "pavement" ||
    normalized === "non-soil"
  ) {
    return expandOriginTypeValues(selected);
  }
  return [];
}

function getRockGroupValues(
  steps: readonly WorkflowStep[],
  fieldValues: WorkflowPreviewValues
): string[] {
  const rockStep = findRockTypeStep(steps);
  if (!rockStep?.options) return [];
  const selected = readSelectedValue(fieldValues, getWorkflowStepKey(rockStep));
  if (!selected) return [];

  const option = findOptionByValue(rockStep.options, selected);
  if (!option) return [normalizeCompareValue(selected)];

  const values = new Set<string>();
  values.add(normalizeCompareValue(option.value));
  values.add(normalizeCompareValue(option.name));
  if (option.rockGroup) values.add(normalizeCompareValue(option.rockGroup));
  if (option.group) values.add(normalizeCompareValue(option.group));
  return [...values];
}

function isOriginTypeFieldRef(field: string, searchTerm?: string, isOriginType?: boolean): boolean {
  if (isOriginType) return true;
  const fieldNorm = normalizeCompareValue(field);
  const searchNorm = searchTerm ? normalizeCompareValue(searchTerm) : "";
  return fieldNorm === "origin type" || searchNorm === "origin type";
}

function getDirectFieldValues(
  steps: readonly WorkflowStep[],
  fieldValues: WorkflowPreviewValues,
  field: string,
  searchTerm?: string
): string[] {
  const step = findWorkflowStepByFieldRef(steps, field, searchTerm);
  const keys = new Set<string>();
  keys.add(field.trim());
  if (searchTerm?.trim()) keys.add(searchTerm.trim());
  if (step) keys.add(getWorkflowStepKey(step));

  const values: string[] = [];
  for (const key of keys) {
    const raw = fieldValues[key];
    if (Array.isArray(raw)) {
      for (const entry of raw) values.push(normalizeCompareValue(entry));
      continue;
    }
    if (raw !== undefined && raw !== null && raw !== "") {
      values.push(normalizeCompareValue(raw));
    }
  }
  return values;
}

function resolveFieldCompareValues(
  steps: readonly WorkflowStep[],
  fieldValues: WorkflowPreviewValues,
  condition: WorkflowStepCondition
): string[] {
  const { field, searchTerm, isOriginType, isRockGroup } = condition;

  if (isOriginTypeFieldRef(field, searchTerm, isOriginType)) {
    return getOriginTypeValues(steps, fieldValues);
  }

  if (isRockGroup) {
    return getRockGroupValues(steps, fieldValues);
  }

  const values = getDirectFieldValues(steps, fieldValues, field, searchTerm);
  const fieldNorm = normalizeCompareValue(field);
  if (fieldNorm === "origin" || fieldNorm === "origin type") {
    for (const entry of getOriginTypeValues(steps, fieldValues)) values.push(entry);
  }
  return values;
}

/** Resolve current preview values for a classification / condition field label. */
export function getWorkflowFieldCompareValues(
  steps: readonly WorkflowStep[],
  fieldValues: WorkflowPreviewValues,
  field: string,
  searchTerm?: string
): string[] {
  return resolveFieldCompareValues(steps, fieldValues, {
    type: "show",
    field,
    value: "",
    searchTerm,
    isOriginType: isOriginTypeFieldRef(field, searchTerm) || undefined,
  });
}

function valuesMatchCondition(
  compareValues: string[],
  expected: string | boolean | number
): boolean {
  const expectedNorm = normalizeCompareValue(expected);
  if (!expectedNorm && compareValues.length === 0) return true;

  for (const value of compareValues) {
    if (value === expectedNorm) return true;
    if (matchesOriginTypeAlias(value, expectedNorm)) return true;
  }

  if (typeof expected === "boolean") {
    const boolNorm = expected ? "true" : "false";
    return compareValues.includes(boolNorm);
  }

  return false;
}

function conditionMatches(
  condition: WorkflowStepCondition,
  steps: readonly WorkflowStep[],
  fieldValues: WorkflowPreviewValues
): boolean {
  const compareValues = resolveFieldCompareValues(steps, fieldValues, condition);
  return valuesMatchCondition(compareValues, condition.value);
}

function partitionConditions(conditions: readonly WorkflowStepCondition[]) {
  return {
    show: conditions.filter((condition) => condition.type === "show"),
    hide: conditions.filter((condition) => condition.type === "hide"),
    enable: conditions.filter((condition) => condition.type === "enable"),
    disable: conditions.filter((condition) => condition.type === "disable"),
  };
}

/**
 * Combine same-action conditions.
 * Default is OR (Tablogs: multiple `show` rules mean show when any match).
 * Explicit `conditionsOperator: "AND"` requires every rule in the group to match.
 */
function evaluateConditionGroup(
  conditions: readonly WorkflowStepCondition[],
  operator: "AND" | "OR" | undefined,
  steps: readonly WorkflowStep[],
  fieldValues: WorkflowPreviewValues
): boolean {
  if (conditions.length === 0) return true;
  if (operator === "AND") {
    return conditions.every((condition) => conditionMatches(condition, steps, fieldValues));
  }
  return conditions.some((condition) => conditionMatches(condition, steps, fieldValues));
}

/**
 * Visibility uses only `show` / `hide`.
 * `enable` / `disable` affect disabled state only — never visibility.
 * Mixing enable into show broke steps like Non-Soil Type (enable As above=false
 * would keep the step visible even when Origin was not Non-Soil).
 */
export function isWorkflowStepVisible(
  step: WorkflowStep,
  steps: readonly WorkflowStep[],
  fieldValues: WorkflowPreviewValues
): boolean {
  const conditions = step.conditions ?? [];
  if (conditions.length === 0) return true;

  const { show, hide } = partitionConditions(conditions);

  for (const condition of hide) {
    if (conditionMatches(condition, steps, fieldValues)) return false;
  }

  if (show.length === 0) return true;

  return evaluateConditionGroup(show, step.conditionsOperator, steps, fieldValues);
}

export function isWorkflowStepDisabled(
  step: WorkflowStep,
  steps: readonly WorkflowStep[],
  fieldValues: WorkflowPreviewValues
): boolean {
  const conditions = step.conditions ?? [];
  if (conditions.length === 0) return false;

  const { enable, disable } = partitionConditions(conditions);

  for (const condition of disable) {
    if (conditionMatches(condition, steps, fieldValues)) return true;
  }

  if (enable.length === 0) return false;

  return !evaluateConditionGroup(enable, step.conditionsOperator, steps, fieldValues);
}

/**
 * Option visibility for the default subsurface workflow:
 * - `visible: false` + show conditions = hidden until a show condition matches
 *   (e.g. Moisture Wet/Moist/Dry for Soil Type Gravel|Sand)
 * - `visible: true` + show conditions = same conditional show rules
 * - no show conditions = respect the static `visible` flag
 */
export function isWorkflowOptionVisible(
  option: WorkflowStepOption,
  steps: readonly WorkflowStep[],
  fieldValues: WorkflowPreviewValues
): boolean {
  const conditions = option.conditions ?? [];
  const { show, hide } = partitionConditions(conditions);

  for (const condition of hide) {
    if (conditionMatches(condition, steps, fieldValues)) return false;
  }

  if (show.length > 0) {
    return show.some((condition) => conditionMatches(condition, steps, fieldValues));
  }

  return option.visible !== false;
}

export function isWorkflowOptionDisabled(
  option: WorkflowStepOption,
  steps: readonly WorkflowStep[],
  fieldValues: WorkflowPreviewValues
): boolean {
  const conditions = option.conditions ?? [];
  if (conditions.length === 0) return false;

  const { enable, disable } = partitionConditions(conditions);

  for (const condition of disable) {
    if (conditionMatches(condition, steps, fieldValues)) return true;
  }

  if (enable.length === 0) return false;

  return !enable.some((condition) => conditionMatches(condition, steps, fieldValues));
}
