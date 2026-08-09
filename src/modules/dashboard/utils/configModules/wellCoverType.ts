import { isRecord } from "./helpers";
import type { ModuleNamedOption } from "./types";

/** API-proxied paths into backend `public/well-cover` folder. */
export const WELL_COVER_GRAPHICS_API_BASE = "/api/v1/well-cover-graphics";

export type WellCoverGraphicCatalogEntry = {
  filename: string;
  label: string;
  url: string;
};

export const WELL_COVER_GRAPHIC_ALIGNMENTS = ["top", "bottom"] as const;
export type WellCoverGraphicAlignment = (typeof WELL_COVER_GRAPHIC_ALIGNMENTS)[number];

export type WellCoverTypeOption = ModuleNamedOption & {
  /** Optional Tablogs alias key for import/export mapping. */
  tablogsAlias?: string | null;
  /** Filename under public/well-cover (e.g. well_cover_1.png). */
  graphic?: string | null;
  /** When true, well logs may use depths above ground (negative). */
  allowNegativeDepth?: boolean;
  /** Whether the cover graphic is aligned to the top or bottom of the column. */
  graphicAlignment?: WellCoverGraphicAlignment;
};

export const DEFAULT_WELL_COVER_GRAPHIC = "well_cover_1.png";
export const DEFAULT_WELL_COVER_GRAPHIC_ALIGNMENT: WellCoverGraphicAlignment = "bottom";

const KNOWN_WELL_COVER_GRAPHIC_LABELS: Record<string, string> = {
  well_cover_1: "WellCover1",
  new_well_cover_2: "WellCover2",
  new_well_cover_3: "WellCover3",
  well_cover_4: "WellCover4",
  well_cover_5: "WellCover5",
  well_cover_6: "WellCover6",
};

/** Optional alias choices shown in Manage Well Cover Types. */
export const WELL_COVER_TABLOGS_ALIAS_OPTIONS: ReadonlyArray<{
  value: string;
  label: string;
}> = [
  { value: "", label: "Select Tablogs alias" },
  { value: "rounded", label: "Rounded" },
  { value: "flat", label: "Flat" },
  { value: "flush", label: "Flush" },
  { value: "monument", label: "Monument" },
];

export const DEFAULT_WELL_COVER_TYPE_OPTIONS: WellCoverTypeOption[] = [
  {
    id: "rounded",
    name: "Rounded",
    tablogsAlias: "rounded",
    graphic: "well_cover_1.png",
    allowNegativeDepth: false,
    graphicAlignment: "bottom",
  },
  {
    id: "flat",
    name: "Flat",
    tablogsAlias: "flat",
    graphic: "well_cover_4.png",
    allowNegativeDepth: false,
    graphicAlignment: "bottom",
  },
];

