import { isRecord } from "./helpers";
import type { ModuleNamedOption } from "./types";

/**
 * Image URLs are served from Next `public/drilling` (copied from backend
 * `geoid_backend/public/drilling`). The list API discovers filenames from that
 * backend folder dynamically.
 */
export const DRILLING_GRAPHICS_PUBLIC_BASE = "/drilling";
export const DRILLING_GRAPHICS_API_BASE = "/api/v1/drilling-graphics";

export type DrillingLogKind = "bore" | "core";

export type DrillingGraphicCatalogEntry = {
  filename: string;
  label: string;
  url: string;
};

export type DrillingTypeOption = ModuleNamedOption & {
  /** Optional Tablogs alias key for import/export mapping. */
  tablogsAlias?: string | null;
  /** Whether this type applies to bore logs, core logs, or both contexts. */
  logKind?: DrillingLogKind;
  /** Filename under public/drilling (e.g. graphic01.jpg). */
  graphic?: string | null;
  enableRecoveryField?: boolean;
  enableWindowedWindowless?: boolean;
  waterAdded?: boolean;
};

/** Optional alias choices shown in Manage Drilling Types. */
export const DRILLING_TABLOGS_ALIAS_OPTIONS: ReadonlyArray<{ value: string; label: string }> = [
  { value: "", label: "Select Tablogs alias" },
  { value: "auger", label: "Auger" },
  { value: "washbore", label: "Washbore" },
  { value: "coring", label: "Coring" },
  { value: "nmlc-coring", label: "NMLC Coring" },
  { value: "hq-coring", label: "HQ Coring" },
  { value: "direct-push", label: "Direct Push" },
  { value: "rotary", label: "Rotary" },
  { value: "sonic", label: "Sonic" },
  { value: "cable-tool", label: "Cable Tool" },
];

export const DEFAULT_DRILLING_GRAPHIC = "graphic01.jpg";

export function normalizeDrillingGraphicFilename(
  value: string | null | undefined
): string {
  if (!value) return "";
  let trimmed = value.trim().replace(/\\/g, "/");
  if (!trimmed) return "";

  const slash = trimmed.lastIndexOf("/");
  if (slash >= 0) trimmed = trimmed.slice(slash + 1);

  // Tablogs keys like DrillingMethodGraphic01 / graphic01 → graphic01.jpg
  const methodKey = trimmed.match(/^(?:drillingmethod)?graphic0*(\d+)$/i);
  if (methodKey && !/\.(jpe?g|png|svg)$/i.test(trimmed)) {
    return `graphic${String(methodKey[1]).padStart(2, "0")}.jpg`;
  }

  return trimmed;
}

export function drillingGraphicLabel(filename: string | null | undefined): string {
  const name = normalizeDrillingGraphicFilename(filename);
  if (!name) return "Select Graphic";
  const match = name.match(/^graphic0*(\d+)\.(jpe?g|png|svg)$/i);
  if (!match) return name;
  return `DrillingMethodGraphic${String(match[1]).padStart(2, "0")}`;
}

export function getDrillingGraphicUrl(filename: string | null | undefined): string {
  const name = normalizeDrillingGraphicFilename(filename);
  if (!name) return "";
  return `${DRILLING_GRAPHICS_PUBLIC_BASE}/${encodeURIComponent(name)}`;
}

export function toDrillingGraphicCatalogEntry(
  filename: string,
  label?: string
): DrillingGraphicCatalogEntry {
  const normalized = normalizeDrillingGraphicFilename(filename) || filename;
  return {
    filename: normalized,
    label: label?.trim() || drillingGraphicLabel(normalized),
    url: getDrillingGraphicUrl(normalized),
  };
}

/** Fallback catalog matching backend `public/drilling` when the list API is unavailable. */
export const FALLBACK_DRILLING_GRAPHICS: readonly DrillingGraphicCatalogEntry[] = [
  "graphic01.jpg",
  "graphic02.jpg",
  "graphic03.jpg",
  "graphic04.jpg",
  "graphic05.jpg",
  "graphic06.jpg",
  "graphic07.jpg",
  "graphic08.jpg",
  "graphic09.jpg",
  "graphic10.jpg",
  "graphic11.jpg",
].map((filename) => toDrillingGraphicCatalogEntry(filename));

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

