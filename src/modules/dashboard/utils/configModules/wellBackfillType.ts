import { isRecord } from "./helpers";
import type { ModuleNamedOption } from "./types";

/** API-proxied paths into backend `public/well-backfill` folder. */
export const WELL_BACKFILL_GRAPHICS_API_BASE = "/api/v1/well-backfill-graphics";

export type WellBackfillGraphicCatalogEntry = {
  filename: string;
  label: string;
  url: string;
};

export type WellBackfillTypeOption = ModuleNamedOption & {
  /** Optional Tablogs alias key for import/export mapping. */
  tablogsAlias?: string | null;
  /** Filename under public/well-backfill (e.g. 01.png). */
  graphic?: string | null;
  /** When true, well backfills may use depths above ground (negative). */
  allowNegativeDepth?: boolean;
};

export const DEFAULT_WELL_BACKFILL_GRAPHIC = "01.png";

/** Optional alias choices shown in Manage Well Backfill Types. */
export const WELL_BACKFILL_TABLOGS_ALIAS_OPTIONS: ReadonlyArray<{
  value: string;
  label: string;
}> = [
  { value: "", label: "Select Tablogs alias" },
  { value: "Blank", label: "Blank" },
  { value: "Backfill", label: "Backfill" },
  { value: "Bentonite", label: "Bentonite" },
  { value: "Filter Pack", label: "Filter Pack" },
  { value: "Concrete Cement", label: "Concrete Cement" },
  { value: "Concrete Cement Grout", label: "Concrete Cement Grout" },
  { value: "Sand", label: "Sand" },
];

export const DEFAULT_WELL_BACKFILL_TYPE_OPTIONS: WellBackfillTypeOption[] = [
  {
    id: "blank",
    name: "Blank",
    tablogsAlias: null,
    graphic: "01.png",
  },
  {
    id: "backfill",
    name: "Backfill",
    tablogsAlias: null,
    graphic: "10.png",
  },
  {
    id: "bentonite",
    name: "Bentonite",
    tablogsAlias: null,
    graphic: "21.png",
  },
  {
    id: "filter-pack",
    name: "Filter Pack",
    tablogsAlias: null,
    graphic: "31.png",
  },
  {
    id: "concrete-cement",
    name: "Concrete Cement",
    tablogsAlias: null,
    graphic: "41.png",
  },
  {
    id: "concrete-cement-grout",
    name: "Concrete Cement Grout",
    tablogsAlias: null,
    graphic: "42.png",
  },
];

