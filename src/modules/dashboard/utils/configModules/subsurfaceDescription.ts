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
export function buildSubsurfacePreviewDescription(
  steps: readonly WorkflowStep[],
  values: WorkflowPreviewValues,
  subsurfaceSettings: StoredModuleSettings | undefined,
  classification: PreviewClassificationMatch
): string {
  const parts: string[] = [];

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
      if (label) parts.push(label);
    }
  }

  const className = classification.name.trim();
  if (className) parts.push(className);

  for (const step of steps) {
    if (step.inputType !== "note") continue;
    const note = values[stepKey(step)];
    if (typeof note === "string" && note.trim()) {
      parts.push(note.trim());
    }
  }

  if (parts.length === 0) return "";
  const joined = parts.join(" ").replace(/\s+/g, " ").trim();
  return joined.endsWith(".") ? joined : `${joined}.`;
}
