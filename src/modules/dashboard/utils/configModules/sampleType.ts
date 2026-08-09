import { isRecord } from "./helpers";
import {
  getInsituTestTypeGraphicUrl,
  normalizeInsituGraphicFilename,
  type InsituTestTypeGraphicCatalogEntry,
  type InsituTestTypeGraphicKind,
} from "./insituTestType";
import type { ModuleNamedOption } from "./types";

/** Tablogs canonical sample-type aliases (from /api/sample-type/tablogs-aliases). */
export const SAMPLE_TYPE_TABLOGS_ALIAS_OPTIONS: ReadonlyArray<{ value: string; label: string }> = [
  { value: "", label: "Select a TabLogs canonical sample type" },
  { value: "Acid Sulfate", label: "Acid Sulfate" },
  { value: "ASS", label: "ASS" },
  { value: "Bag", label: "Bag" },
  { value: "Block Sample", label: "Block Sample" },
  { value: "Bulk Disturbed", label: "Bulk Disturbed" },
  { value: "CAL Sample", label: "CAL Sample" },
  { value: "Chemical Sample", label: "Chemical Sample" },
  { value: "Core", label: "Core" },
  { value: "Direct Push", label: "Direct Push" },
  { value: "Grab", label: "Grab" },
  { value: "Jar", label: "Jar" },
  { value: "Mazier Sample", label: "Mazier Sample" },
  { value: "Mazier Sample (M101)", label: "Mazier Sample (M101)" },
  { value: "Mod Cal Sample", label: "Mod Cal Sample" },
  { value: "Piston", label: "Piston" },
  { value: "Piston Sample", label: "Piston Sample" },
  { value: "Rock Sample", label: "Rock Sample" },
  { value: "Shelby", label: "Shelby" },
  { value: "Small Disturbed Sample", label: "Small Disturbed Sample" },
  { value: "Soil", label: "Soil" },
  { value: "SPT Liner Sample", label: "SPT Liner Sample" },
  { value: "SPT Sample", label: "SPT Sample" },
  { value: "U76 Undisturbed Sample", label: "U76 Undisturbed Sample" },
  { value: "Undisturbed Sample", label: "Undisturbed Sample" },
  { value: "Vial", label: "Vial" },
  { value: "Vibrocore Sample", label: "Vibrocore Sample" },
  { value: "Water Sample", label: "Water Sample" },
];

export const DEFAULT_SAMPLE_TYPE_GRAPHIC = "graphic_00.png";

export type SampleTypeOption = ModuleNamedOption & {
  /** Filename under insitu-test-type-pngs (e.g. graphic_03.png). */
  graphic?: string | null;
  tablogsAlias?: string | null;
  sampleAbbreviation?: string | null;
  noteRecovery?: boolean;
  displayQcId?: boolean;
  enableSegregatedGraphic?: boolean;
  topGraphic?: string | null;
  bottomGraphic?: string | null;
  enableSubsurfaceLogging?: boolean;
  enableAssignLabTest?: boolean;
  enableInsituTestLogging?: boolean;
  /** Default insitu-test type id created from this sample. */
  defaultInsituTestTypeId?: string | null;
};

export function getSampleTypeGraphicUrl(
  filename: string | null | undefined,
  kind: InsituTestTypeGraphicKind = "test"
): string {
  return getInsituTestTypeGraphicUrl(normalizeSampleGraphicFilename(filename, kind), kind);
}

export function normalizeSampleGraphicFilename(
  value: string | null | undefined,
  kind: InsituTestTypeGraphicKind = "test"
): string {
  if (!value) return "";
  let trimmed = value.trim().replace(/\\/g, "/");
  if (!trimmed) return "";

  const slash = trimmed.lastIndexOf("/");
  if (slash >= 0) trimmed = trimmed.slice(slash + 1);

  // Tablogs keys like sample_graphic_03 → graphic_03.png
  const sampleKey = trimmed.match(/^sample_graphic_(\d+)$/i);
  if (sampleKey) {
    return `graphic_${sampleKey[1]}.${kind === "test" ? "png" : "svg"}`;
  }

  return normalizeInsituGraphicFilename(trimmed, kind);
}