/** Fallback catalog matching backend `public/well-backfill` when the list API is unavailable. */
export const FALLBACK_WELL_BACKFILL_GRAPHICS: readonly string[] = [
  "01.png",
  "10.png",
  "21.png",
  "22.png",
  "23.png",
  "31.png",
  "41.png",
  "42.png",
  "43.png",
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

export function normalizeWellBackfillGraphicFilename(
  value: string | null | undefined
): string {
  if (!value) return "";
  let trimmed = value.trim().replace(/\\/g, "/");
  if (!trimmed) return "";

  const slash = trimmed.lastIndexOf("/");
  if (slash >= 0) trimmed = trimmed.slice(slash + 1);

  // Tablogs keys like 1 / 01 / BackfillGraphic01 → 01.png
  const bareDigits = trimmed.match(/^0*(\d+)$/);
  if (bareDigits) {
    return `${String(bareDigits[1]).padStart(2, "0")}.png`;
  }

  const graphicLabel = trimmed.match(/^backfillgraphic0*(\d+)$/i);
  if (graphicLabel) {
    return `${String(graphicLabel[1]).padStart(2, "0")}.png`;
  }

  const withExt = trimmed.match(/^0*(\d+)\.(jpe?g|png|svg)$/i);
  if (withExt) {
    return `${String(withExt[1]).padStart(2, "0")}.${withExt[2].toLowerCase()}`;
  }

  return trimmed;
}

export function getWellBackfillGraphicUrl(filename: string | null | undefined): string {
  const name = normalizeWellBackfillGraphicFilename(filename);
  if (!name) return "";
  return `${WELL_BACKFILL_GRAPHICS_API_BASE}/files/${encodeURIComponent(name)}`;
}

export function wellBackfillGraphicLabel(filename: string | null | undefined): string {
  const name = normalizeWellBackfillGraphicFilename(filename);
  if (!name) return "Select Graphic";
  const match = name.match(/^0*(\d+)\.(jpe?g|png|svg)$/i);
  if (!match) return name;
  return `BackfillGraphic${String(match[1]).padStart(2, "0")}`;
}

export function toWellBackfillGraphicCatalogEntry(
  filename: string,
  label?: string
): WellBackfillGraphicCatalogEntry {
  const normalized = normalizeWellBackfillGraphicFilename(filename) || filename;
  return {
    filename: normalized,
    label: label?.trim() || wellBackfillGraphicLabel(normalized),
    url: getWellBackfillGraphicUrl(normalized),
  };
}

export function createBlankWellBackfillTypeOption(
  partial?: Partial<WellBackfillTypeOption>
): WellBackfillTypeOption {
  return {
    id: partial?.id ?? "",
    name: partial?.name ?? "",
    tablogsAlias: partial?.tablogsAlias ?? null,
    graphic: partial?.graphic ?? DEFAULT_WELL_BACKFILL_GRAPHIC,
    allowNegativeDepth: Boolean(partial?.allowNegativeDepth),
  };
}

export function parseWellBackfillTypeOption(
  value: unknown,
  index: number
): WellBackfillTypeOption | null {
  if (!isRecord(value)) return null;
  const name = typeof value.name === "string" ? value.name.trim() : "";
  if (!name) return null;

  const id =
    typeof value.id === "string" && value.id.trim()
      ? value.id.trim()
      : typeof value.id === "number"
        ? String(value.id)
        : `well-backfill-type-${index + 1}`;

  const graphicRaw =
    asNullableString(value.graphic) ??
    asNullableString(value.backfillGraphic) ??
    asNullableString(value.backfill_graphic);

  return createBlankWellBackfillTypeOption({
    id,
    name,
    tablogsAlias:
      asNullableString(value.tablogsAlias) ??
      asNullableString(value.tablogs_alias) ??
      asNullableString(value.alias),
    graphic: graphicRaw
      ? normalizeWellBackfillGraphicFilename(graphicRaw) || graphicRaw
      : DEFAULT_WELL_BACKFILL_GRAPHIC,
    allowNegativeDepth: asBool(
      value.allowNegativeDepth ?? value.allow_negative_depth ?? value.negativeDepth,
      false
    ),
  });
}

export function parseWellBackfillTypeOptions(
  value: unknown,
  fallback: readonly WellBackfillTypeOption[] = DEFAULT_WELL_BACKFILL_TYPE_OPTIONS
): WellBackfillTypeOption[] {
  if (!Array.isArray(value)) {
    return fallback.map((entry) => ({ ...entry }));
  }

  const options: WellBackfillTypeOption[] = [];
  const seen = new Set<string>();

  for (const [index, entry] of value.entries()) {
    const parsed = parseWellBackfillTypeOption(entry, index);
    if (!parsed) continue;
    const key = parsed.name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    options.push(parsed);
  }

  return options;
}

export function cloneWellBackfillTypeOption(
  option: WellBackfillTypeOption
): WellBackfillTypeOption {
  return { ...option };
}

export function toWellBackfillTypeModuleNamedOption(
  option: WellBackfillTypeOption
): ModuleNamedOption {
  return {
    id: option.id,
    name: option.name,
    tablogsAlias: option.tablogsAlias ?? null,
    graphic: option.graphic ?? null,
    allowNegativeDepth: Boolean(option.allowNegativeDepth),
  };
}

export function createWellBackfillTypeOption(
  id: string,
  name: string,
  partial?: Partial<WellBackfillTypeOption>
): WellBackfillTypeOption {
  return createBlankWellBackfillTypeOption({ id, name, ...partial });
}
