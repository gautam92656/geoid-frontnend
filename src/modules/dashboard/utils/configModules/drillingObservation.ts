import { isRecord } from "./helpers";
import type { ModuleNamedOption } from "./types";

/** API-proxied paths into backend `public/drilling-symbols` folder. */
export const DRILLING_OBSERVATION_GRAPHICS_API_BASE =
  "/api/v1/drilling-observation-graphics";

export type DrillingObservationGraphicCatalogEntry = {
  filename: string;
  label: string;
  url: string;
};

export type DrillingObservationOption = ModuleNamedOption & {
  /** Optional Tablogs alias key for import/export mapping. */
  tablogsAlias?: string | null;
  /** Filename under public/drilling-symbols (e.g. symbol_01.png). */
  graphic?: string | null;
  /** Require a depth value when logging this observation. */
  depthRequired?: boolean;
  /** Require observation date/time when logging. */
  observationDateTimeRequired?: boolean;
  /** Marks this observation as depth of casing. */
  isDepthOfCasing?: boolean;
  /** Marks this observation as depth to water. */
  isDepthToWater?: boolean;
};

export const DEFAULT_DRILLING_OBSERVATION_GRAPHIC = "symbol_01.png";

/** Optional alias choices shown in Manage Drilling Observations. */
export const DRILLING_OBSERVATION_TABLOGS_ALIAS_OPTIONS: ReadonlyArray<{
  value: string;
  label: string;
}> = [
  { value: "", label: "Select Tablogs alias" },
  { value: "Water encountered", label: "Water encountered" },
  { value: "Cave In", label: "Cave In" },
  { value: "Cave in", label: "Cave in" },
  { value: "Drill Progress", label: "Drill Progress" },
  { value: "End of Shift Record", label: "End of Shift Record" },
  { value: "Flushing Return %", label: "Flushing Return %" },
  { value: "Water Return (%)", label: "Water Return (%)" },
];

