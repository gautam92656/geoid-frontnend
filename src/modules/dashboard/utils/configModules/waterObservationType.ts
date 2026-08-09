import { isRecord } from "./helpers";
import type { ModuleNamedOption } from "./types";

/** API-proxied paths into backend `public/water-obs` folder. */
export const WATER_OBS_GRAPHICS_API_BASE = "/api/v1/water-obs-graphics";

export type WaterObservationGraphicCatalogEntry = {
  filename: string;
  label: string;
  url: string;
};

export type WaterObservationTypeOption = ModuleNamedOption & {
  /** Optional Tablogs alias key for import/export mapping. */
  tablogsAlias?: string | null;
  /** Filename under public/water-obs (e.g. water_symbol_1.svg). */
  graphic?: string | null;
  /** Require a depth value when logging this observation type. */
  depthRequired?: boolean;
};

export const DEFAULT_WATER_OBSERVATION_GRAPHIC = "water_symbol_1.svg";

/** Optional alias choices shown in Manage Water Observation Types. */
export const WATER_OBSERVATION_TABLOGS_ALIAS_OPTIONS: ReadonlyArray<{
  value: string;
  label: string;
}> = [
  { value: "", label: "Select Tablogs alias" },
  { value: "standing", label: "Standing" },
  { value: "inflow", label: "Inflow" },
  { value: "outflow", label: "Outflow" },
  { value: "not-encountered", label: "Not Encountered" },
  { value: "ground-water", label: "Ground Water" },
  { value: "seepage-water", label: "Seepage Water" },
];

export const FALLBACK_WATER_OBS_GRAPHICS: readonly string[] = [
  "no_graphic.png",
  "no_graphic_water.svg",
  "water_symbol_1.svg",
  "water_symbol_2.svg",
  "water_symbol_3.svg",
  "water_symbol_4.svg",
  "water_symbol_5.svg",
  "water_symbol_7.svg",
  "water_symbol_8.svg",
  "water_symbol_9.svg",
  "water_symbol_10.svg",
  "water_symbol_11.svg",
  "water_symbol_12.svg",
  "water_symbol_13.svg",
  "water_symbol_14.svg",
  "water_symbol_15.svg",
  "water_symbol_16.svg",
  "water_symbol_17.svg",
];

