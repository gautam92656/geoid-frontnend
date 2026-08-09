import { isRecord } from "./helpers";
import type { ModuleNamedOption } from "./types";

/** API-proxied paths into backend `public/well-type` folder. */
export const WELL_TYPE_GRAPHICS_API_BASE = "/api/v1/well-type-graphics";

export type WellTypeGraphicCatalogEntry = {
  filename: string;
  label: string;
  url: string;
};

export type WellTypeOption = ModuleNamedOption & {
  /** Optional Tablogs alias key for import/export mapping. */
  tablogsAlias?: string | null;
  /** Filename under public/well-type (e.g. solidBlack.png). */
  graphic?: string | null;
  /** When true, well logs may use depths above ground (negative). */
  allowNegativeDepth?: boolean;
};

export const DEFAULT_WELL_TYPE_GRAPHIC = "solidBlack.png";

const KNOWN_WELL_TYPE_GRAPHIC_LABELS: Record<string, string> = {
  solid: "SolidPipe",
  solidblack: "SolidPipe",
  slotted: "Slotted",
  perforatedwellpipe: "PerforatedWellPipe",
  smallperforatedwellpipe: "SmallPerforatedWellPipe",
};

/** Optional alias choices shown in Manage Well Types. */
export const WELL_TYPE_TABLOGS_ALIAS_OPTIONS: ReadonlyArray<{
  value: string;
  label: string;
}> = [
  { value: "", label: "Select Tablogs alias" },
  { value: "solid", label: "Solid" },
  { value: "slotted", label: "Slotted" },
  { value: "perforated", label: "Perforated" },
  { value: "screen", label: "Screen" },
  { value: "blank", label: "Blank" },
];

export const DEFAULT_WELL_TYPE_OPTIONS: WellTypeOption[] = [
  {
    id: "pvc-solid",
    name: "50mm PVC Solid",
    tablogsAlias: "solid",
    graphic: "solidBlack.png",
    allowNegativeDepth: false,
  },
  {
    id: "pvc-slotted",
    name: "50mm PVC Slotted",
    tablogsAlias: "slotted",
    graphic: "slotted.png",
    allowNegativeDepth: false,
  },
];

/** Fallback catalog matching backend `public/well-type` when the list API is unavailable. */
export const FALLBACK_WELL_TYPE_GRAPHICS: readonly string[] = [
  "PerforatedWellPipe.png",
  "slotted.png",
  "SmallPerforatedWellPipe.png",
  "solidBlack.png",
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

export function normalizeWellTypeGraphicFilename(value: string | null | undefined): string {
  if (!value) return "";
  let trimmed = value.trim().replace(/\\/g, "/");
  if (!trimmed) return "";

  const slash = trimmed.lastIndexOf("/");
  if (slash >= 0) trimmed = trimmed.slice(slash + 1);

  // Legacy Tablogs solid.png → solidBlack.png in our public folder.
  if (/^solid\.(jpe?g|png|svg)$/i.test(trimmed)) {
    return DEFAULT_WELL_TYPE_GRAPHIC;
  }

  return trimmed;
}

export function getWellTypeGraphicUrl(filename: string | null | undefined): string {
  const name = normalizeWellTypeGraphicFilename(filename);
  if (!name) return "";
  return `${WELL_TYPE_GRAPHICS_API_BASE}/files/${encodeURIComponent(name)}`;
}

export function wellTypeGraphicLabel(filename: string | null | undefined): string {
  const name = normalizeWellTypeGraphicFilename(filename);
  if (!name) return "Select Graphic";
  const base = name.replace(/\.(jpe?g|png|svg)$/i, "");
  return KNOWN_WELL_TYPE_GRAPHIC_LABELS[base.toLowerCase()] ?? base;
}

export function toWellTypeGraphicCatalogEntry(
  filename: string,
  label?: string
): WellTypeGraphicCatalogEntry {
  const normalized = normalizeWellTypeGraphicFilename(filename) || filename;
  return {
    filename: normalized,
    label: label?.trim() || wellTypeGraphicLabel(normalized),
    url: getWellTypeGraphicUrl(normalized),
  };
}

export function createBlankWellTypeOption(partial?: Partial<WellTypeOption>): WellTypeOption {
  return {
    id: partial?.id ?? "",
    name: partial?.name ?? "",
    tablogsAlias: partial?.tablogsAlias ?? null,
    graphic: partial?.graphic ?? DEFAULT_WELL_TYPE_GRAPHIC,
    allowNegativeDepth: Boolean(partial?.allowNegativeDepth),
  };
}

export function parseWellTypeOption(value: unknown, index: number): WellTypeOption | null {
  if (!isRecord(value)) return null;
  const name = typeof value.name === "string" ? value.name.trim() : "";
  if (!name) return null;

  const id =
    typeof value.id === "string" && value.id.trim()
      ? value.id.trim()
      : typeof value.id === "number"
        ? String(value.id)
        : `well-type-${index + 1}`;

  const graphicRaw =
    asNullableString(value.graphic) ?? asNullableString(value.wellGraphic);

  return createBlankWellTypeOption({
    id,
    name,
    tablogsAlias:
      asNullableString(value.tablogsAlias) ??
      asNullableString(value.tablogs_alias) ??
      asNullableString(value.alias),
    graphic: graphicRaw
      ? normalizeWellTypeGraphicFilename(graphicRaw) || graphicRaw
      : DEFAULT_WELL_TYPE_GRAPHIC,
    allowNegativeDepth: asBool(
      value.allowNegativeDepth ?? value.allow_negative_depth ?? value.negativeDepth,
      false
    ),
  });
}

export function parseWellTypeOptions(
  value: unknown,
  fallback: readonly WellTypeOption[] = DEFAULT_WELL_TYPE_OPTIONS
): WellTypeOption[] {
  if (!Array.isArray(value)) {
    return fallback.map((entry) => ({ ...entry }));
  }

  const options: WellTypeOption[] = [];
  const seen = new Set<string>();

  for (const [index, entry] of value.entries()) {
    const parsed = parseWellTypeOption(entry, index);
    if (!parsed) continue;
    const key = parsed.name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    options.push(parsed);
  }

  return options;
}

export function cloneWellTypeOption(option: WellTypeOption): WellTypeOption {
  return { ...option };
}

export function toWellTypeModuleNamedOption(option: WellTypeOption): ModuleNamedOption {
  return {
    id: option.id,
    name: option.name,
    tablogsAlias: option.tablogsAlias ?? null,
    graphic: option.graphic ?? null,
    allowNegativeDepth: Boolean(option.allowNegativeDepth),
  };
}

export function createWellTypeOption(
  id: string,
  name: string,
  partial?: Partial<WellTypeOption>
): WellTypeOption {
  return createBlankWellTypeOption({ id, name, ...partial });
}
