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

export type CoreDefectTypeOption = ModuleNamedOption & {
  code?: string | null;
  graphic?: string | null;
  /** Default sample type created / linked when logging this defect (optional). */
  defaultSampleTypeId?: string | null;
};

export type CoreDefectTypeGraphicCatalogEntry = OriginGraphicCatalogEntry;

/** Shared soil/rock graphic catalog (served from backend `/classification-graphics`). */
export const CORE_DEFECT_TYPE_GRAPHICS_CATALOG: readonly CoreDefectTypeGraphicCatalogEntry[] =
  ORIGIN_GRAPHICS_CATALOG;

export function getCoreDefectTypeGraphicUrl(graphic: string | null | undefined): string {
  const filename = getClassificationGraphicFilename(graphic ?? "");
  if (!filename) {
    return `${CLASSIFICATION_GRAPHICS_PUBLIC_BASE}/${encodeURIComponent("no_graphic.png")}`;
  }
  return `${CLASSIFICATION_GRAPHICS_PUBLIC_BASE}/${encodeURIComponent(filename)}`;
}

export function getCoreDefectTypeGraphicLabel(graphic: string | null | undefined): string {
  const filename = getClassificationGraphicFilename(graphic ?? "");
  if (!filename || filename === "no_graphic.png") return "No graphic";
  const match = CORE_DEFECT_TYPE_GRAPHICS_CATALOG.find((entry) => entry.filename === filename);
  return match?.label ?? filename;
}

export function createBlankCoreDefectTypeOption(
  partial?: Partial<CoreDefectTypeOption>
): CoreDefectTypeOption {
  return {
    id: partial?.id ?? "",
    name: partial?.name ?? "",
    code: partial?.code ?? "",
    graphic: partial?.graphic ?? null,
    defaultSampleTypeId: partial?.defaultSampleTypeId ?? null,
  };
}

function asNullableString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

export function parseCoreDefectTypeOption(
  value: unknown,
  index: number
): CoreDefectTypeOption | null {
  if (!isRecord(value)) return null;
  const name = typeof value.name === "string" ? value.name.trim() : "";
  if (!name) return null;

  const id =
    typeof value.id === "string" && value.id.trim()
      ? value.id.trim()
      : typeof value.id === "number"
        ? String(value.id)
        : `core-defect-type-${index + 1}`;

  const graphicRaw = asNullableString(value.graphic);
  const defaultSampleTypeId =
    asNullableString(value.defaultSampleTypeId) ??
    asNullableString(value.default_sample_type_id);

  return {
    id,
    name,
    code: asNullableString(value.code) ?? "",
    graphic: graphicRaw ? getClassificationGraphicFilename(graphicRaw) || graphicRaw : null,
    defaultSampleTypeId,
  };
}

export function parseCoreDefectTypeOptions(
  value: unknown,
  fallback: readonly CoreDefectTypeOption[] = []
): CoreDefectTypeOption[] {
  if (!Array.isArray(value)) {
    return fallback.map((entry) => ({ ...entry }));
  }

  const options: CoreDefectTypeOption[] = [];
  const seen = new Set<string>();

  for (const [index, entry] of value.entries()) {
    const parsed = parseCoreDefectTypeOption(entry, index);
    if (!parsed) continue;
    const key = parsed.name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    options.push(parsed);
  }

  return options;
}

export function cloneCoreDefectTypeOption(option: CoreDefectTypeOption): CoreDefectTypeOption {
  return { ...option };
}

export function toCoreDefectTypeModuleNamedOption(
  option: CoreDefectTypeOption
): ModuleNamedOption {
  return {
    id: option.id,
    name: option.name,
    code: option.code ?? null,
    graphic: option.graphic ?? null,
    defaultSampleTypeId: option.defaultSampleTypeId ?? null,
  };
}

export const DEFAULT_CORE_DEFECT_TYPE_OPTIONS: CoreDefectTypeOption[] = [
  createBlankCoreDefectTypeOption({ id: "joint", name: "Joint", code: "J" }),
  createBlankCoreDefectTypeOption({
    id: "core-loss",
    name: "Core Loss",
    code: "CL",
    graphic: "coreloss.png",
  }),
  createBlankCoreDefectTypeOption({ id: "sheared-zone", name: "Sheared Zone", code: "SZ" }),
  createBlankCoreDefectTypeOption({ id: "sheared-seam", name: "Sheared Seam", code: "SS" }),
  createBlankCoreDefectTypeOption({ id: "crushed-seam", name: "Crushed Seam", code: "CS" }),
  createBlankCoreDefectTypeOption({ id: "infilled-seam", name: "Infilled Seam", code: "IS" }),
  createBlankCoreDefectTypeOption({
    id: "ex-weathered-seam",
    name: "EX Weathered Seam",
    code: "EWS",
  }),
  createBlankCoreDefectTypeOption({ id: "parting", name: "Parting", code: "P" }),
  createBlankCoreDefectTypeOption({ id: "joint-set", name: "Joint set", code: "JS" }),
  createBlankCoreDefectTypeOption({ id: "sheared", name: "Sheared", code: "SH" }),
];