export const DEFAULT_WATER_OBSERVATION_TYPE_OPTIONS: WaterObservationTypeOption[] = [
  {
    id: "standing",
    name: "Standing",
    tablogsAlias: "standing",
    graphic: "water_symbol_1.svg",
    depthRequired: true,
  },
  {
    id: "inflow",
    name: "Inflow",
    tablogsAlias: "inflow",
    graphic: "water_symbol_2.svg",
    depthRequired: true,
  },
  {
    id: "outflow",
    name: "Outflow",
    tablogsAlias: "outflow",
    graphic: "water_symbol_3.svg",
    depthRequired: true,
  },
  {
    id: "not-encountered",
    name: "Not Encountered",
    tablogsAlias: "not-encountered",
    graphic: "no_graphic_water.svg",
    depthRequired: false,
  },
  {
    id: "ground-water",
    name: "Ground Water",
    tablogsAlias: "ground-water",
    graphic: "water_symbol_4.svg",
    depthRequired: true,
  },
  {
    id: "seepage-water",
    name: "Seepage Water",
    tablogsAlias: "seepage-water",
    graphic: "water_symbol_5.svg",
    depthRequired: true,
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

export function normalizeWaterObservationGraphicFilename(
  value: string | null | undefined
): string {
  if (!value) return "";
  let trimmed = value.trim().replace(/\\/g, "/");
  if (!trimmed) return "";

  const slash = trimmed.lastIndexOf("/");
  if (slash >= 0) trimmed = trimmed.slice(slash + 1);

  if (/^no_graphic(?:_water)?$/i.test(trimmed)) {
    return trimmed.toLowerCase().includes("water")
      ? "no_graphic_water.svg"
      : "no_graphic.png";
  }

  const symbolKey = trimmed.match(/^(?:water[_-]?symbol[_-]?)0*(\d+)$/i);
  if (symbolKey && !/\.(jpe?g|png|svg)$/i.test(trimmed)) {
    return `water_symbol_${symbolKey[1]}.svg`;
  }

  const withExt = trimmed.match(/^(?:water[_-]?symbol[_-]?)0*(\d+)\.(jpe?g|png|svg)$/i);
  if (withExt) {
    return `water_symbol_${withExt[1]}.svg`;
  }

  return trimmed;
}

export function getWaterObservationGraphicUrl(
  filename: string | null | undefined
): string {
  const name = normalizeWaterObservationGraphicFilename(filename);
  if (!name) return "";
  return `${WATER_OBS_GRAPHICS_API_BASE}/files/${encodeURIComponent(name)}`;
}

export function waterObservationGraphicLabel(
  filename: string | null | undefined
): string {
  const name = normalizeWaterObservationGraphicFilename(filename);
  if (!name) return "Select Graphic";
  if (/^no_graphic/i.test(name)) return "No graphic";
  const match = name.match(/^water_symbol_?0*(\d+)\.(jpe?g|png|svg)$/i);
  if (!match) return name;
  return `Water Symbol ${match[1]}`;
}

export function toWaterObservationGraphicCatalogEntry(
  filename: string
): WaterObservationGraphicCatalogEntry {
  const normalized = normalizeWaterObservationGraphicFilename(filename) || filename;
  return {
    filename: normalized,
    label: waterObservationGraphicLabel(normalized),
    url: getWaterObservationGraphicUrl(normalized),
  };
}

export function createBlankWaterObservationTypeOption(
  partial?: Partial<WaterObservationTypeOption>
): WaterObservationTypeOption {
  return {
    id: partial?.id ?? "",
    name: partial?.name ?? "",
    tablogsAlias: partial?.tablogsAlias ?? null,
    graphic: partial?.graphic ?? DEFAULT_WATER_OBSERVATION_GRAPHIC,
    depthRequired: partial?.depthRequired ?? true,
  };
}

export function parseWaterObservationTypeOption(
  value: unknown,
  index: number
): WaterObservationTypeOption | null {
  if (!isRecord(value)) return null;
  const name = typeof value.name === "string" ? value.name.trim() : "";
  if (!name) return null;

  const id =
    typeof value.id === "string" && value.id.trim()
      ? value.id.trim()
      : typeof value.id === "number"
        ? String(value.id)
        : `water-observation-type-${index + 1}`;

  const graphicRaw =
    asNullableString(value.graphic) ??
    asNullableString(value.waterObservationGraphic) ??
    asNullableString(value.water_observation_graphic);

  return createBlankWaterObservationTypeOption({
    id,
    name,
    tablogsAlias:
      asNullableString(value.tablogsAlias) ??
      asNullableString(value.tablogs_alias) ??
      asNullableString(value.alias),
    graphic: graphicRaw
      ? normalizeWaterObservationGraphicFilename(graphicRaw) || graphicRaw
      : DEFAULT_WATER_OBSERVATION_GRAPHIC,
    depthRequired:
      value.depthRequired === undefined && value.depth_required === undefined
        ? true
        : asBool(value.depthRequired) || asBool(value.depth_required),
  });
}

export function parseWaterObservationTypeOptions(
  value: unknown,
  fallback: readonly WaterObservationTypeOption[] = DEFAULT_WATER_OBSERVATION_TYPE_OPTIONS
): WaterObservationTypeOption[] {
  if (!Array.isArray(value)) {
    return fallback.map((entry) => ({ ...entry }));
  }

  const options: WaterObservationTypeOption[] = [];
  const seen = new Set<string>();

  for (const [index, entry] of value.entries()) {
    const parsed = parseWaterObservationTypeOption(entry, index);
    if (!parsed) continue;
    const key = parsed.name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    options.push(parsed);
  }

  return options;
}

export function cloneWaterObservationTypeOption(
  option: WaterObservationTypeOption
): WaterObservationTypeOption {
  return { ...option };
}

export function toWaterObservationTypeModuleNamedOption(
  option: WaterObservationTypeOption
): ModuleNamedOption {
  return {
    id: option.id,
    name: option.name,
    tablogsAlias: option.tablogsAlias ?? null,
    graphic: option.graphic ?? null,
    depthRequired: option.depthRequired ?? false,
  };
}

export function createWaterObservationTypeOption(
  id: string,
  name: string,
  partial?: Partial<WaterObservationTypeOption>
): WaterObservationTypeOption {
  return createBlankWaterObservationTypeOption({ id, name, ...partial });
}