function parseLogKind(value: unknown): DrillingLogKind {
  if (typeof value !== "string") return "bore";
  const normalized = value.trim().toLowerCase();
  if (normalized === "core" || normalized === "core-log" || normalized === "core_log") {
    return "core";
  }
  return "bore";
}

export function createBlankDrillingTypeOption(
  partial?: Partial<DrillingTypeOption>
): DrillingTypeOption {
  return {
    id: partial?.id ?? "",
    name: partial?.name ?? "",
    tablogsAlias: partial?.tablogsAlias ?? null,
    logKind: partial?.logKind ?? "bore",
    graphic: partial?.graphic ?? DEFAULT_DRILLING_GRAPHIC,
    enableRecoveryField: partial?.enableRecoveryField ?? false,
    enableWindowedWindowless: partial?.enableWindowedWindowless ?? false,
    waterAdded: partial?.waterAdded ?? false,
  };
}

export function parseDrillingTypeOption(
  value: unknown,
  index: number
): DrillingTypeOption | null {
  if (!isRecord(value)) return null;
  const name = typeof value.name === "string" ? value.name.trim() : "";
  if (!name) return null;

  const id =
    typeof value.id === "string" && value.id.trim()
      ? value.id.trim()
      : typeof value.id === "number"
        ? String(value.id)
        : `drilling-type-${index + 1}`;

  const graphicRaw =
    asNullableString(value.graphic) ??
    asNullableString(value.drillingGraphic) ??
    asNullableString(value.drilling_graphic);

  return createBlankDrillingTypeOption({
    id,
    name,
    tablogsAlias:
      asNullableString(value.tablogsAlias) ??
      asNullableString(value.tablogs_alias) ??
      asNullableString(value.alias),
    logKind: parseLogKind(
      value.logKind ?? value.log_kind ?? value.boreCoreLog ?? value.bore_core_log
    ),
    graphic: graphicRaw
      ? normalizeDrillingGraphicFilename(graphicRaw) || graphicRaw
      : DEFAULT_DRILLING_GRAPHIC,
    enableRecoveryField:
      asBool(value.enableRecoveryField) ||
      asBool(value.enable_recovery_field) ||
      asBool(value.recovery),
    enableWindowedWindowless:
      asBool(value.enableWindowedWindowless) ||
      asBool(value.enable_windowed_windowless) ||
      asBool(value.windowedWindowless) ||
      asBool(value.windowed_windowless),
    waterAdded: asBool(value.waterAdded) || asBool(value.water_added),
  });
}

export function parseDrillingTypeOptions(
  value: unknown,
  fallback: readonly DrillingTypeOption[] = []
): DrillingTypeOption[] {
  if (!Array.isArray(value)) {
    return fallback.map((entry) => ({ ...entry }));
  }

  const options: DrillingTypeOption[] = [];
  const seen = new Set<string>();

  for (const [index, entry] of value.entries()) {
    const parsed = parseDrillingTypeOption(entry, index);
    if (!parsed) continue;
    const key = parsed.name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    options.push(parsed);
  }

  return options;
}

export function cloneDrillingTypeOption(option: DrillingTypeOption): DrillingTypeOption {
  return { ...option };
}

export function toDrillingTypeModuleNamedOption(
  option: DrillingTypeOption
): ModuleNamedOption {
  return {
    id: option.id,
    name: option.name,
    tablogsAlias: option.tablogsAlias,
    logKind: option.logKind,
    graphic: option.graphic,
    enableRecoveryField: option.enableRecoveryField,
    enableWindowedWindowless: option.enableWindowedWindowless,
    waterAdded: option.waterAdded,
  };
}

export function createDrillingTypeOption(
  id: string,
  name: string,
  partial?: Partial<DrillingTypeOption>
): DrillingTypeOption {
  return createBlankDrillingTypeOption({ id, name, ...partial });
}
