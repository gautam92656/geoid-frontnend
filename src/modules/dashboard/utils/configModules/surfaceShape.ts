import { isRecord } from "./helpers";
import type { ModuleNamedOption } from "./types";

export type SurfaceShapeOption = ModuleNamedOption & {
  code?: string | null;
};

export const DEFAULT_SURFACE_SHAPE_OPTIONS: SurfaceShapeOption[] = [
  { id: "planar", name: "Planar", code: "PL" },
  { id: "curved", name: "Curved", code: "CU" },
  { id: "undulating", name: "Undulating", code: "UN" },
  { id: "stepped", name: "Stepped", code: "ST" },
  { id: "irregular", name: "Irregular", code: "IR" },
];

export function createBlankSurfaceShapeOption(
  partial?: Partial<SurfaceShapeOption>
): SurfaceShapeOption {
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

export function parseSurfaceShapeOption(
  value: unknown,
  index: number
): SurfaceShapeOption | null {
  if (!isRecord(value)) return null;
  const name = typeof value.name === "string" ? value.name.trim() : "";
  if (!name) return null;

  const id =
    typeof value.id === "string" && value.id.trim()
      ? value.id.trim()
      : typeof value.id === "number"
        ? String(value.id)
        : `surface-shape-${index + 1}`;

  return {
    id,
    name,
    code: asNullableString(value.code) ?? "",
  };
}

export function parseSurfaceShapeOptions(
  value: unknown,
  fallback: readonly SurfaceShapeOption[] = DEFAULT_SURFACE_SHAPE_OPTIONS
): SurfaceShapeOption[] {
  if (!Array.isArray(value)) {
    return fallback.map((entry) => ({ ...entry }));
  }

  const options: SurfaceShapeOption[] = [];
  const seen = new Set<string>();

  for (const [index, entry] of value.entries()) {
    const parsed = parseSurfaceShapeOption(entry, index);
    if (!parsed) continue;
    const key = parsed.name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    options.push(parsed);
  }

  return options;
}

export function cloneSurfaceShapeOption(option: SurfaceShapeOption): SurfaceShapeOption {
  return { ...option };
}

export function toSurfaceShapeModuleNamedOption(
  option: SurfaceShapeOption
): ModuleNamedOption {
  return {
    id: option.id,
    name: option.name,
    code: option.code ?? null,
  };
}
