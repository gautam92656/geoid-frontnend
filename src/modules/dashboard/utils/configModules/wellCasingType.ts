import { isRecord } from "./helpers";
import type { ModuleNamedOption } from "./types";

/** API-proxied paths into backend `public/well-casing` folder. */
export const WELL_CASING_GRAPHICS_API_BASE = "/api/v1/well-casing-graphics";

export type WellCasingGraphicCatalogEntry = {
  filename: string;
  label: string;
  url: string;
};

export const WELL_CASING_KINDS = ["surface", "regular"] as const;
export type WellCasingKind = (typeof WELL_CASING_KINDS)[number];

export type WellCasingTypeOption = ModuleNamedOption & {
  /** Optional Tablogs alias key for import/export mapping. */
  tablogsAlias?: string | null;
  /** Surface vs regular casing category. */
  type?: WellCasingKind;
  /** Filename under public/well-casing (e.g. graphic_02.png). */
  graphic?: string | null;
  /** When true, well logs may use depths above ground (negative). */
  allowNegativeDepth?: boolean;
};

export const DEFAULT_WELL_CASING_GRAPHIC = "graphic_02.png";

export const WELL_CASING_KIND_OPTIONS: ReadonlyArray<{
  value: WellCasingKind;
  label: string;
}> = [
  { value: "surface", label: "Surface Casing" },
  { value: "regular", label: "Regular Casing" },
];

/** Optional alias choices shown in Manage Well Casing Types. */
export const WELL_CASING_TABLOGS_ALIAS_OPTIONS: ReadonlyArray<{
  value: string;
  label: string;
}> = [
  { value: "", label: "Select Tablogs alias" },
  { value: "Surface Casing", label: "Surface Casing" },
  { value: "Regular Casing", label: "Regular Casing" },
];

export const DEFAULT_WELL_CASING_TYPE_OPTIONS: WellCasingTypeOption[] = [
  {
    id: "surface-casing",
    name: "Surface Casing",
    tablogsAlias: "Surface Casing",
    type: "surface",
    graphic: "graphic_02.png",
    allowNegativeDepth: false,
  },
  {
    id: "regular-casing",
    name: "Regular Casing",
    tablogsAlias: "Regular Casing",
    type: "regular",
    graphic: "graphic_01.png",
    allowNegativeDepth: false,
  },
];

/** Fallback catalog matching backend `public/well-casing` when the list API is unavailable. */
export const FALLBACK_WELL_CASING_GRAPHICS: readonly string[] = [
  "graphic_01.png",
  "graphic_02.png",
  "graphic_03.png",
  "graphic_04.png",
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

function normalizeWellCasingKind(value: unknown): WellCasingKind {
  if (typeof value === "number") {
    if (value === 1) return "surface";
    if (value === 2) return "regular";
  }
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase().replace(/[_\s-]+/g, "");
    if (
      normalized === "1" ||
      normalized === "surface" ||
      normalized === "surfacecasing"
    ) {
      return "surface";
    }
    if (
      normalized === "2" ||
      normalized === "regular" ||
      normalized === "regularcasing"
    ) {
      return "regular";
    }
  }
  return "surface";
}

export function normalizeWellCasingGraphicFilename(
  value: string | null | undefined
): string {
  if (!value) return "";
  let trimmed = value.trim().replace(/\\/g, "/");
  if (!trimmed) return "";

  const slash = trimmed.lastIndexOf("/");
  if (slash >= 0) trimmed = trimmed.slice(slash + 1);

  // Tablogs keys like graphic02 / graphic_2 → graphic_02.png
  const graphicKey = trimmed.match(/^graphic_?0*(\d+)$/i);
  if (graphicKey && !/\.(jpe?g|png|svg)$/i.test(trimmed)) {
    return `graphic_${String(graphicKey[1]).padStart(2, "0")}.png`;
  }

  const withExt = trimmed.match(/^graphic0*(\d+)\.(jpe?g|png|svg)$/i);
  if (withExt) {
    return `graphic_${String(withExt[1]).padStart(2, "0")}.${withExt[2].toLowerCase()}`;
  }

  return trimmed;
}

