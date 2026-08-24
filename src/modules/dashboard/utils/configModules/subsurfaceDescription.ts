import { getModuleDataTypeOptions } from "./settings";
import type { ModuleNamedOption, StoredModuleSettings, WorkflowStep } from "./types";
import type { WorkflowPreviewValues } from "./workflowConditions";
import {
  extractPreviewClassificationCode,
  type PreviewClassificationMatch,
} from "./classification";

function stepKey(step: WorkflowStep): string {
  return step.fieldName?.trim() || step.name.trim();
}

function readSelection(values: WorkflowPreviewValues, key: string): string[] {
  const raw = values[key];
  if (Array.isArray(raw)) {
    return raw.filter(
      (entry): entry is string => typeof entry === "string" && entry.trim().length > 0
    );
  }
  if (typeof raw === "string" && raw.trim()) return [raw.trim()];
  return [];
}

function isOriginStep(step: WorkflowStep): boolean {
  const label = stepKey(step).toLowerCase();
  return (
    step.optionSet === "origin" ||
    step.databaseField === "origin" ||
    label === "origin"
  );
}

function findNamedOption(
  options: readonly ModuleNamedOption[],
  selected: string
): ModuleNamedOption | undefined {
  const normalized = selected.trim().toLowerCase();
  return options.find(
    (entry) =>
      entry.name.trim().toLowerCase() === normalized ||
      entry.id.trim().toLowerCase() === normalized
  );
}

/**
 * Resolve origin-driven classification abbreviation override when enabled on the
 * selected origin option (`classificationCodeOverride` + `codeInDescription`).
 */
export function resolvePreviewClassificationDisplay(
  steps: readonly WorkflowStep[],
  values: WorkflowPreviewValues,
  subsurfaceSettings: StoredModuleSettings | undefined,
  matched: PreviewClassificationMatch
): PreviewClassificationMatch {
  const baseCode = extractPreviewClassificationCode(matched);
  const withExtractedCode: PreviewClassificationMatch = {
    ...matched,
    abbreviation: baseCode,
  };

  const originStep = steps.find(isOriginStep);
  if (!originStep || !subsurfaceSettings) return withExtractedCode;

  const selected = readSelection(values, stepKey(originStep))[0];
  if (!selected) return withExtractedCode;

  const origins = getModuleDataTypeOptions(subsurfaceSettings, "origin");
  const origin = findNamedOption(origins, selected);
  if (!origin?.classificationCodeOverride) return withExtractedCode;

  const overrideCode =
    origin.codeInDescription?.trim() ||
    origin.code?.trim() ||
    origin.abbreviation?.trim() ||
    "";
  if (!overrideCode) return withExtractedCode;

  return {
    ...withExtractedCode,
    abbreviation: overrideCode,
  };
}

/**
 * Build a short preview description from the selected origin's
 * `nameInDescription`, matched classification name, and visible note fields.
 * Example: "Concrete Slab MULCH."
 */
function normalizeDescriptionPart(value: string): string {
  const trimmed = value.replace(/\s+/g, " ").trim();
  return trimmed.replace(/^[\s,;:.]+|[\s,;:.]+$/g, "");
}

function appendDescriptionPart(parts: string[], seen: Set<string>, value: string): void {
  const normalized = normalizeDescriptionPart(value);
  if (!normalized) return;
  const signature = normalized.toLowerCase();
  if (seen.has(signature)) return;
  seen.add(signature);
  parts.push(normalized);
}

function collectStepValues(step: WorkflowStep, values: WorkflowPreviewValues): string[] {
  const raw = values[stepKey(step)];
  if (Array.isArray(raw)) {
    return raw
      .map((entry) => (typeof entry === "string" ? entry.trim() : ""))
      .filter((entry) => entry.length > 0);
  }
  if (typeof raw === "string" && raw.trim()) return [raw.trim()];
  if (typeof raw === "boolean") return raw ? ["True"] : [];
  return [];
}

function shouldSkipNarrativeStep(step: WorkflowStep): boolean {
  const key = stepKey(step).toLowerCase();
  return (
    key === "depth" ||
    key === "as above" ||
    key === "origin" ||
    key === "classification" ||
    key === "classification code"
  );
}

export function buildSubsurfacePreviewDescription(
  steps: readonly WorkflowStep[],
  values: WorkflowPreviewValues,
  subsurfaceSettings: StoredModuleSettings | undefined,
  classification: PreviewClassificationMatch
): string {
  const parts: string[] = [];
  const seen = new Set<string>();

  const originStep = steps.find(isOriginStep);
  if (originStep && subsurfaceSettings) {
    const selected = readSelection(values, stepKey(originStep))[0];
    if (selected) {
      const origins = getModuleDataTypeOptions(subsurfaceSettings, "origin");
      const origin = findNamedOption(origins, selected);
      const label =
        origin?.nameInDescription?.trim() ||
        origin?.name?.trim() ||
        selected.trim();
      if (label) appendDescriptionPart(parts, seen, label);
    }
  }

  const className = classification.name.trim();
  if (className) appendDescriptionPart(parts, seen, className);

  for (const step of steps) {
    if (shouldSkipNarrativeStep(step)) continue;

    const stepValues = collectStepValues(step, values);
    if (stepValues.length === 0) continue;

    const rendered = stepValues
      .map((value) => normalizeDescriptionPart(value))
      .filter(Boolean)
      .join(", ");

    if (rendered) appendDescriptionPart(parts, seen, rendered);
  }

  if (parts.length === 0) return "";
  const joined = parts.join(", ").replace(/\s+/g, " ").trim();
  return joined.endsWith(".") ? joined : `${joined}.`;
}
