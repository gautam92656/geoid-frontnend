import defaultClassificationCodesJson from "../../data/defaultClassificationCodes.json";
import { isRecord } from "./helpers";
import type {
  ClassificationCode,
  ClassificationRuleCondition,
  ClassificationRuleGroup,
  ClassificationRuleLeaf,
  ClassificationRuleNode,
  WorkflowStep,
} from "./types";
import {
  getWorkflowFieldCompareValues,
  type WorkflowPreviewValues,
} from "./workflowConditions";

/** Served from Next.js `public/classification-graphics`. */
export const CLASSIFICATION_GRAPHICS_PUBLIC_BASE = "/classification-graphics";

export const CLASSIFICATION_CODES_MAX_COUNT = 500;
export const CLASSIFICATION_CODE_NAME_MAX_LENGTH = 120;
export const CLASSIFICATION_CODE_ABBREVIATION_MAX_LENGTH = 32;

export const CLASSIFICATION_RULE_CONDITIONS: readonly ClassificationRuleCondition[] = [
  "equal_one",
  "equal_all",
  "equal_null",
  "not_equal",
  "not_contains_any",
  "contains_one_or_more",
] as const;

export const CLASSIFICATION_RULE_FIELDS = [
  "Origin Type",
  "Soil Type",
  "Soil Plasticity",
  "Identifier",
  "Organic Content",
  "Grading",
] as const;

function createLocalId(prefix: string): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

