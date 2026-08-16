import { isRecord } from "./helpers";
import type { ModuleNamedOption } from "./types";

export type DefectCoatingOption = ModuleNamedOption & {
  code?: string | null;
};

export const DEFAULT_DEFECT_COATING_OPTIONS: DefectCoatingOption[] = [
  { id: "clean", name: "Clean", code: "CL" },
  { id: "stained", name: "Stained", code: "ST" },
  { id: "veneer", name: "Veneer", code: "VE" },
  { id: "coating", name: "Coating", code: "CO" },
];

export function createBlankDefectCoatingOption(
  partial?: Partial<DefectCoatingOption>
): DefectCoatingOption {
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

export function parseDefectCoatingOption(
  value: unknown,
  index: number
): DefectCoatingOption | null {
  if (!isRecord(value)) return null;
  const name = typeof value.name === "string" ? value.name.trim() : "";
  if (!name) return null;

  const id =
    typeof value.id === "string" && value.id.trim()
      ? value.id.trim()
      : typeof value.id === "number"
        ? String(value.id)
        : `defect-coating-${index + 1}`;

  return {
    id,
    name,
    code: asNullableString(value.code) ?? "",
  };
}

export function parseDefectCoatingOptions(
  value: unknown,
  fallback: readonly DefectCoatingOption[] = DEFAULT_DEFECT_COATING_OPTIONS
): DefectCoatingOption[] {
  if (!Array.isArray(value)) {
    return fallback.map((entry) => ({ ...entry }));
  }

  const options: DefectCoatingOption[] = [];
  const seen = new Set<string>();

  for (const [index, entry] of value.entries()) {
    const parsed = parseDefectCoatingOption(entry, index);
    if (!parsed) continue;
    const key = parsed.name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    options.push(parsed);
  }

  return options;
}

export function cloneDefectCoatingOption(option: DefectCoatingOption): DefectCoatingOption {
  return { ...option };
}

export function toDefectCoatingModuleNamedOption(
  option: DefectCoatingOption
): ModuleNamedOption {
  return {
    id: option.id,
    name: option.name,
    code: option.code ?? null,
  };
}