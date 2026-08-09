import { isRecord } from "./helpers";
import type { ModuleNamedOption } from "./types";

export type ApertureMineralOption = ModuleNamedOption & {
  code?: string | null;
};

export const DEFAULT_APERTURE_MINERAL_OPTIONS: ApertureMineralOption[] = [
  {
    id: "none",
    name: "None",
    code: "",
  },
];

export function createBlankApertureMineralOption(
  partial?: Partial<ApertureMineralOption>
): ApertureMineralOption {
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

export function parseApertureMineralOption(
  value: unknown,
  index: number
): ApertureMineralOption | null {
  if (!isRecord(value)) return null;
  const name = typeof value.name === "string" ? value.name.trim() : "";
  if (!name) return null;

  const id =
    typeof value.id === "string" && value.id.trim()
      ? value.id.trim()
      : typeof value.id === "number"
        ? String(value.id)
        : `aperture-mineral-${index + 1}`;

  return {
    id,
    name,
    code: asNullableString(value.code) ?? "",
  };
}

export function parseApertureMineralOptions(
  value: unknown,
  fallback: readonly ApertureMineralOption[] = DEFAULT_APERTURE_MINERAL_OPTIONS
): ApertureMineralOption[] {
  if (!Array.isArray(value)) {
    return fallback.map((entry) => ({ ...entry }));
  }

  const options: ApertureMineralOption[] = [];
  const seen = new Set<string>();

  for (const [index, entry] of value.entries()) {
    const parsed = parseApertureMineralOption(entry, index);
    if (!parsed) continue;
    const key = parsed.name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    options.push(parsed);
  }

  return options;
}

export function cloneApertureMineralOption(
  option: ApertureMineralOption
): ApertureMineralOption {
  return { ...option };
}

export function toApertureMineralModuleNamedOption(
  option: ApertureMineralOption
): ModuleNamedOption {
  return {
    id: option.id,
    name: option.name,
    code: option.code ?? null,
  };
}
