import { isRecord } from "./helpers";
import type { ModuleNamedOption } from "./types";

/** API-proxied paths into backend `public/well-probe` folder. */
export const WELL_PROBE_GRAPHICS_API_BASE = "/api/v1/well-probe-graphics";

export type WellProbeGraphicCatalogEntry = {
  filename: string;
  label: string;
  url: string;
};

export type WellProbeTypeOption = ModuleNamedOption & {
  /** Optional Tablogs alias key for import/export mapping. */
  tablogsAlias?: string | null;
  /** Filename under public/well-probe (e.g. probe_graphic_01.png). */
  graphic?: string | null;
  /** When true, record depth-to for this probe/instrument type. */
  recordDepthTo?: boolean;
};

export const DEFAULT_WELL_PROBE_GRAPHIC = "probe_graphic_01.png";

/** Optional alias choices shown in Manage Well Probe Types. */
export const WELL_PROBE_TABLOGS_ALIAS_OPTIONS: ReadonlyArray<{
  value: string;
  label: string;
}> = [
  { value: "", label: "Select Tablogs alias" },
  { value: "soil-vapour", label: "Soil Vapour Probe" },
  { value: "water-level", label: "Water Level" },
  { value: "piezometer", label: "Piezometer" },
  { value: "temperature", label: "Temperature" },
  { value: "gas", label: "Gas Probe" },
  { value: "instrument", label: "Instrument" },
];

export const DEFAULT_WELL_PROBE_TYPE_OPTIONS: WellProbeTypeOption[] = [
  {
    id: "soil-vapour",
    name: "Soil Vapour Probe",
    tablogsAlias: "soil-vapour",
    graphic: DEFAULT_WELL_PROBE_GRAPHIC,
    recordDepthTo: true,
  },
];

/** Fallback catalog matching backend `public/well-probe` when the list API is unavailable. */
export const FALLBACK_WELL_PROBE_GRAPHICS: readonly string[] = [
  "probe_graphic_01.png",
  "probe_graphic_03.png",
  "probe_graphic_04.png",
  "probe_graphic_05.png",
  "probe_graphic_06.png",
  "probe_graphic_07.png",
  "probe_graphic_08.png",
  "probe_graphic_09.png",
  "probe_graphic_10.png",
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

export function normalizeWellProbeGraphicFilename(value: string | null | undefined): string {
  if (!value) return "";
  let trimmed = value.trim().replace(/\\/g, "/");
  if (!trimmed) return "";

  const slash = trimmed.lastIndexOf("/");
  if (slash >= 0) trimmed = trimmed.slice(slash + 1);

  // Tablogs keys like ProbeGraphic02 / probe_graphic_02 → probe_graphic_02.png
  const key = trimmed.match(/^(?:probe[_-]?graphic[_-]?)0*(\d+)$/i);
  if (key && !/\.(jpe?g|png|svg)$/i.test(trimmed)) {
    return `probe_graphic_${String(key[1]).padStart(2, "0")}.png`;
  }

  const withExt = trimmed.match(/^(?:probe[_-]?graphic[_-]?)0*(\d+)\.(jpe?g|png|svg)$/i);
  if (withExt) {
    return `probe_graphic_${String(withExt[1]).padStart(2, "0")}.png`;
  }

  return trimmed;
}

export function getWellProbeGraphicUrl(filename: string | null | undefined): string {
  const name = normalizeWellProbeGraphicFilename(filename);
  if (!name) return "";
  return `${WELL_PROBE_GRAPHICS_API_BASE}/files/${encodeURIComponent(name)}`;
}

export function wellProbeGraphicLabel(filename: string | null | undefined): string {
  const name = normalizeWellProbeGraphicFilename(filename);
  if (!name) return "Select Graphic";
  const match = name.match(/^probe_graphic_0*(\d+)\.(jpe?g|png|svg)$/i);
  if (!match) return name;
  return `ProbeGraphic${String(match[1]).padStart(2, "0")}`;
}

export function toWellProbeGraphicCatalogEntry(
  filename: string,
  label?: string
): WellProbeGraphicCatalogEntry {
  const normalized = normalizeWellProbeGraphicFilename(filename) || filename;
  return {
    filename: normalized,
    label: label?.trim() || wellProbeGraphicLabel(normalized),
    url: getWellProbeGraphicUrl(normalized),
  };
}

export function createBlankWellProbeTypeOption(
  partial?: Partial<WellProbeTypeOption>
): WellProbeTypeOption {
  return {
    id: partial?.id ?? "",
    name: partial?.name ?? "",
    tablogsAlias: partial?.tablogsAlias ?? null,
    graphic: partial?.graphic ?? DEFAULT_WELL_PROBE_GRAPHIC,
    recordDepthTo: partial?.recordDepthTo ?? true,
  };
}

export function parseWellProbeTypeOption(
  value: unknown,
  index: number
): WellProbeTypeOption | null {
  if (!isRecord(value)) return null;
  const name = typeof value.name === "string" ? value.name.trim() : "";
  if (!name) return null;

  const id =
    typeof value.id === "string" && value.id.trim()
      ? value.id.trim()
      : typeof value.id === "number"
        ? String(value.id)
        : `well-probe-type-${index + 1}`;

  const graphicRaw =
    asNullableString(value.graphic) ??
    asNullableString(value.wellProbeGraphic) ??
    asNullableString(value.well_probe_graphic);

  const recordDepthRaw =
    value.recordDepthTo ??
    value.record_depth_to ??
    value.depthRequired ??
    value.depth_required;

  return createBlankWellProbeTypeOption({
    id,
    name,
    tablogsAlias:
      asNullableString(value.tablogsAlias) ??
      asNullableString(value.tablogs_alias) ??
      asNullableString(value.alias),
    graphic: graphicRaw
      ? normalizeWellProbeGraphicFilename(graphicRaw) || graphicRaw
      : DEFAULT_WELL_PROBE_GRAPHIC,
    recordDepthTo:
      recordDepthRaw === undefined ? true : asBool(recordDepthRaw, true),
  });
}

export function parseWellProbeTypeOptions(
  value: unknown,
  fallback: readonly WellProbeTypeOption[] = DEFAULT_WELL_PROBE_TYPE_OPTIONS
): WellProbeTypeOption[] {
  if (!Array.isArray(value)) {
    return fallback.map((entry) => ({ ...entry }));
  }

  const options: WellProbeTypeOption[] = [];
  const seen = new Set<string>();

  for (const [index, entry] of value.entries()) {
    const parsed = parseWellProbeTypeOption(entry, index);
    if (!parsed) continue;
    const key = parsed.name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    options.push(parsed);
  }

  return options;
}

export function cloneWellProbeTypeOption(option: WellProbeTypeOption): WellProbeTypeOption {
  return { ...option };
}

export function toWellProbeTypeModuleNamedOption(option: WellProbeTypeOption): ModuleNamedOption {
  return {
    id: option.id,
    name: option.name,
    tablogsAlias: option.tablogsAlias ?? null,
    graphic: option.graphic ?? null,
    recordDepthTo: Boolean(option.recordDepthTo),
  };
}

export function createWellProbeTypeOption(
  id: string,
  name: string,
  partial?: Partial<WellProbeTypeOption>
): WellProbeTypeOption {
  return createBlankWellProbeTypeOption({ id, name, ...partial });
}
