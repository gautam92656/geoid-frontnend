import { getModuleDataTypeOptions } from "./settings";
import { normalizeOriginType } from "./origin";
import type { StoredModuleSettings, WorkflowStep, WorkflowStepOption } from "./types";

export type ResolvedWorkflowOption = WorkflowStepOption & {
  /** True when the option comes from a linked module option set. */
  fromManagedSet?: boolean;
};

function optionKey(option: Pick<WorkflowStepOption, "name" | "value">): string {
  return (option.value || option.name).trim().toLowerCase();
}

function findStepOptionOverride(
  stepOptions: readonly WorkflowStepOption[],
  name: string
): WorkflowStepOption | undefined {
  const normalized = name.trim().toLowerCase();
  return stepOptions.find(
    (entry) =>
      entry.name.trim().toLowerCase() === normalized ||
      entry.value.trim().toLowerCase() === normalized
  );
}

/**
 * Merge workflow step options with a linked subsurface module option set.
 * Step-level options win for conditions, groups, abbreviations, and visibility.
 *
 * Keeps `visible: false` options that carry show conditions (default subsurface
 * Moisture Wet/Moist/Dry). Runtime filtering uses `isWorkflowOptionVisible`.
 */
export function mergeWorkflowStepOptions(
  step: WorkflowStep,
  subsurfaceSettings?: StoredModuleSettings
): ResolvedWorkflowOption[] {
  const stepOptions = step.options ?? [];

  const linkedOptionSet =
    (typeof step.optionSet === "string" && step.optionSet.trim()) ||
    (step.databaseField === "rock_texture" ||
    step.databaseField === "finish-reasons" ||
    step.databaseField === "rock_type" ||
    step.databaseField === "non_soil_type" ||
    step.databaseField === "origin" ||
    step.databaseField === "colors"
      ? step.databaseField
      : "");

  if (linkedOptionSet && subsurfaceSettings) {
    const fromModule = getModuleDataTypeOptions(subsurfaceSettings, linkedOptionSet);
    if (fromModule.length > 0) {
      const merged: ResolvedWorkflowOption[] = fromModule.map((moduleOption) => {
        const override = findStepOptionOverride(stepOptions, moduleOption.name);
        const maybeType = (moduleOption as { type?: unknown }).type;
        const rawGroup =
          typeof maybeType === "string" && maybeType.trim() ? maybeType.trim() : undefined;
        const groupFromModule =
          linkedOptionSet === "origin" && rawGroup
            ? normalizeOriginType(rawGroup)
            : rawGroup;
        if (override) {
          return {
            ...override,
            group: override.group?.trim() || groupFromModule,
            color: override.color ?? moduleOption.color ?? null,
            fromManagedSet: true,
          };
        }
        return {
          id: moduleOption.id,
          name: moduleOption.name,
          value: moduleOption.name,
          visible: true,
          group: groupFromModule,
          color: moduleOption.color ?? null,
          fromManagedSet: true,
        };
      });

      for (const option of stepOptions) {
        const exists = merged.some(
          (entry) => optionKey(entry) === optionKey(option)
        );
        if (!exists) merged.push({ ...option, fromManagedSet: false });
      }

      return merged;
    }
  }

  return stepOptions.map((option) => ({ ...option, fromManagedSet: false }));
}

export function groupWorkflowOptionsBySection(
  options: readonly Pick<ResolvedWorkflowOption, "name" | "value" | "group">[]
): Array<{ label: string; options: ResolvedWorkflowOption[] }> {
  const groups = new Map<string, ResolvedWorkflowOption[]>();

  for (const option of options) {
    const label = option.group?.trim() || "";
    const bucket = groups.get(label) ?? [];
    bucket.push(option as ResolvedWorkflowOption);
    groups.set(label, bucket);
  }

  return [...groups.entries()].map(([label, entries]) => ({ label, options: entries }));
}

const ORIGIN_GROUP_ORDER = ["Soil", "Rock", "Non-Soil", ""];

export function groupWorkflowOptionsForDisplay(
  options: readonly ResolvedWorkflowOption[],
  step: WorkflowStep
): Array<{ label: string; options: ResolvedWorkflowOption[] }> {
  const grouped = groupWorkflowOptionsBySection(options);
  if (grouped.length <= 1) {
    return grouped;
  }

  const isOrigin =
    step.optionSet === "origin" ||
    (step.fieldName?.trim().toLowerCase() ?? "") === "origin";

  if (!isOrigin) return grouped;

  return grouped.sort((a, b) => {
    const aIndex = ORIGIN_GROUP_ORDER.indexOf(a.label);
    const bIndex = ORIGIN_GROUP_ORDER.indexOf(b.label);
    return (aIndex < 0 ? 99 : aIndex) - (bIndex < 0 ? 99 : bIndex);
  });
}

export type WorkflowStepSection = {
  id: string;
  label: string;
  steps: WorkflowStep[];
};

const SECTION_RULES: Array<{
  id: string;
  label: string;
  match: (step: WorkflowStep) => boolean;
}> = [
  {
    id: "core",
    label: "Core",
    match: (step) => {
      const key = (step.fieldName ?? step.name).trim().toLowerCase();
      return ["depth", "as above", "origin"].includes(key);
    },
  },
  {
    id: "non-soil",
    label: "Non-Soil",
    match: (step) => {
      const key = (step.fieldName ?? step.name).trim().toLowerCase();
      return key.includes("non-soil") || step.databaseField === "pavement_type" || step.databaseField === "pavement_note";
    },
  },
  {
    id: "rock",
    label: "Rock",
    match: (step) => {
      const key = (step.fieldName ?? step.name).trim().toLowerCase();
      if (key.includes("rock") || step.databaseField?.startsWith("rock_")) return true;
      return ["weathering", "alteration", "strength", "texture", "fabric"].some((part) =>
        key.includes(part)
      );
    },
  },
  {
    id: "soil",
    label: "Soil",
    match: (step) => {
      const key = (step.fieldName ?? step.name).trim().toLowerCase();
      if (key.includes("soil") || step.databaseField === "soil_type") return true;
      return [
        "grading",
        "density",
        "consistency",
        "moisture",
        "identifier",
        "plasticity",
        "grain size",
        "minor",
        "organic",
      ].some((part) => key.includes(part));
    },
  },
];

export function groupWorkflowStepsIntoSections(steps: readonly WorkflowStep[]): WorkflowStepSection[] {
  const buckets = new Map<string, WorkflowStepSection>();
  const other: WorkflowStep[] = [];

  for (const step of steps) {
    const rule = SECTION_RULES.find((entry) => entry.match(step));
    if (!rule) {
      other.push(step);
      continue;
    }
    const existing = buckets.get(rule.id);
    if (existing) {
      existing.steps.push(step);
    } else {
      buckets.set(rule.id, { id: rule.id, label: rule.label, steps: [step] });
    }
  }

  const ordered = SECTION_RULES.map((rule) => buckets.get(rule.id)).filter(
    (section): section is WorkflowStepSection => Boolean(section)
  );

  if (other.length > 0) {
    ordered.push({ id: "other", label: "Other", steps: other });
  }

  return ordered;
}