export function getWellCasingGraphicUrl(filename: string | null | undefined): string {
  const name = normalizeWellCasingGraphicFilename(filename);
  if (!name) return "";
  return `${WELL_CASING_GRAPHICS_API_BASE}/files/${encodeURIComponent(name)}`;
}

export function wellCasingGraphicLabel(filename: string | null | undefined): string {
  const name = normalizeWellCasingGraphicFilename(filename);
  if (!name) return "Select Graphic";
  const match = name.match(/^graphic_0*(\d+)\.(jpe?g|png|svg)$/i);
  if (!match) return name;
  return `CasingGraphic${String(match[1]).padStart(2, "0")}`;
}

export function toWellCasingGraphicCatalogEntry(
  filename: string,
  label?: string
): WellCasingGraphicCatalogEntry {
  const normalized = normalizeWellCasingGraphicFilename(filename) || filename;
  return {
    filename: normalized,
    label: label?.trim() || wellCasingGraphicLabel(normalized),
    url: getWellCasingGraphicUrl(normalized),
  };
}

export function createBlankWellCasingTypeOption(
  partial?: Partial<WellCasingTypeOption>
): WellCasingTypeOption {
  return {
    id: partial?.id ?? "",
    name: partial?.name ?? "",
    tablogsAlias: partial?.tablogsAlias ?? null,
    type: partial?.type ? normalizeWellCasingKind(partial.type) : "surface",
    graphic: partial?.graphic ?? DEFAULT_WELL_CASING_GRAPHIC,
    allowNegativeDepth: Boolean(partial?.allowNegativeDepth),
  };
}

export function parseWellCasingTypeOption(
  value: unknown,
  index: number
): WellCasingTypeOption | null {
  if (!isRecord(value)) return null;
  const name = typeof value.name === "string" ? value.name.trim() : "";
  if (!name) return null;

  const id =
    typeof value.id === "string" && value.id.trim()
      ? value.id.trim()
      : typeof value.id === "number"
        ? String(value.id)
        : `well-casing-type-${index + 1}`;

  const graphicRaw =
    asNullableString(value.graphic) ?? asNullableString(value.casingGraphic);

  return createBlankWellCasingTypeOption({
    id,
    name,
    tablogsAlias:
      asNullableString(value.tablogsAlias) ??
      asNullableString(value.tablogs_alias) ??
      asNullableString(value.alias),
    type: normalizeWellCasingKind(value.type ?? value.casingType ?? value.casing_type),
    graphic: graphicRaw
      ? normalizeWellCasingGraphicFilename(graphicRaw) || graphicRaw
      : DEFAULT_WELL_CASING_GRAPHIC,
    allowNegativeDepth: asBool(
      value.allowNegativeDepth ?? value.allow_negative_depth ?? value.negativeDepth,
      false
    ),
  });
}

export function parseWellCasingTypeOptions(
  value: unknown,
  fallback: readonly WellCasingTypeOption[] = DEFAULT_WELL_CASING_TYPE_OPTIONS
): WellCasingTypeOption[] {
  if (!Array.isArray(value)) {
    return fallback.map((entry) => ({ ...entry }));
  }

  const options: WellCasingTypeOption[] = [];
  const seen = new Set<string>();

  for (const [index, entry] of value.entries()) {
    const parsed = parseWellCasingTypeOption(entry, index);
    if (!parsed) continue;
    const key = parsed.name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    options.push(parsed);
  }

  return options;
}

export function cloneWellCasingTypeOption(
  option: WellCasingTypeOption
): WellCasingTypeOption {
  return { ...option };
}

export function toWellCasingTypeModuleNamedOption(
  option: WellCasingTypeOption
): ModuleNamedOption {
  return {
    id: option.id,
    name: option.name,
    tablogsAlias: option.tablogsAlias ?? null,
    type: option.type ?? "surface",
    graphic: option.graphic ?? null,
    allowNegativeDepth: Boolean(option.allowNegativeDepth),
  };
}

export function createWellCasingTypeOption(
  id: string,
  name: string,
  partial?: Partial<WellCasingTypeOption>
): WellCasingTypeOption {
  return createBlankWellCasingTypeOption({ id, name, ...partial });
}
