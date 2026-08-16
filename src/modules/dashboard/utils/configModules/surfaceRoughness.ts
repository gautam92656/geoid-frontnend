import { isRecord } from "./helpers";
import type { ModuleNamedOption } from "./types";

export type SurfaceRoughnessOption = ModuleNamedOption & {
  code?: string | null;
};

export const DEFAULT_SURFACE_ROUGHNESS_OPTIONS: SurfaceRoughnessOption[] = [
  { id: "very-rough", name: "Very Rough", code: "VR" },
  { id: "rough", name: "Rough", code: "RO" },
  { id: "smooth", name: "Smooth", code: "SM" },
  { id: "polished", name: "Polished", code: "PO" },
  { id: "slickensided", name: "Slickensided", code: "SL" },
];

export function createBlankSurfaceRoughnessOption(
  partial?: Partial<SurfaceRoughnessOption>
): SurfaceRoughnessOption {
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

export function parseSurfaceRoughnessOption(
  value: unknown,
  index: number
): SurfaceRoughnessOption | null {
  if (!isRecord(value)) return null;
  const name = typeof value.name === "string" ? value.name.trim() : "";
  if (!name) return null;

  const id =
    typeof value.id === "string" && value.id.trim()
      ? value.id.trim()
      : typeof value.id === "number"
        ? String(value.id)
        : `surface-roughness-${index + 1}`;

  return {
    id,
    name,
    code: asNullableString(value.code) ?? "",
  };
}

export function parseSurfaceRoughnessOptions(
  value: unknown,
  fallback: readonly SurfaceRoughnessOption[] = DEFAULT_SURFACE_ROUGHNESS_OPTIONS
): SurfaceRoughnessOption[] {
  if (!Array.isArray(value)) {
    return fallback.map((entry) => ({ ...entry }));
  }

  const options: SurfaceRoughnessOption[] = [];
  const seen = new Set<string>();

  for (const [index, entry] of value.entries()) {
    const parsed = parseSurfaceRoughnessOption(entry, index);
    if (!parsed) continue;
    const key = parsed.name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    options.push(parsed);
  }

  return options;
}

export function cloneSurfaceRoughnessOption(
  option: SurfaceRoughnessOption
): SurfaceRoughnessOption {
  return { ...option };
}

export function toSurfaceRoughnessModuleNamedOption(
  option: SurfaceRoughnessOption
): ModuleNamedOption {
  return {
    id: option.id,
    name: option.name,
    code: option.code ?? null,
  };
}
