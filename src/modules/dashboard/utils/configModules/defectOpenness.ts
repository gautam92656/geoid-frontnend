import { isRecord } from "./helpers";
import type { ModuleNamedOption } from "./types";

export type DefectOpennessOption = ModuleNamedOption & {
  code?: string | null;
};

export const DEFAULT_DEFECT_OPENNESS_OPTIONS: DefectOpennessOption[] = [
  { id: "open", name: "Open", code: "OP" },
  { id: "closed", name: "Closed", code: "CL" },
  { id: "infilled", name: "Infilled", code: "IN" },
];

export function createBlankDefectOpennessOption(
  partial?: Partial<DefectOpennessOption>
): DefectOpennessOption {
  return {
    id: partial?.id ?? "",
    name: partial?.name ?? "",
    code: partial?.code ?? "",
  };
}

function asNullableString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

export function parseDefectOpennessOption(
  value: unknown,
  index: number
): DefectOpennessOption | null {
  if (!isRecord(value)) return null;
  const name = typeof value.name === "string" ? value.name.trim() : "";
  if (!name) return null;

  const id =
    typeof value.id === "string" && value.id.trim()
      ? value.id.trim()
      : typeof value.id === "number"
        ? String(value.id)
        : `defect-openness-${index + 1}`;

  return {
    id,
    name,
    code: asNullableString(value.code) ?? "",
  };
}

export function parseDefectOpennessOptions(
  value: unknown,
  fallback: readonly DefectOpennessOption[] = DEFAULT_DEFECT_OPENNESS_OPTIONS
): DefectOpennessOption[] {
  if (!Array.isArray(value)) {
    return fallback.map((entry) => ({ ...entry }));
  }

  const options: DefectOpennessOption[] = [];
  const seen = new Set<string>();

  for (const [index, entry] of value.entries()) {
    const parsed = parseDefectOpennessOption(entry, index);
    if (!parsed) continue;
    const key = parsed.name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    options.push(parsed);
  }

  return options;
}

export function cloneDefectOpennessOption(
  option: DefectOpennessOption
): DefectOpennessOption {
  return { ...option };
}

export function toDefectOpennessModuleNamedOption(
  option: DefectOpennessOption
): ModuleNamedOption {
  return {
    id: option.id,
    name: option.name,
    code: option.code ?? null,
  };
}