/** Fallback catalog matching backend `public/well-cover` when the list API is unavailable. */
export const FALLBACK_WELL_COVER_GRAPHICS: readonly string[] = [
  "well_cover_1.png",
  "new_well_cover_2.png",
  "new_well_cover_3.png",
  "well_cover_4.png",
  "well_cover_6.png",
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

export function normalizeWellCoverGraphicAlignment(
  value: unknown,
  fallback: WellCoverGraphicAlignment = DEFAULT_WELL_COVER_GRAPHIC_ALIGNMENT
): WellCoverGraphicAlignment {
  if (typeof value !== "string") return fallback;
  const normalized = value.trim().toLowerCase();
  return normalized === "top" ? "top" : normalized === "bottom" ? "bottom" : fallback;
}

export function normalizeWellCoverGraphicFilename(value: string | null | undefined): string {
  if (!value) return "";
  let trimmed = value.trim().replace(/\\/g, "/");
  if (!trimmed) return "";

  const slash = trimmed.lastIndexOf("/");
  if (slash >= 0) trimmed = trimmed.slice(slash + 1);

  return trimmed;
}

export function getWellCoverGraphicUrl(filename: string | null | undefined): string {
  const name = normalizeWellCoverGraphicFilename(filename);
  if (!name) return "";
  return `${WELL_COVER_GRAPHICS_API_BASE}/files/${encodeURIComponent(name)}`;
}

export function wellCoverGraphicLabel(filename: string | null | undefined): string {
  const name = normalizeWellCoverGraphicFilename(filename);
  if (!name) return "Select Graphic";
  const base = name.replace(/\.(jpe?g|png|svg)$/i, "");
  return KNOWN_WELL_COVER_GRAPHIC_LABELS[base.toLowerCase()] ?? base;
}

export function toWellCoverGraphicCatalogEntry(
  filename: string,
  label?: string
): WellCoverGraphicCatalogEntry {
  const normalized = normalizeWellCoverGraphicFilename(filename) || filename;
  return {
    filename: normalized,
    label: label?.trim() || wellCoverGraphicLabel(normalized),
    url: getWellCoverGraphicUrl(normalized),
  };
}

export function createBlankWellCoverTypeOption(
  partial?: Partial<WellCoverTypeOption>
): WellCoverTypeOption {
  return {
    id: partial?.id ?? "",
    name: partial?.name ?? "",
    tablogsAlias: partial?.tablogsAlias ?? null,
    graphic: partial?.graphic ?? DEFAULT_WELL_COVER_GRAPHIC,
    allowNegativeDepth: Boolean(partial?.allowNegativeDepth),
    graphicAlignment: normalizeWellCoverGraphicAlignment(
      partial?.graphicAlignment,
      DEFAULT_WELL_COVER_GRAPHIC_ALIGNMENT
    ),
  };
}

export function parseWellCoverTypeOption(
  value: unknown,
  index: number
): WellCoverTypeOption | null {
  if (!isRecord(value)) return null;
  const name = typeof value.name === "string" ? value.name.trim() : "";
  if (!name) return null;

  const id =
    typeof value.id === "string" && value.id.trim()
      ? value.id.trim()
      : typeof value.id === "number"
        ? String(value.id)
        : `well-cover-${index + 1}`;

  const graphicRaw =
    asNullableString(value.graphic) ?? asNullableString(value.wellCoverGraphic);

  return createBlankWellCoverTypeOption({
    id,
    name,
    tablogsAlias:
      asNullableString(value.tablogsAlias) ??
      asNullableString(value.tablogs_alias) ??
      asNullableString(value.alias),
    graphic: graphicRaw
      ? normalizeWellCoverGraphicFilename(graphicRaw) || graphicRaw
      : DEFAULT_WELL_COVER_GRAPHIC,
    allowNegativeDepth: asBool(
      value.allowNegativeDepth ?? value.allow_negative_depth ?? value.negativeDepth,
      false
    ),
    graphicAlignment: normalizeWellCoverGraphicAlignment(
      value.graphicAlignment ?? value.graphic_alignment ?? value.alignment
    ),
  });
}

export function parseWellCoverTypeOptions(
  value: unknown,
  fallback: readonly WellCoverTypeOption[] = DEFAULT_WELL_COVER_TYPE_OPTIONS
): WellCoverTypeOption[] {
  if (!Array.isArray(value)) {
    return fallback.map((entry) => ({ ...entry }));
  }

  const options: WellCoverTypeOption[] = [];
  const seen = new Set<string>();

  for (const [index, entry] of value.entries()) {
    const parsed = parseWellCoverTypeOption(entry, index);
    if (!parsed) continue;
    const key = parsed.name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    options.push(parsed);
  }

  return options;
}

export function cloneWellCoverTypeOption(option: WellCoverTypeOption): WellCoverTypeOption {
  return { ...option };
}

export function toWellCoverTypeModuleNamedOption(
  option: WellCoverTypeOption
): ModuleNamedOption {
  return {
    id: option.id,
    name: option.name,
    tablogsAlias: option.tablogsAlias ?? null,
    graphic: option.graphic ?? null,
    allowNegativeDepth: Boolean(option.allowNegativeDepth),
    graphicAlignment: normalizeWellCoverGraphicAlignment(option.graphicAlignment),
  };
}

export function createWellCoverTypeOption(
  id: string,
  name: string,
  partial?: Partial<WellCoverTypeOption>
): WellCoverTypeOption {
  return createBlankWellCoverTypeOption({ id, name, ...partial });
}
