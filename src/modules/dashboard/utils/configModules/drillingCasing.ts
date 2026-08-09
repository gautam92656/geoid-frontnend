import { isRecord } from "./helpers";
import type { ModuleNamedOption } from "./types";

/** API-proxied paths into backend `public/casing-type-graphics` folder. */
export const CASING_TYPE_GRAPHICS_API_BASE = "/api/v1/casing-type-graphics";

export type CasingTypeGraphicCatalogEntry = {
  filename: string;
  label: string;
  url: string;
};

export type DrillingCasingOption = ModuleNamedOption & {
  /** Optional Tablogs alias key for import/export mapping. */
  tablogsAlias?: string | null;
  /** Filename under public/casing-type-graphics (e.g. graphic02.png). */
  graphic?: string | null;
  /** Optional start (top) graphic filename. */
  startGraphic?: string | null;
  /** Optional end (bottom) graphic filename. */
  endGraphic?: string | null;
};

export const DEFAULT_DRILLING_CASING_GRAPHIC = "graphic02.png";

/** Optional alias choices shown in Manage Drilling Casings. */
export const DRILLING_CASING_TABLOGS_ALIAS_OPTIONS: ReadonlyArray<{
  value: string;
  label: string;
}> = [
  { value: "", label: "Select Tablogs alias" },
  { value: "100mm Steel Casing", label: "100mm Steel Casing" },
  { value: "200mm Casing", label: "200mm Casing" },
  { value: "50mm Casing", label: "50mm Casing" },
  { value: "HX", label: "HX" },
  { value: "NS", label: "NS" },
  { value: "NX", label: "NX" },
  { value: "PX", label: "PX" },
  { value: "SX", label: "SX" },
];

export const DEFAULT_DRILLING_CASING_OPTIONS: DrillingCasingOption[] = [
  {
    id: "casing-200",
    name: "200mm Casing",
    tablogsAlias: null,
    graphic: DEFAULT_DRILLING_CASING_GRAPHIC,
    startGraphic: null,
    endGraphic: null,
  },
];

function asNullableString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

export function normalizeCasingTypeGraphicFilename(
  value: string | null | undefined
): string {
  if (!value) return "";
  let trimmed = value.trim().replace(/\\/g, "/");
  if (!trimmed) return "";

  const slash = trimmed.lastIndexOf("/");
  if (slash >= 0) trimmed = trimmed.slice(slash + 1);

  const graphicKey = trimmed.match(/^graphic0*(\d+)$/i);
  if (graphicKey && !/\.(jpe?g|png|svg)$/i.test(trimmed)) {
    return `graphic${String(graphicKey[1]).padStart(2, "0")}.png`;
  }

  return trimmed;
}

export function getCasingTypeGraphicUrl(filename: string | null | undefined): string {
  const name = normalizeCasingTypeGraphicFilename(filename);
  if (!name) return "";
  return `${CASING_TYPE_GRAPHICS_API_BASE}/files/${encodeURIComponent(name)}`;
}

export function casingTypeGraphicLabel(filename: string | null | undefined): string {
  const name = normalizeCasingTypeGraphicFilename(filename);
  if (!name) return "Select Graphic";
  const match = name.match(/^graphic0*(\d+)\.(jpe?g|png|svg)$/i);
  if (!match) return name;
  return `Graphic${String(match[1]).padStart(2, "0")}`;
}

export function toCasingTypeGraphicCatalogEntry(
  filename: string,
  label?: string
): CasingTypeGraphicCatalogEntry {
  const normalized = normalizeCasingTypeGraphicFilename(filename) || filename;
  return {
    filename: normalized,
    label: label?.trim() || casingTypeGraphicLabel(normalized),
    url: getCasingTypeGraphicUrl(normalized),
  };
}

/** Fallback catalog matching backend `public/casing-type-graphics` when the list API is unavailable. */
export const FALLBACK_CASING_TYPE_GRAPHICS: readonly CasingTypeGraphicCatalogEntry[] = [
  "graphic01.png",
  "graphic02.png",
  "graphic03.png",
].map((filename) => toCasingTypeGraphicCatalogEntry(filename));

export function createBlankDrillingCasingOption(
  partial?: Partial<DrillingCasingOption>
): DrillingCasingOption {
  return {
    id: partial?.id ?? "",
    name: partial?.name ?? "",
    tablogsAlias: partial?.tablogsAlias ?? null,
    graphic: partial?.graphic ?? DEFAULT_DRILLING_CASING_GRAPHIC,
    startGraphic: partial?.startGraphic ?? null,
    endGraphic: partial?.endGraphic ?? null,
  };
}

export function parseDrillingCasingOption(
  value: unknown,
  index: number
): DrillingCasingOption | null {
  if (!isRecord(value)) return null;
  const name = typeof value.name === "string" ? value.name.trim() : "";
  if (!name) return null;

  const id =
    typeof value.id === "string" && value.id.trim()
      ? value.id.trim()
      : typeof value.id === "number"
        ? String(value.id)
        : `drilling-casing-${index + 1}`;

  const graphicRaw =
    asNullableString(value.graphic) ?? asNullableString(value.casingGraphic);
  const startRaw =
    asNullableString(value.startGraphic) ??
    asNullableString(value.start_graphic) ??
    asNullableString(value.topGraphic) ??
    asNullableString(value.top_graphic);
  const endRaw =
    asNullableString(value.endGraphic) ??
    asNullableString(value.end_graphic) ??
    asNullableString(value.bottomGraphic) ??
    asNullableString(value.bottom_graphic);

  return createBlankDrillingCasingOption({
    id,
    name,
    tablogsAlias:
      asNullableString(value.tablogsAlias) ??
      asNullableString(value.tablogs_alias) ??
      asNullableString(value.alias),
    graphic: graphicRaw
      ? normalizeCasingTypeGraphicFilename(graphicRaw) || graphicRaw
      : DEFAULT_DRILLING_CASING_GRAPHIC,
    startGraphic: startRaw
      ? normalizeCasingTypeGraphicFilename(startRaw) || startRaw
      : null,
    endGraphic: endRaw ? normalizeCasingTypeGraphicFilename(endRaw) || endRaw : null,
  });
}

export function parseDrillingCasingOptions(
  value: unknown,
  fallback: readonly DrillingCasingOption[] = DEFAULT_DRILLING_CASING_OPTIONS
): DrillingCasingOption[] {
  if (!Array.isArray(value)) {
    return fallback.map((entry) => ({ ...entry }));
  }

  const options: DrillingCasingOption[] = [];
  const seen = new Set<string>();

  for (const [index, entry] of value.entries()) {
    const parsed = parseDrillingCasingOption(entry, index);
    if (!parsed) continue;
    const key = parsed.name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    options.push(parsed);
  }

  return options;
}

export function cloneDrillingCasingOption(
  option: DrillingCasingOption
): DrillingCasingOption {
  return { ...option };
}

export function toDrillingCasingModuleNamedOption(
  option: DrillingCasingOption
): ModuleNamedOption {
  return {
    id: option.id,
    name: option.name,
    tablogsAlias: option.tablogsAlias ?? null,
    graphic: option.graphic ?? null,
    startGraphic: option.startGraphic ?? null,
    endGraphic: option.endGraphic ?? null,
  };
}

export function createDrillingCasingOption(
  id: string,
  name: string,
  partial?: Partial<DrillingCasingOption>
): DrillingCasingOption {
  return createBlankDrillingCasingOption({ id, name, ...partial });
}
