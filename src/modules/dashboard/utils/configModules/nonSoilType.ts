import defaultNonSoilTypeOptionsJson from "../../data/defaultNonSoilTypeOptions.json";
import {
  CLASSIFICATION_GRAPHICS_PUBLIC_BASE,
  getClassificationGraphicFilename,
} from "./classification";
import { isRecord } from "./helpers";
import {
  ORIGIN_GRAPHICS_CATALOG,
  type OriginGraphicCatalogEntry,
} from "./origin";
import type { ModuleNamedOption } from "./types";

export type NonSoilTypeOption = ModuleNamedOption & {
  code?: string | null;
  graphic?: string | null;
};

export type NonSoilTypeGraphicCatalogEntry = OriginGraphicCatalogEntry;

/** Shared soil/rock graphic catalog (Tablogs big_soil_or_rock_type). */
export const NON_SOIL_TYPE_GRAPHICS_CATALOG: readonly NonSoilTypeGraphicCatalogEntry[] =
  ORIGIN_GRAPHICS_CATALOG;

export function getNonSoilTypeGraphicUrl(graphic: string | null | undefined): string {
  const filename = getClassificationGraphicFilename(graphic ?? "");
  if (!filename) return "";
  return `${CLASSIFICATION_GRAPHICS_PUBLIC_BASE}/${encodeURIComponent(filename)}`;
}

export function getNonSoilTypeGraphicLabel(graphic: string | null | undefined): string {
  const filename = getClassificationGraphicFilename(graphic ?? "");
  if (!filename || filename === "no_graphic.png") return "";
  const match = NON_SOIL_TYPE_GRAPHICS_CATALOG.find((entry) => entry.filename === filename);
  return match?.label ?? filename;
}

export function createBlankNonSoilTypeOption(
  partial?: Partial<NonSoilTypeOption>
): NonSoilTypeOption {
  return {
    id: partial?.id ?? "",
    name: partial?.name ?? "",
    code: partial?.code ?? "",
    graphic: partial?.graphic ?? null,
  };
}

function asNullableString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

export function parseNonSoilTypeOption(
  value: unknown,
  index: number
): NonSoilTypeOption | null {
  if (!isRecord(value)) return null;
  const name = typeof value.name === "string" ? value.name.trim() : "";
  if (!name) return null;

  const id =
    typeof value.id === "string" && value.id.trim()
      ? value.id.trim()
      : typeof value.id === "number"
        ? String(value.id)
        : `non-soil-type-${index + 1}`;

  const graphicRaw = asNullableString(value.graphic);

  return {
    id,
    name,
    code: asNullableString(value.code) ?? "",
    graphic: graphicRaw ? getClassificationGraphicFilename(graphicRaw) || graphicRaw : null,
  };
}

export function parseNonSoilTypeOptions(
  value: unknown,
  fallback: readonly NonSoilTypeOption[] = []
): NonSoilTypeOption[] {
  if (!Array.isArray(value)) {
    return fallback.map((entry) => ({ ...entry }));
  }

  const options: NonSoilTypeOption[] = [];
  const seen = new Set<string>();

  for (const [index, entry] of value.entries()) {
    const parsed = parseNonSoilTypeOption(entry, index);
    if (!parsed) continue;
    const key = parsed.name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    options.push(parsed);
  }

  return options;
}

export function cloneNonSoilTypeOption(option: NonSoilTypeOption): NonSoilTypeOption {
  return { ...option };
}

export function toNonSoilTypeModuleNamedOption(option: NonSoilTypeOption): ModuleNamedOption {
  return {
    id: option.id,
    name: option.name,
    code: option.code ?? null,
    graphic: option.graphic ?? null,
  };
}

export const DEFAULT_NON_SOIL_TYPE_OPTIONS: NonSoilTypeOption[] = (
  defaultNonSoilTypeOptionsJson as NonSoilTypeOption[]
).map((entry) => cloneNonSoilTypeOption(entry));