/** Normalize stored graphic paths to a filename served by the backend. */
export function getClassificationGraphicFilename(graphic: string): string {
  const trimmed = graphic.trim();
  if (!trimmed) return "";

  let path = trimmed;
  try {
    if (/^https?:\/\//i.test(trimmed)) {
      path = new URL(trimmed).pathname;
    }
  } catch {
    path = trimmed;
  }

  path = path
    .replace(/^\/api\/v1\/classification-graphics\/files\//i, "")
    .replace(/^\/classification-graphics\//i, "")
    .replace(/^\/?storage\//i, "")
    .replace(/^assets\/img\/graphics\/big_soil_or_rock_type\//i, "");

  const filename = path.split("/").pop()?.split("?")[0]?.trim() ?? "";
  return filename;
}

export function createEmptyClassificationRuleGroup(): ClassificationRuleGroup {
  return {
    id: createLocalId("class-rule-group"),
    kind: "group",
    operator: "AND",
    rules: [],
  };
}

export function createBlankClassificationRuleCondition(): ClassificationRuleLeaf {
  return {
    id: createLocalId("class-rule"),
    kind: "condition",
    field: CLASSIFICATION_RULE_FIELDS[0],
    condition: "equal_one",
    value: [],
    searchTerm: CLASSIFICATION_RULE_FIELDS[0],
  };
}

function parseRuleCondition(value: unknown): ClassificationRuleCondition {
  if (
    typeof value === "string" &&
    (CLASSIFICATION_RULE_CONDITIONS as readonly string[]).includes(value)
  ) {
    return value as ClassificationRuleCondition;
  }
  return "equal_one";
}

function parseRuleNode(value: unknown, index: number): ClassificationRuleNode | null {
  if (!isRecord(value)) return null;

  if (value.kind === "condition" || (typeof value.field === "string" && !value.group)) {
    const field = typeof value.field === "string" ? value.field.trim() : "";
    if (!field) return null;
    const rawValues = Array.isArray(value.value)
      ? value.value
      : value.value == null
        ? []
        : [value.value];
    const parsedValues = rawValues
      .map((entry) => (typeof entry === "string" || typeof entry === "number" ? String(entry) : ""))
      .filter(Boolean);
    return {
      id:
        typeof value.id === "string" && value.id.trim()
          ? value.id.trim()
          : typeof value.id === "number"
            ? String(value.id)
            : createLocalId(`class-rule-${index + 1}`),
      kind: "condition",
      field,
      condition: parseRuleCondition(value.condition),
      value: parsedValues,
      searchTerm:
        typeof value.searchTerm === "string" && value.searchTerm.trim()
          ? value.searchTerm.trim()
          : field,
    };
  }

  const nested = isRecord(value.group) ? value.group : value;
  if (!isRecord(nested)) return null;
  const childSource = Array.isArray(nested.rules) ? nested.rules : [];
  const children: ClassificationRuleNode[] = [];
  for (const [childIndex, child] of childSource.entries()) {
    const parsedChild = parseRuleNode(child, childIndex);
    if (parsedChild) children.push(parsedChild);
  }

  return {
    id:
      typeof value.id === "string" && value.id.trim()
        ? value.id.trim()
        : typeof nested.id === "string" && nested.id.trim()
          ? nested.id.trim()
          : createLocalId(`class-rule-group-${index + 1}`),
    kind: "group",
    operator: nested.operator === "OR" ? "OR" : "AND",
    rules: children,
  };
}

export function parseClassificationRules(value: unknown): ClassificationRuleGroup {
  if (!isRecord(value)) return createEmptyClassificationRuleGroup();

  if (value.kind === "group") {
    const parsed = parseRuleNode(value, 0);
    if (parsed && parsed.kind === "group") return parsed;
  }

  const childSource = Array.isArray(value.rules) ? value.rules : [];
  const children: ClassificationRuleNode[] = [];
  for (const [index, child] of childSource.entries()) {
    const parsedChild = parseRuleNode(child, index);
    if (parsedChild) children.push(parsedChild);
  }

  return {
    id:
      typeof value.id === "string" && value.id.trim()
        ? value.id.trim()
        : createLocalId("class-rule-root"),
    kind: "group",
    operator: value.operator === "OR" ? "OR" : "AND",
    rules: children,
  };
}

function cloneRuleNode(node: ClassificationRuleNode): ClassificationRuleNode {
  if (node.kind === "condition") {
    return {
      ...node,
      value: [...node.value],
    };
  }
  return {
    ...node,
    rules: node.rules.map((child) => cloneRuleNode(child)),
  };
}

export function cloneClassificationRules(rules?: ClassificationRuleGroup): ClassificationRuleGroup {
  if (!rules) return createEmptyClassificationRuleGroup();
  return cloneRuleNode(rules) as ClassificationRuleGroup;
}

/** Serialize editor rules back to the TabLogs/API nested shape. */
export function serializeClassificationRules(rules?: ClassificationRuleGroup): {
  rules: unknown[];
  operator: "AND" | "OR";
} {
  const root = rules ?? createEmptyClassificationRuleGroup();

  const serializeNode = (node: ClassificationRuleNode): unknown => {
    if (node.kind === "condition") {
      return {
        field: node.field,
        value: node.condition === "equal_null" ? [] : [...node.value],
        condition: node.condition,
        searchTerm: node.searchTerm || node.field,
      };
    }

    return {
      group: {
        rules: node.rules.map((child) => serializeNode(child)),
        operator: node.operator,
      },
    };
  };

  return {
    operator: root.operator,
    rules: root.rules.map((child) => serializeNode(child)),
  };
}

export function cloneClassificationCode(code: ClassificationCode): ClassificationCode {
  const filename = getClassificationGraphicFilename(code.graphic);
  return {
    id: code.id,
    name: code.name,
    abbreviation: code.abbreviation,
    graphic: filename,
    graphicColorOverlay: code.graphicColorOverlay ?? null,
    fillOverrideColor: code.fillOverrideColor ?? null,
    applyGraphicToIds: code.applyGraphicToIds ? [...code.applyGraphicToIds] : [],
    rules: cloneClassificationRules(code.rules),
  };
}

export const DEFAULT_CLASSIFICATION_CODES: ClassificationCode[] = (
  defaultClassificationCodesJson as ClassificationCode[]
).map((code) => cloneClassificationCode(code));

export function getClassificationGraphicUrl(graphic: string): string {
  const filename = getClassificationGraphicFilename(graphic);
  if (!filename) return "";
  return `${CLASSIFICATION_GRAPHICS_PUBLIC_BASE}/${encodeURIComponent(filename)}`;
}

export function createClassificationCodeId(): string {
  return createLocalId("classification");
}

export function createBlankClassificationCode(): ClassificationCode {
  return {
    id: createClassificationCodeId(),
    name: "New Classification Code",
    abbreviation: "",
    graphic: "",
    graphicColorOverlay: null,
    fillOverrideColor: null,
    applyGraphicToIds: [],
    rules: createEmptyClassificationRuleGroup(),
  };
}

function readOptionalColor(
  value: unknown,
  camelKey: string,
  snakeKey: string
): string | null {
  if (!isRecord(value)) return null;
  const raw = value[camelKey] ?? value[snakeKey];
  return typeof raw === "string" && raw.trim() ? raw.trim() : null;
}

export function parseClassificationCode(
  value: unknown,
  index: number
): ClassificationCode | null {
  if (!isRecord(value)) return null;
  const name = typeof value.name === "string" ? value.name.trim() : "";
  if (!name) return null;
  const abbreviation =
    typeof value.abbreviation === "string" && value.abbreviation.trim()
      ? value.abbreviation.trim()
      : typeof value.code === "string" && value.code.trim()
        ? value.code.trim()
        : "";
  const graphic =
    typeof value.graphic === "string"
      ? getClassificationGraphicFilename(value.graphic)
      : "";
  const applyRaw = value.applyGraphicToIds ?? value.apply_graphic_to_ids;
  const applyGraphicToIds = Array.isArray(applyRaw)
    ? applyRaw
        .map((entry) =>
          typeof entry === "string"
            ? entry.trim()
            : typeof entry === "number"
              ? String(entry)
              : ""
        )
        .filter(Boolean)
    : [];

  const rawId = value.id;
  const id =
    typeof rawId === "string" && rawId.trim()
      ? rawId.trim()
      : typeof rawId === "number"
        ? String(rawId)
        : createLocalId(`classification-${index + 1}`);

  return {
    id,
    name: name.slice(0, CLASSIFICATION_CODE_NAME_MAX_LENGTH),
    abbreviation: abbreviation.slice(0, CLASSIFICATION_CODE_ABBREVIATION_MAX_LENGTH),
    graphic,
    graphicColorOverlay: readOptionalColor(
      value,
      "graphicColorOverlay",
      "graphic_color_overlay"
    ),
    fillOverrideColor: readOptionalColor(value, "fillOverrideColor", "fill_override_color"),
    applyGraphicToIds,
    rules: parseClassificationRules(value.rules),
  };
}

export function parseClassificationCodes(value: unknown): ClassificationCode[] {
  if (!Array.isArray(value)) {
    return DEFAULT_CLASSIFICATION_CODES.map((code) => cloneClassificationCode(code));
  }

  const codes: ClassificationCode[] = [];
  for (const [index, entry] of value.entries()) {
    if (codes.length >= CLASSIFICATION_CODES_MAX_COUNT) break;
    const parsed = parseClassificationCode(entry, index);
    if (!parsed) continue;
    codes.push(parsed);
  }

  return codes.length > 0
    ? codes
    : DEFAULT_CLASSIFICATION_CODES.map((code) => cloneClassificationCode(code));
}

function normalizeRuleValue(value: unknown): string {
  if (typeof value === "boolean") return value ? "true" : "false";
  if (value == null) return "";
  return String(value).trim().toLowerCase();
}

function valuesOverlap(left: readonly string[], right: readonly string[]): boolean {
  const rightSet = new Set(right.map(normalizeRuleValue).filter(Boolean));
  return left.some((entry) => rightSet.has(normalizeRuleValue(entry)));
}

function valuesIncludeAll(haystack: readonly string[], needles: readonly string[]): boolean {
  const haystackSet = new Set(haystack.map(normalizeRuleValue).filter(Boolean));
  const required = needles.map(normalizeRuleValue).filter(Boolean);
  if (required.length === 0) return true;
  return required.every((entry) => haystackSet.has(entry));
}

function evaluateClassificationRuleLeaf(
  leaf: ClassificationRuleLeaf,
  compareValues: readonly string[]
): boolean {
  const filledCompare = compareValues.map(normalizeRuleValue).filter(Boolean);
  const expected = leaf.value.map(normalizeRuleValue).filter(Boolean);

  switch (leaf.condition) {
    case "equal_null":
      return filledCompare.length === 0;
    case "equal_one":
    case "contains_one_or_more":
      return expected.length > 0 && valuesOverlap(filledCompare, expected);
    case "equal_all":
      return expected.length > 0 && valuesIncludeAll(filledCompare, expected);
    case "not_equal":
    case "not_contains_any":
      if (expected.length === 0) return filledCompare.length > 0;
      return !valuesOverlap(filledCompare, expected);
    default:
      return false;
  }
}

function evaluateClassificationRuleNode(
  node: ClassificationRuleNode,
  steps: readonly WorkflowStep[],
  fieldValues: WorkflowPreviewValues
): boolean {
  if (node.kind === "condition") {
    const compareValues = getWorkflowFieldCompareValues(
      steps,
      fieldValues,
      node.field,
      node.searchTerm
    );
    return evaluateClassificationRuleLeaf(node, compareValues);
  }

  if (node.rules.length === 0) return true;
  if (node.operator === "OR") {
    return node.rules.some((child) => evaluateClassificationRuleNode(child, steps, fieldValues));
  }
  return node.rules.every((child) => evaluateClassificationRuleNode(child, steps, fieldValues));
}

/** True when the classification code's rule tree matches current workflow preview values. */
export function classificationCodeMatchesPreview(
  code: ClassificationCode,
  steps: readonly WorkflowStep[],
  fieldValues: WorkflowPreviewValues
): boolean {
  const rules = code.rules ?? createEmptyClassificationRuleGroup();
  if (rules.rules.length === 0) return false;
  return evaluateClassificationRuleNode(rules, steps, fieldValues);
}

export type PreviewClassificationMatch = {
  name: string;
  abbreviation: string;
  code: ClassificationCode | null;
};

/**
 * Return the first classification code whose rules match the current preview selections.
 * When rules are disabled or nothing matches, returns empty name/abbreviation.
 */
export function matchPreviewClassification(
  codes: readonly ClassificationCode[],
  steps: readonly WorkflowStep[],
  fieldValues: WorkflowPreviewValues,
  applyRules = true
): PreviewClassificationMatch {
  if (!applyRules) {
    return { name: "", abbreviation: "", code: null };
  }

  for (const code of codes) {
    if (!classificationCodeMatchesPreview(code, steps, fieldValues)) continue;
    return {
      name: code.name,
      abbreviation: extractClassificationCode(code),
      code,
    };
  }

  return { name: "", abbreviation: "", code: null };
}

/** Prefer abbreviation, then API `code`, for preview / table display. */
export function extractClassificationCode(
  code: Pick<ClassificationCode, "abbreviation"> & { code?: string | null } | null | undefined
): string {
  if (!code) return "";
  const abbreviation = code.abbreviation?.trim() ?? "";
  if (abbreviation) return abbreviation;
  const fallback =
    typeof (code as { code?: string | null }).code === "string"
      ? (code as { code?: string | null }).code?.trim() ?? ""
      : "";
  return fallback;
}

/** Resolve the live preview code from a match (includes origin overrides). */
export function extractPreviewClassificationCode(
  match: PreviewClassificationMatch | null | undefined
): string {
  if (!match) return "";
  const fromMatch = match.abbreviation?.trim() ?? "";
  if (fromMatch) return fromMatch;
  return extractClassificationCode(match.code);
}
