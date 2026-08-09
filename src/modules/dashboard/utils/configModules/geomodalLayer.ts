import defaultGeomodalLayerOptionsJson from "../../data/defaultGeomodalLayerOptions.json";
import {
  CLASSIFICATION_GRAPHICS_PUBLIC_BASE,
  getClassificationGraphicFilename,
} from "./classification";
import { isRecord } from "./helpers";
import {
  ORIGIN_GRAPHICS_CATALOG,
  type OriginGraphicCatalogEntry,
} from "./origin";
import type { ModuleNamedOption } from "./types";

export type GeomodalLayerOption = ModuleNamedOption & {
  /** Graphic / fill color (rgba or hex). */
  color?: string | null;
  /** Graphic overlay color (rgba or hex). */
  overlayColor?: string | null;
  graphic?: string | null;
};

export type GeomodalLayerGraphicCatalogEntry = OriginGraphicCatalogEntry;

/** Shared soil/rock graphic catalog (Tablogs big_soil_or_rock_type). */
export const GEOMODAL_LAYER_GRAPHICS_CATALOG: readonly GeomodalLayerGraphicCatalogEntry[] =
  ORIGIN_GRAPHICS_CATALOG;

export function getGeomodalLayerGraphicUrl(graphic: string | null | undefined): string {
  const filename = getClassificationGraphicFilename(graphic ?? "");
  if (!filename) {
    return `${CLASSIFICATION_GRAPHICS_PUBLIC_BASE}/${encodeURIComponent("no_graphic.png")}`;
  }
  return `${CLASSIFICATION_GRAPHICS_PUBLIC_BASE}/${encodeURIComponent(filename)}`;
}

export function getGeomodalLayerGraphicLabel(graphic: string | null | undefined): string {
  const filename = getClassificationGraphicFilename(graphic ?? "");
  if (!filename || filename === "no_graphic.png") return "No graphic";
  const match = GEOMODAL_LAYER_GRAPHICS_CATALOG.find((entry) => entry.filename === filename);
  return match?.label ?? filename;
}

export function createBlankGeomodalLayerOption(
  partial?: Partial<GeomodalLayerOption>
): GeomodalLayerOption {
  return {
    id: partial?.id ?? "",
    name: partial?.name ?? "",
    color: partial?.color ?? null,
    overlayColor: partial?.overlayColor ?? null,
    graphic: partial?.graphic ?? null,
  };
}

function asNullableString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

export function parseGeomodalLayerOption(
  value: unknown,
  index: number
): GeomodalLayerOption | null {
  if (!isRecord(value)) return null;
  const name = typeof value.name === "string" ? value.name.trim() : "";
  if (!name) return null;

  const id =
    typeof value.id === "string" && value.id.trim()
      ? value.id.trim()
      : typeof value.id === "number"
        ? String(value.id)
        : `geomodal-layer-${index + 1}`;

  const graphicRaw = asNullableString(value.graphic);
  const color =
    asNullableString(value.color) ??
    asNullableString(value.fillColor) ??
    asNullableString(value.fill_color) ??
    asNullableString(value.graphicColor) ??
    asNullableString(value.graphic_color);
  const overlayColor =
    asNullableString(value.overlayColor) ??
    asNullableString(value.overlay_color) ??
    asNullableString(value.graphicOverlayColor) ??
    asNullableString(value.graphic_overlay_color) ??
    asNullableString(value.graphicColorOverlay) ??
    asNullableString(value.graphic_color_overlay);

  return {
    id,
    name,
    color,
    overlayColor,
    graphic: graphicRaw ? getClassificationGraphicFilename(graphicRaw) || graphicRaw : null,
  };
}

export function parseGeomodalLayerOptions(
  value: unknown,
  fallback: readonly GeomodalLayerOption[] = []
): GeomodalLayerOption[] {
  if (!Array.isArray(value)) {
    return fallback.map((entry) => ({ ...entry }));
  }

  const options: GeomodalLayerOption[] = [];
  const seen = new Set<string>();

  for (const [index, entry] of value.entries()) {
    const parsed = parseGeomodalLayerOption(entry, index);
    if (!parsed) continue;
    const key = parsed.name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    options.push(parsed);
  }

  return options;
}

export function cloneGeomodalLayerOption(option: GeomodalLayerOption): GeomodalLayerOption {
  return { ...option };
}

export function toGeomodalLayerModuleNamedOption(
  option: GeomodalLayerOption
): ModuleNamedOption {
  return {
    id: option.id,
    name: option.name,
    color: option.color ?? null,
    overlayColor: option.overlayColor ?? null,
    graphic: option.graphic ?? null,
  };
}

export const DEFAULT_GEOMODAL_LAYER_OPTIONS: GeomodalLayerOption[] = (
  defaultGeomodalLayerOptionsJson as GeomodalLayerOption[]
).map((entry) => cloneGeomodalLayerOption(entry));
