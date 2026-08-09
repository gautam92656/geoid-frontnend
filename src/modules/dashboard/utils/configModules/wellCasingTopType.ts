import { isRecord } from "./helpers";
import type { ModuleNamedOption } from "./types";
import {
  FALLBACK_WELL_CASING_GRAPHICS,
  WELL_CASING_GRAPHICS_API_BASE,
  getWellCasingGraphicUrl,
  normalizeWellCasingGraphicFilename,
  toWellCasingGraphicCatalogEntry,
  wellCasingGraphicLabel,
  type WellCasingGraphicCatalogEntry,
} from "./wellCasingType";

/** Well casing top types reuse graphics from backend `public/well-casing`. */
export {
  WELL_CASING_GRAPHICS_API_BASE as WELL_CASING_TOP_GRAPHICS_API_BASE,
  FALLBACK_WELL_CASING_GRAPHICS as FALLBACK_WELL_CASING_TOP_GRAPHICS,
  getWellCasingGraphicUrl as getWellCasingTopGraphicUrl,
  normalizeWellCasingGraphicFilename as normalizeWellCasingTopGraphicFilename,
  wellCasingGraphicLabel as wellCasingTopGraphicLabel,
  toWellCasingGraphicCatalogEntry as toWellCasingTopGraphicCatalogEntry,
};

export type WellCasingTopGraphicCatalogEntry = WellCasingGraphicCatalogEntry;

export type WellCasingTopTypeOption = ModuleNamedOption & {
  /** Optional Tablogs alias key for import/export mapping. */
  tablogsAlias?: string | null;
  /** Filename under public/well-casing (e.g. graphic_01.png). */
  graphic?: string | null;
  /** When true, well logs may use depths above ground (negative). */
  allowNegativeDepth?: boolean;
};

export const DEFAULT_WELL_CASING_TOP_GRAPHIC = "graphic_01.png";

/** Optional alias choices shown in Manage Well Casing Top Types. */
export const WELL_CASING_TOP_TABLOGS_ALIAS_OPTIONS: ReadonlyArray<{
  value: string;
  label: string;
}> = [
  { value: "", label: "Select Tablogs alias" },
  { value: "Well Casing Top", label: "Well Casing Top" },
];

export const DEFAULT_WELL_CASING_TOP_TYPE_OPTIONS: WellCasingTopTypeOption[] = [
  {
    id: "well-casing-top",
    name: "Well Casing Top",
    tablogsAlias: null,
    graphic: DEFAULT_WELL_CASING_TOP_GRAPHIC,
    allowNegativeDepth: true,
  },
];

function asBool(value: unknown, fallback = false): boolean {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value !== 0;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    return normalized === "1" || normalized === "true" || normalized === "yes";
  }
  return fallback;
}

function asNullableString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

export function createBlankWellCasingTopTypeOption(
  partial?: Partial<WellCasingTopTypeOption>
): WellCasingTopTypeOption {
  return {
    id: partial?.id ?? "",
    name: partial?.name ?? "",
    tablogsAlias: partial?.tablogsAlias ?? null,
    graphic: partial?.graphic ?? DEFAULT_WELL_CASING_TOP_GRAPHIC,
    allowNegativeDepth:
      partial?.allowNegativeDepth !== undefined
        ? Boolean(partial.allowNegativeDepth)
        : true,
  };
}

export function parseWellCasingTopTypeOption(
  value: unknown,
  index: number
): WellCasingTopTypeOption | null {
  if (!isRecord(value)) return null;
  const name = typeof value.name === "string" ? value.name.trim() : "";
  if (!name) return null;

  const id =
    typeof value.id === "string" && value.id.trim()
      ? value.id.trim()
      : typeof value.id === "number"
        ? String(value.id)
        : `well-casing-top-${index + 1}`;

  const graphicRaw =
    asNullableString(value.graphic) ?? asNullableString(value.casingGraphic);

  return createBlankWellCasingTopTypeOption({
    id,
    name,
    tablogsAlias:
      asNullableString(value.tablogsAlias) ??
      asNullableString(value.tablogs_alias) ??
      asNullableString(value.alias),
    graphic: graphicRaw
      ? normalizeWellCasingGraphicFilename(graphicRaw) || graphicRaw
      : DEFAULT_WELL_CASING_TOP_GRAPHIC,
    allowNegativeDepth: asBool(
      value.allowNegativeDepth ?? value.allow_negative_depth ?? value.negativeDepth,
      true
    ),
  });
}

export function parseWellCasingTopTypeOptions(
  value: unknown,
  fallback: readonly WellCasingTopTypeOption[] = DEFAULT_WELL_CASING_TOP_TYPE_OPTIONS
): WellCasingTopTypeOption[] {
  if (!Array.isArray(value)) {
    return fallback.map((entry) => ({ ...entry }));
  }

  const options: WellCasingTopTypeOption[] = [];
  const seen = new Set<string>();

  for (const [index, entry] of value.entries()) {
    const parsed = parseWellCasingTopTypeOption(entry, index);
    if (!parsed) continue;
    const key = parsed.name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    options.push(parsed);
  }

  return options;
}

export function cloneWellCasingTopTypeOption(
  option: WellCasingTopTypeOption
): WellCasingTopTypeOption {
  return { ...option };
}

export function toWellCasingTopTypeModuleNamedOption(
  option: WellCasingTopTypeOption
): ModuleNamedOption {
  return {
    id: option.id,
    name: option.name,
    tablogsAlias: option.tablogsAlias ?? null,
    graphic: option.graphic ?? null,
    allowNegativeDepth: Boolean(option.allowNegativeDepth),
  };
}

export function createWellCasingTopTypeOption(
  id: string,
  name: string,
  partial?: Partial<WellCasingTopTypeOption>
): WellCasingTopTypeOption {
  return createBlankWellCasingTopTypeOption({ id, name, ...partial });
}
