import defaultOriginOptionsJson from "../../data/defaultOriginOptions.json";
import originGraphicsCatalogJson from "../../data/originGraphicsCatalog.json";
import { CLASSIFICATION_GRAPHICS_PUBLIC_BASE, getClassificationGraphicFilename } from "./classification";
import { isRecord } from "./helpers";
import type { ModuleNamedOption } from "./types";

export const ORIGIN_TYPES = ["Soil", "Rock", "Non-Soil"] as const;
export type OriginTypeValue = (typeof ORIGIN_TYPES)[number];

/** Map legacy Tablogs "Pavement" origin type onto Non-Soil. */
export function normalizeOriginType(value: string | null | undefined): string {
  const trimmed = value?.trim() || "Soil";
  if (trimmed.toLowerCase() === "pavement") return "Non-Soil";
  return trimmed;
}

export type OriginOption = ModuleNamedOption & {
  nameInDescription?: string;
  codeInDescription?: string | null;
  classificationCodeOverride?: boolean;
  /** Soil / Rock / Non-Soil — used as workflow option group */
  type?: OriginTypeValue | string;
  color?: string | null;
  applyColorToPdf?: boolean;
  overrideGraphic?: boolean;
  splitGraphic?: boolean;
  graphic?: string | null;
};

export type OriginGraphicCatalogEntry = {
  filename: string;
  label: string;
  code: string;
};

export const ORIGIN_GRAPHICS_CATALOG: readonly OriginGraphicCatalogEntry[] =
  originGraphicsCatalogJson as OriginGraphicCatalogEntry[];

export function getOriginGraphicUrl(graphic: string | null | undefined): string {
  const filename = getClassificationGraphicFilename(graphic ?? "");
  if (!filename) return "";
  return `${CLASSIFICATION_GRAPHICS_PUBLIC_BASE}/${encodeURIComponent(filename)}`;
}

export function createBlankOriginOption(partial?: Partial<OriginOption>): OriginOption {
  return {
    id: partial?.id ?? "",
    name: partial?.name ?? "",
    nameInDescription: partial?.nameInDescription ?? "",
    codeInDescription: partial?.codeInDescription ?? null,
    classificationCodeOverride: partial?.classificationCodeOverride ?? false,
    type: normalizeOriginType(partial?.type ?? "Soil"),
    color: partial?.color ?? "rgba(238,43,43,1)",
    applyColorToPdf: partial?.applyColorToPdf ?? false,
    overrideGraphic: partial?.overrideGraphic ?? false,
    splitGraphic: partial?.splitGraphic ?? false,
    graphic: partial?.graphic ?? null,
  };
}

function asBool(value: unknown): boolean {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value !== 0;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    return normalized === "1" || normalized === "true" || normalized === "yes";
  }
  return false;
}

function asNullableString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

export function parseOriginOption(value: unknown, index: number): OriginOption | null {
  if (!isRecord(value)) return null;
  const name = typeof value.name === "string" ? value.name.trim() : "";
  if (!name) return null;

  const id =
    typeof value.id === "string" && value.id.trim()
      ? value.id.trim()
      : typeof value.id === "number"
        ? String(value.id)
        : `origin-${index + 1}`;

  const nameInDescription =
    typeof value.nameInDescription === "string"
      ? value.nameInDescription.trim()
      : typeof value.name_in_description === "string"
        ? value.name_in_description.trim()
        : name;

  const codeInDescription =
    asNullableString(value.codeInDescription) ?? asNullableString(value.code_in_description);

  const typeRaw =
    (typeof value.type === "string" && value.type.trim()) ||
    (typeof value.group === "string" && value.group.trim()) ||
    "Soil";

  const color =
    asNullableString(value.color) ??
    asNullableString(value.origin_graphic_overlay_color) ??
    asNullableString(value.originGraphicOverlayColor);

  const graphic =
    asNullableString(value.graphic) ??
    (typeof value.graphic === "string" ? value.graphic.trim() || null : null);

  return {
    id,
    name,
    nameInDescription: nameInDescription || name,
    codeInDescription,
    classificationCodeOverride:
      asBool(value.classificationCodeOverride) || asBool(value.classification_code_override),
    type: normalizeOriginType(typeRaw),
    color,
    applyColorToPdf:
      asBool(value.applyColorToPdf) || asBool(value.apply_origin_graphic_colour_to_pdf),
    overrideGraphic: asBool(value.overrideGraphic) || asBool(value.override_graphic),
    splitGraphic: asBool(value.splitGraphic) || asBool(value.split_graphic),
    graphic: graphic ? getClassificationGraphicFilename(graphic) || graphic : null,
  };
}

export function parseOriginOptions(
  value: unknown,
  fallback: readonly OriginOption[] = []
): OriginOption[] {
  if (!Array.isArray(value)) {
    return fallback.map((entry) => ({ ...entry }));
  }

  const options: OriginOption[] = [];
  const seen = new Set<string>();

  for (const [index, entry] of value.entries()) {
    const parsed = parseOriginOption(entry, index);
    if (!parsed) continue;
    const key = parsed.name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    options.push(parsed);
  }

  // Prefer the provided list as-is (including empty). Do not re-seed from bundled defaults.
  return options;
}

export function cloneOriginOption(option: OriginOption): OriginOption {
  return { ...option };
}

export function toModuleNamedOption(option: OriginOption): ModuleNamedOption {
  return {
    id: option.id,
    name: option.name,
    nameInDescription: option.nameInDescription,
    codeInDescription: option.codeInDescription,
    classificationCodeOverride: option.classificationCodeOverride,
    type: option.type,
    color: option.color,
    applyColorToPdf: option.applyColorToPdf,
    overrideGraphic: option.overrideGraphic,
    splitGraphic: option.splitGraphic,
    graphic: option.graphic,
  };
}

export const DEFAULT_ORIGIN_OPTIONS: OriginOption[] = (
  defaultOriginOptionsJson as OriginOption[]
).map((entry) => cloneOriginOption(entry));