export const DEFAULT_DRILLING_OBSERVATION_OPTIONS: DrillingObservationOption[] = [
  {
    id: "water-encountered",
    name: "Water encountered",
    tablogsAlias: "Water encountered",
    graphic: "symbol_01.png",
    depthRequired: false,
    observationDateTimeRequired: true,
    isDepthOfCasing: false,
    isDepthToWater: false,
  },
  {
    id: "cave-in",
    name: "Cave in",
    tablogsAlias: "Cave in",
    graphic: "symbol_13.png",
    depthRequired: true,
    observationDateTimeRequired: true,
    isDepthOfCasing: false,
    isDepthToWater: false,
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

export function normalizeDrillingObservationGraphicFilename(
  value: string | null | undefined
): string {
  if (!value) return "";
  let trimmed = value.trim().replace(/\\/g, "/");
  if (!trimmed) return "";

  const slash = trimmed.lastIndexOf("/");
  if (slash >= 0) trimmed = trimmed.slice(slash + 1);

  const symbolKey = trimmed.match(/^(?:symbol_?)0*(\d+)$/i);
  if (symbolKey && !/\.(jpe?g|png|svg)$/i.test(trimmed)) {
    return `symbol_${String(symbolKey[1]).padStart(2, "0")}.png`;
  }

  return trimmed;
}

export function getDrillingObservationGraphicUrl(
  filename: string | null | undefined
): string {
  const name = normalizeDrillingObservationGraphicFilename(filename);
  if (!name) return "";
  return `${DRILLING_OBSERVATION_GRAPHICS_API_BASE}/files/${encodeURIComponent(name)}`;
}

export function drillingObservationGraphicLabel(
  filename: string | null | undefined
): string {
  const name = normalizeDrillingObservationGraphicFilename(filename);
  if (!name) return "Select Graphic";
  const match = name.match(/^symbol_?0*(\d+)\.(jpe?g|png|svg)$/i);
  if (!match) return name;
  return `Symbol ${String(match[1]).padStart(2, "0")}`;
}

export function toDrillingObservationGraphicCatalogEntry(
  filename: string,
  label?: string
): DrillingObservationGraphicCatalogEntry {
  const normalized = normalizeDrillingObservationGraphicFilename(filename) || filename;
  return {
    filename: normalized,
    label: label?.trim() || drillingObservationGraphicLabel(normalized),
    url: getDrillingObservationGraphicUrl(normalized),
  };
}

/** Fallback catalog matching backend `public/drilling-symbols` when the list API is unavailable. */
export const FALLBACK_DRILLING_OBSERVATION_GRAPHICS: readonly DrillingObservationGraphicCatalogEntry[] =
  Array.from({ length: 20 }, (_, index) => {
    const filename = `symbol_${String(index + 1).padStart(2, "0")}.png`;
    return toDrillingObservationGraphicCatalogEntry(filename);
  });

export function createBlankDrillingObservationOption(
  partial?: Partial<DrillingObservationOption>
): DrillingObservationOption {
  return {
    id: partial?.id ?? "",
    name: partial?.name ?? "",
    tablogsAlias: partial?.tablogsAlias ?? null,
    graphic: partial?.graphic ?? DEFAULT_DRILLING_OBSERVATION_GRAPHIC,
    depthRequired: partial?.depthRequired ?? false,
    observationDateTimeRequired: partial?.observationDateTimeRequired ?? false,
    isDepthOfCasing: partial?.isDepthOfCasing ?? false,
    isDepthToWater: partial?.isDepthToWater ?? false,
  };
}

export function parseDrillingObservationOption(
  value: unknown,
  index: number
): DrillingObservationOption | null {
  if (!isRecord(value)) return null;
  const name = typeof value.name === "string" ? value.name.trim() : "";
  if (!name) return null;

  const id =
    typeof value.id === "string" && value.id.trim()
      ? value.id.trim()
      : typeof value.id === "number"
        ? String(value.id)
        : `drilling-observation-${index + 1}`;

  const graphicRaw =
    asNullableString(value.graphic) ??
    asNullableString(value.observationGraphic) ??
    asNullableString(value.observation_graphic);

  return createBlankDrillingObservationOption({
    id,
    name,
    tablogsAlias:
      asNullableString(value.tablogsAlias) ??
      asNullableString(value.tablogs_alias) ??
      asNullableString(value.alias),
    graphic: graphicRaw
      ? normalizeDrillingObservationGraphicFilename(graphicRaw) || graphicRaw
      : DEFAULT_DRILLING_OBSERVATION_GRAPHIC,
    depthRequired:
      asBool(value.depthRequired) ||
      asBool(value.depth_required),
    observationDateTimeRequired:
      asBool(value.observationDateTimeRequired) ||
      asBool(value.observation_date_time_required),
    isDepthOfCasing:
      asBool(value.isDepthOfCasing) ||
      asBool(value.is_depth_of_casing),
    isDepthToWater:
      asBool(value.isDepthToWater) ||
      asBool(value.is_depth_to_water),
  });
}

export function parseDrillingObservationOptions(
  value: unknown,
  fallback: readonly DrillingObservationOption[] = DEFAULT_DRILLING_OBSERVATION_OPTIONS
): DrillingObservationOption[] {
  if (!Array.isArray(value)) {
    return fallback.map((entry) => ({ ...entry }));
  }

  const options: DrillingObservationOption[] = [];
  const seen = new Set<string>();

  for (const [index, entry] of value.entries()) {
    const parsed = parseDrillingObservationOption(entry, index);
    if (!parsed) continue;
    const key = parsed.name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    options.push(parsed);
  }

  return options;
}

export function cloneDrillingObservationOption(
  option: DrillingObservationOption
): DrillingObservationOption {
  return { ...option };
}

export function toDrillingObservationModuleNamedOption(
  option: DrillingObservationOption
): ModuleNamedOption {
  return {
    id: option.id,
    name: option.name,
    tablogsAlias: option.tablogsAlias ?? null,
    graphic: option.graphic ?? null,
    depthRequired: option.depthRequired ?? false,
    observationDateTimeRequired: option.observationDateTimeRequired ?? false,
    isDepthOfCasing: option.isDepthOfCasing ?? false,
    isDepthToWater: option.isDepthToWater ?? false,
  };
}

export function createDrillingObservationOption(
  id: string,
  name: string,
  partial?: Partial<DrillingObservationOption>
): DrillingObservationOption {
  return createBlankDrillingObservationOption({ id, name, ...partial });
}