export function sampleGraphicLabel(
  filename: string | null | undefined,
  kind: InsituTestTypeGraphicKind = "test"
): string {
  const name = normalizeSampleGraphicFilename(filename, kind);
  if (!name) return "Select Graphic";
  const match = name.match(/^graphic_(\d+)\.(png|svg)$/i);
  const index = match?.[1] ?? name;
  if (kind === "test") return `sample_graphic_${index}`;
  if (match && match[1] === "00") return "no graphic";
  return match ? `graphic_${match[1]}` : name;
}

/** Remap catalog labels from testing_graphic_* → sample_graphic_* for the sample picker. */
export function toSampleTypeGraphicCatalog(
  entries: readonly InsituTestTypeGraphicCatalogEntry[]
): InsituTestTypeGraphicCatalogEntry[] {
  return entries.map((entry) => ({
    ...entry,
    label:
      entry.kind === "test"
        ? sampleGraphicLabel(entry.filename, "test")
        : sampleGraphicLabel(entry.filename, "top-bottom"),
  }));
}

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

export function createBlankSampleTypeOption(
  partial?: Partial<SampleTypeOption>
): SampleTypeOption {
  return {
    id: partial?.id ?? "",
    name: partial?.name ?? "",
    graphic: partial?.graphic ?? DEFAULT_SAMPLE_TYPE_GRAPHIC,
    tablogsAlias: partial?.tablogsAlias ?? null,
    sampleAbbreviation: partial?.sampleAbbreviation ?? null,
    noteRecovery: partial?.noteRecovery ?? false,
    displayQcId: partial?.displayQcId ?? false,
    enableSegregatedGraphic: partial?.enableSegregatedGraphic ?? false,
    topGraphic: partial?.topGraphic ?? null,
    bottomGraphic: partial?.bottomGraphic ?? null,
    enableSubsurfaceLogging: partial?.enableSubsurfaceLogging ?? false,
    enableAssignLabTest: partial?.enableAssignLabTest ?? false,
    enableInsituTestLogging: partial?.enableInsituTestLogging ?? false,
    defaultInsituTestTypeId: partial?.defaultInsituTestTypeId ?? null,
  };
}

export function parseSampleTypeOption(value: unknown, index: number): SampleTypeOption | null {
  if (!isRecord(value)) return null;
  const name = typeof value.name === "string" ? value.name.trim() : "";
  if (!name) return null;

  const id =
    typeof value.id === "string" && value.id.trim()
      ? value.id.trim()
      : typeof value.id === "number"
        ? String(value.id)
        : `sample-type-${index + 1}`;

  const graphicRaw =
    asNullableString(value.graphic) ??
    asNullableString(value.sampleGraphic) ??
    asNullableString(value.sample_graphic);

  const abbreviationRaw =
    asNullableString(value.sampleAbbreviation) ??
    asNullableString(value.sample_abbreviation) ??
    asNullableString(value.abbreviation);

  return createBlankSampleTypeOption({
    id,
    name,
    graphic: graphicRaw
      ? normalizeSampleGraphicFilename(graphicRaw, "test") || graphicRaw
      : DEFAULT_SAMPLE_TYPE_GRAPHIC,
    tablogsAlias:
      asNullableString(value.tablogsAlias) ?? asNullableString(value.tablogs_alias),
    sampleAbbreviation: abbreviationRaw,
    noteRecovery: asBool(value.noteRecovery) || asBool(value.note_recovery),
    displayQcId: asBool(value.displayQcId) || asBool(value.display_qc_id),
    enableSegregatedGraphic:
      asBool(value.enableSegregatedGraphic) ||
      asBool(value.enable_segregated_graphic) ||
      asBool(value.splitGraphic) ||
      asBool(value.split_graphic),
    topGraphic: (() => {
      const raw = asNullableString(value.topGraphic) ?? asNullableString(value.top_graphic);
      return raw ? normalizeSampleGraphicFilename(raw, "top-bottom") || raw : null;
    })(),
    bottomGraphic: (() => {
      const raw =
        asNullableString(value.bottomGraphic) ?? asNullableString(value.bottom_graphic);
      return raw ? normalizeSampleGraphicFilename(raw, "top-bottom") || raw : null;
    })(),
    enableSubsurfaceLogging:
      asBool(value.enableSubsurfaceLogging) ||
      asBool(value.enable_subsurface_logging) ||
      asBool(value.enable_subsurface),
    enableAssignLabTest:
      asBool(value.enableAssignLabTest) || asBool(value.enable_assign_lab_test),
    enableInsituTestLogging:
      asBool(value.enableInsituTestLogging) ||
      asBool(value.enable_insitu_test_logging) ||
      asBool(value.enableInsitu) ||
      asBool(value.enable_insitu),
    defaultInsituTestTypeId:
      asNullableString(value.defaultInsituTestTypeId) ??
      asNullableString(value.default_insitu_test_type_id) ??
      asNullableString(value.situTestId) ??
      (typeof value.situ_test_id === "number" ? String(value.situ_test_id) : null) ??
      asNullableString(value.situ_test_id),
  });
}

