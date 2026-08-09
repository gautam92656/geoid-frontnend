import { isRecord } from "./helpers";
import type { ModuleNamedOption } from "./types";

export type InfillMaterialOption = ModuleNamedOption & {
  code?: string | null;
};

export const DEFAULT_INFILL_MATERIAL_OPTIONS: InfillMaterialOption[] = [
  {
    id: "none",
    name: "None",
    code: "",
  },
];

export function createBlankInfillMaterialOption(
  partial?: Partial<InfillMaterialOption>
): InfillMaterialOption {
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

export function parseInfillMaterialOption(
  value: unknown,
  index: number
): InfillMaterialOption | null {
  if (!isRecord(value)) return null;
  const name = typeof value.name === "string" ? value.name.trim() : "";
  if (!name) return null;

  const id =
    typeof value.id === "string" && value.id.trim()
      ? value.id.trim()
      : typeof value.id === "number"
        ? String(value.id)
        : `infill-material-${index + 1}`;

  return {
    id,
    name,
    code: asNullableString(value.code) ?? "",
  };
}

export function parseInfillMaterialOptions(
  value: unknown,
  fallback: readonly InfillMaterialOption[] = DEFAULT_INFILL_MATERIAL_OPTIONS
): InfillMaterialOption[] {
  if (!Array.isArray(value)) {
    return fallback.map((entry) => ({ ...entry }));
  }

  const options: InfillMaterialOption[] = [];
  const seen = new Set<string>();

  for (const [index, entry] of value.entries()) {
    const parsed = parseInfillMaterialOption(entry, index);
    if (!parsed) continue;
    const key = parsed.name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    options.push(parsed);
  }

  return options;
}

export function cloneInfillMaterialOption(
  option: InfillMaterialOption
): InfillMaterialOption {
  return { ...option };
}

export function toInfillMaterialModuleNamedOption(
  option: InfillMaterialOption
): ModuleNamedOption {
  return {
    id: option.id,
    name: option.name,
    code: option.code ?? null,
  };
}
