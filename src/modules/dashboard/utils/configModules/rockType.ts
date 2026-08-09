import defaultRockTypeOptionsJson from "../../data/defaultRockTypeOptions.json";
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

export const ROCK_GROUPS = ["Sedimentary", "Igneous", "Metamorphic"] as const;
export type RockGroupValue = (typeof ROCK_GROUPS)[number];

export type RockTypeOption = ModuleNamedOption & {
  code?: string | null;
  rockGroup?: string | null;
  graphic?: string | null;
};

export type RockTypeGraphicCatalogEntry = OriginGraphicCatalogEntry;

/** Shared soil/rock graphic catalog (Tablogs big_soil_or_rock_type). */
export const ROCK_TYPE_GRAPHICS_CATALOG: readonly RockTypeGraphicCatalogEntry[] =
  ORIGIN_GRAPHICS_CATALOG;

export function getRockTypeGraphicUrl(graphic: string | null | undefined): string {
  const filename = getClassificationGraphicFilename(graphic ?? "");
  if (!filename) return "";
  return `${CLASSIFICATION_GRAPHICS_PUBLIC_BASE}/${encodeURIComponent(filename)}`;
}

export function getRockTypeGraphicLabel(graphic: string | null | undefined): string {
  const filename = getClassificationGraphicFilename(graphic ?? "");
  if (!filename || filename === "no_graphic.png") return "";
  const match = ROCK_TYPE_GRAPHICS_CATALOG.find((entry) => entry.filename === filename);
  return match?.label ?? filename;
}

export function createBlankRockTypeOption(partial?: Partial<RockTypeOption>): RockTypeOption {
  return {
    id: partial?.id ?? "",
    name: partial?.name ?? "",
    code: partial?.code ?? "",
    rockGroup: partial?.rockGroup ?? null,
    graphic: partial?.graphic ?? null,
  };
}

function asNullableString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

export function parseRockTypeOption(value: unknown, index: number): RockTypeOption | null {
  if (!isRecord(value)) return null;
  const name = typeof value.name === "string" ? value.name.trim() : "";
  if (!name) return null;

  const id =
    typeof value.id === "string" && value.id.trim()
      ? value.id.trim()
      : typeof value.id === "number"
        ? String(value.id)
        : `rock-type-${index + 1}`;

  const graphicRaw = asNullableString(value.graphic);
  const rockGroup =
    asNullableString(value.rockGroup) ?? asNullableString(value.rock_group);

  return {
    id,
    name,
    code: asNullableString(value.code) ?? "",
    rockGroup,
    graphic: graphicRaw ? getClassificationGraphicFilename(graphicRaw) || graphicRaw : null,
  };
}

export function parseRockTypeOptions(
  value: unknown,
  fallback: readonly RockTypeOption[] = []
): RockTypeOption[] {
  if (!Array.isArray(value)) {
    return fallback.map((entry) => ({ ...entry }));
  }

  const options: RockTypeOption[] = [];
  const seen = new Set<string>();

  for (const [index, entry] of value.entries()) {
    const parsed = parseRockTypeOption(entry, index);
    if (!parsed) continue;
    const key = parsed.name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    options.push(parsed);
  }

  return options;
}

export function cloneRockTypeOption(option: RockTypeOption): RockTypeOption {
  return { ...option };
}

export function toRockTypeModuleNamedOption(option: RockTypeOption): ModuleNamedOption {
  return {
    id: option.id,
    name: option.name,
    code: option.code ?? null,
    rockGroup: option.rockGroup ?? null,
    graphic: option.graphic ?? null,
  };
}

export const DEFAULT_ROCK_TYPE_OPTIONS: RockTypeOption[] = (
  defaultRockTypeOptionsJson as RockTypeOption[]
).map((entry) => cloneRockTypeOption(entry));