export function parseSampleTypeOptions(
  value: unknown,
  fallback: readonly SampleTypeOption[] = []
): SampleTypeOption[] {
  if (!Array.isArray(value)) {
    return fallback.map((entry) => ({ ...entry }));
  }

  const options: SampleTypeOption[] = [];
  const seen = new Set<string>();

  for (const [index, entry] of value.entries()) {
    const parsed = parseSampleTypeOption(entry, index);
    if (!parsed) continue;
    const key = parsed.name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    options.push(parsed);
  }

  return options;
}

export function cloneSampleTypeOption(option: SampleTypeOption): SampleTypeOption {
  return { ...option };
}

export function toSampleTypeModuleNamedOption(option: SampleTypeOption): ModuleNamedOption {
  return {
    id: option.id,
    name: option.name,
    graphic: option.graphic,
    tablogsAlias: option.tablogsAlias,
    abbreviation: option.sampleAbbreviation,
    sampleAbbreviation: option.sampleAbbreviation,
    noteRecovery: option.noteRecovery,
    displayQcId: option.displayQcId,
    enableSegregatedGraphic: option.enableSegregatedGraphic,
    topGraphic: option.topGraphic,
    bottomGraphic: option.bottomGraphic,
    enableSubsurfaceLogging: option.enableSubsurfaceLogging,
    enableAssignLabTest: option.enableAssignLabTest,
    enableInsituTestLogging: option.enableInsituTestLogging,
    defaultInsituTestTypeId: option.defaultInsituTestTypeId,
    splitGraphic: option.enableSegregatedGraphic,
  };
}

/** Default sample types aligned with Tablogs sample-type list. */
export const DEFAULT_SAMPLE_TYPE_OPTIONS: SampleTypeOption[] = [
  createBlankSampleTypeOption({
    id: "spt-sample",
    name: "SPT Sample",
    graphic: "graphic_03.png",
  }),
  createBlankSampleTypeOption({
    id: "bulk-disturbed",
    name: "Bulk Disturbed",
    graphic: "graphic_02.png",
  }),
  createBlankSampleTypeOption({
    id: "grab-sample",
    name: "Grab Sample",
    graphic: "graphic_02.png",
  }),
  createBlankSampleTypeOption({
    id: "soil-sample",
    name: "Soil Sample",
    graphic: "graphic_00.png",
  }),
  createBlankSampleTypeOption({
    id: "u50",
    name: "U50",
    graphic: "graphic_08.png",
  }),
  createBlankSampleTypeOption({
    id: "u75",
    name: "U75",
    graphic: "graphic_08.png",
  }),
  createBlankSampleTypeOption({
    id: "acid-sulfate",
    name: "Acid Sulfate",
    graphic: "graphic_01.png",
  }),
  createBlankSampleTypeOption({
    id: "mod-cal-sample",
    name: "Mod Cal Sample",
    graphic: "graphic_05.png",
  }),
];
