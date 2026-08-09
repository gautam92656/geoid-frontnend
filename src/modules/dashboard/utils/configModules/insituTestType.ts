import { isRecord } from "./helpers";
import type { ModuleNamedOption } from "./types";
import insituTestTypeOptionsDefaults from "./data/insituTestTypeOptionsDefaults.json";

/** API-proxied paths into backend `public/insitu-test-type-*` folders. */
export const INSITU_TEST_TYPE_GRAPHICS_API_BASE = "/api/v1/insitu-test-type-graphics";

export type InsituTestTypeGraphicKind = "test" | "top-bottom";

export type InsituTestTypeGraphicCatalogEntry = {
  filename: string;
  label: string;
  kind: InsituTestTypeGraphicKind;
  url: string;
};

export type InsituTestIntervalParam = {
  name?: string | null;
  active: boolean;
  interval?: number | null;
  value?: string | number | null;
  metricName?: string | null;
  imperialName?: string | null;
};

export type InsituTestOtherSetting = {
  name: string;
  description?: string | null;
  enabled?: boolean;
  value?: string | number | null;
  params?: InsituTestIntervalParam[];
  defaultInterval?: number | null;
  density?: unknown[];
  consistency?: unknown[];
};

export type InsituTestUnitSettingField = {
  unit?: string | null;
  column?: string | null;
  unitType?: string | null;
  dataField?: string | null;
  displayName?: string | null;
};

export type InsituTestTypeSettings = {
  otherSettings: InsituTestOtherSetting[];
  unitSettings?: InsituTestUnitSettingField[];
  order?: number | null;
};

export type InsituTestTypeOption = ModuleNamedOption & {
  /** When false, shown under Inactive Test Types. Defaults to true. */
  active?: boolean;
  /** Filename under insitu-test-type-pngs (e.g. graphic_00.png). */
  graphic?: string | null;
  /** Use segregated top/bottom graphics instead of a single test graphic. */
  enableSegregatedGraphic?: boolean;
  topGraphic?: string | null;
  bottomGraphic?: string | null;
  depthFrequencyEnabled?: boolean;
  depthFrequency?: string | null;
  enableSampleLogging?: boolean;
  enableSubsurfaceLogging?: boolean;
  defaultSampleTypeId?: string | null;
  enableAutoSampleDescription?: boolean;
  /** Per-test settings from Tablogs (intervals, toggles, unit fields). */
  settings?: InsituTestTypeSettings;
};

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

function asNullableNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function asSettingValue(value: unknown): string | number | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") return value;
  return null;
}

function parseIntervalParam(value: unknown): InsituTestIntervalParam | null {
  if (!isRecord(value)) return null;
  return {
    name: asNullableString(value.name),
    active: value.active === undefined ? true : asBool(value.active, true),
    interval: value.interval === undefined ? null : asNullableNumber(value.interval),
    value: asSettingValue(value.value),
    metricName:
      asNullableString(value.metricName) ?? asNullableString(value.metric_name),
    imperialName:
      asNullableString(value.imperialName) ?? asNullableString(value.imperial_name),
  };
}

function parseOtherSetting(value: unknown): InsituTestOtherSetting | null {
  if (!isRecord(value)) return null;
  const name = typeof value.name === "string" ? value.name.trim() : "";
  if (!name) return null;

  const setting: InsituTestOtherSetting = { name };
  const description = asNullableString(value.description);
  if (description !== null || value.description === null) {
    setting.description = description;
  }
  if (value.enabled !== undefined) {
    setting.enabled = asBool(value.enabled, false);
  }
  if (value.value !== undefined) {
    setting.value = asSettingValue(value.value);
  }
  if (Array.isArray(value.params)) {
    setting.params = value.params
      .map(parseIntervalParam)
      .filter((entry): entry is InsituTestIntervalParam => entry !== null);
  }
  if (value.defaultInterval !== undefined || value.default_interval !== undefined) {
    setting.defaultInterval =
      asNullableNumber(value.defaultInterval) ??
      asNullableNumber(value.default_interval);
  }
  if (Array.isArray(value.density)) setting.density = value.density;
  if (Array.isArray(value.consistency)) setting.consistency = value.consistency;
  return setting;
}

function parseUnitSettingField(value: unknown): InsituTestUnitSettingField | null {
  if (!isRecord(value)) return null;
  return {
    unit: asNullableString(value.unit),
    column: asNullableString(value.column),
    unitType: asNullableString(value.unitType) ?? asNullableString(value.unit_type),
    dataField: asNullableString(value.dataField) ?? asNullableString(value.data_field),
    displayName:
      asNullableString(value.displayName) ?? asNullableString(value.display_name),
  };
}

export function createBlankInsituTestTypeSettings(): InsituTestTypeSettings {
  return { otherSettings: [] };
}

export function parseInsituTestTypeSettings(value: unknown): InsituTestTypeSettings {
  if (!isRecord(value)) return createBlankInsituTestTypeSettings();

  const otherRaw = value.otherSettings ?? value.other_settings;
  const unitRaw = value.unitSettings ?? value.unit_settings;
  const settings: InsituTestTypeSettings = {
    otherSettings: Array.isArray(otherRaw)
      ? otherRaw
          .map(parseOtherSetting)
          .filter((entry): entry is InsituTestOtherSetting => entry !== null)
      : [],
  };

  if (Array.isArray(unitRaw)) {
    settings.unitSettings = unitRaw
      .map(parseUnitSettingField)
      .filter((entry): entry is InsituTestUnitSettingField => entry !== null);
  }

  if (value.order !== undefined) {
    settings.order = asNullableNumber(value.order);
  }

  return settings;
}

export function cloneInsituTestTypeSettings(
  settings: InsituTestTypeSettings | null | undefined
): InsituTestTypeSettings {
  return parseInsituTestTypeSettings(
    settings ? JSON.parse(JSON.stringify(settings)) : createBlankInsituTestTypeSettings()
  );
}

export function intervalParamLabel(param: InsituTestIntervalParam): string {
  if (param.metricName?.trim()) return param.metricName.trim();
  if (param.name?.trim()) return param.name.trim();
  if (param.imperialName?.trim()) return param.imperialName.trim();
  if (param.interval != null) return String(param.interval);
  if (param.value != null && String(param.value).trim()) return String(param.value);
  return "Interval";
}

export function getInsituTestTypeGraphicUrl(
  filename: string | null | undefined,
  kind: InsituTestTypeGraphicKind = "test"
): string {
  const name = normalizeInsituGraphicFilename(filename, kind);
  if (!name) return "";
  return `${INSITU_TEST_TYPE_GRAPHICS_API_BASE}/files/${kind}/${encodeURIComponent(name)}`;
}

export function normalizeInsituGraphicFilename(
  value: string | null | undefined,
  kind: InsituTestTypeGraphicKind = "test"
): string {
  if (!value) return "";
  let trimmed = value.trim().replace(/\\/g, "/");
  if (!trimmed) return "";

  const slash = trimmed.lastIndexOf("/");
  if (slash >= 0) trimmed = trimmed.slice(slash + 1);

  // Tablogs keys like testing_graphic_00 → graphic_00.png
  const testingKey = trimmed.match(/^testing_graphic_(\d+)$/i);
  if (testingKey) {
    return `graphic_${testingKey[1]}.${kind === "test" ? "png" : "svg"}`;
  }

  const topBottomKey = trimmed.match(/^(?:top_bottom_graphic_|graphic_)(\d+)$/i);
  if (topBottomKey && !/\.(png|svg)$/i.test(trimmed)) {
    return `graphic_${topBottomKey[1]}.${kind === "test" ? "png" : "svg"}`;
  }

  return trimmed;
}

export function insituGraphicLabel(
  filename: string | null | undefined,
  kind: InsituTestTypeGraphicKind = "test"
): string {
  const name = normalizeInsituGraphicFilename(filename, kind);
  if (!name) return "Select Graphic";
  const match = name.match(/^graphic_(\d+)\.(png|svg)$/i);
  const index = match?.[1] ?? name;
  if (kind === "test") return `testing_graphic_${index}`;
  // Match Tablogs top/bottom picker labels (graphic_00 → "no graphic").
  if (match && match[1] === "00") return "no graphic";
  return match ? `graphic_${match[1]}` : name;
}

export function createBlankInsituTestTypeOption(
  partial?: Partial<InsituTestTypeOption>
): InsituTestTypeOption {
  return {
    id: partial?.id ?? "",
    name: partial?.name ?? "",
    active: partial?.active ?? true,
    graphic: partial?.graphic ?? "graphic_00.png",
    enableSegregatedGraphic: partial?.enableSegregatedGraphic ?? false,
    topGraphic: partial?.topGraphic ?? null,
    bottomGraphic: partial?.bottomGraphic ?? null,
    depthFrequencyEnabled: partial?.depthFrequencyEnabled ?? false,
    depthFrequency: partial?.depthFrequency ?? null,
    enableSampleLogging: partial?.enableSampleLogging ?? false,
    enableSubsurfaceLogging: partial?.enableSubsurfaceLogging ?? false,
    defaultSampleTypeId: partial?.defaultSampleTypeId ?? null,
    enableAutoSampleDescription: partial?.enableAutoSampleDescription ?? false,
    settings: cloneInsituTestTypeSettings(
      partial?.settings ?? createBlankInsituTestTypeSettings()
    ),
  };
}

export function parseInsituTestTypeOption(
  value: unknown,
  index: number
): InsituTestTypeOption | null {
  if (!isRecord(value)) return null;
  const name = typeof value.name === "string" ? value.name.trim() : "";
  if (!name) return null;

  const id =
    typeof value.id === "string" && value.id.trim()
      ? value.id.trim()
      : typeof value.id === "number"
        ? String(value.id)
        : `testing-type-${index + 1}`;

  const graphicRaw =
    asNullableString(value.graphic) ??
    asNullableString(value.testingGraphic) ??
    asNullableString(value.testing_graphic);

  return createBlankInsituTestTypeOption({
    id,
    name,
    active:
      value.active !== undefined
        ? asBool(value.active, true)
        : value.is_active !== undefined
          ? asBool(value.is_active, true)
          : true,
    graphic: graphicRaw
      ? normalizeInsituGraphicFilename(graphicRaw, "test") || graphicRaw
      : "graphic_00.png",
    enableSegregatedGraphic:
      asBool(value.enableSegregatedGraphic) ||
      asBool(value.enable_segregated_graphic) ||
      asBool(value.splitGraphic) ||
      asBool(value.split_graphic),
    topGraphic: (() => {
      const raw = asNullableString(value.topGraphic) ?? asNullableString(value.top_graphic);
      return raw ? normalizeInsituGraphicFilename(raw, "top-bottom") || raw : null;
    })(),
    bottomGraphic: (() => {
      const raw =
        asNullableString(value.bottomGraphic) ?? asNullableString(value.bottom_graphic);
      return raw ? normalizeInsituGraphicFilename(raw, "top-bottom") || raw : null;
    })(),
    depthFrequencyEnabled:
      asBool(value.depthFrequencyEnabled) ||
      asBool(value.depth_frequency_enabled) ||
      asBool(value.is_depth_frequency_enabled),
    depthFrequency:
      asNullableString(value.depthFrequency) ?? asNullableString(value.depth_frequency),
    enableSampleLogging:
      asBool(value.enableSampleLogging) ||
      asBool(value.enable_sample_logging) ||
      asBool(value.is_sample_logging_enabled),
    enableSubsurfaceLogging:
      asBool(value.enableSubsurfaceLogging) ||
      asBool(value.enable_subsurface_logging) ||
      asBool(value.is_subsurface_logging_enabled),
    defaultSampleTypeId:
      asNullableString(value.defaultSampleTypeId) ??
      asNullableString(value.default_sample_type_id) ??
      asNullableString(value.sample_type_name) ??
      (typeof value.sample_type === "number" ? String(value.sample_type) : null) ??
      asNullableString(value.sample_type),
    enableAutoSampleDescription:
      asBool(value.enableAutoSampleDescription) ||
      asBool(value.enable_auto_sample_description) ||
      asBool(value.is_auto_sample),
    settings: parseInsituTestTypeSettings(value.settings),
  });
}

export function parseInsituTestTypeOptions(
  value: unknown,
  fallback: readonly InsituTestTypeOption[] = []
): InsituTestTypeOption[] {
  if (!Array.isArray(value)) {
    return fallback.map((entry) => cloneInsituTestTypeOption(entry));
  }

  const options: InsituTestTypeOption[] = [];
  const seen = new Set<string>();

  for (const [index, entry] of value.entries()) {
    const parsed = parseInsituTestTypeOption(entry, index);
    if (!parsed) continue;
    const key = parsed.name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    options.push(parsed);
  }

  return options;
}

export function getDefaultInsituTestTypeOptions(): InsituTestTypeOption[] {
  return parseInsituTestTypeOptions(insituTestTypeOptionsDefaults);
}

export function cloneInsituTestTypeOption(option: InsituTestTypeOption): InsituTestTypeOption {
  return createBlankInsituTestTypeOption({
    ...option,
    settings: cloneInsituTestTypeSettings(option.settings),
  });
}

export function toInsituTestTypeModuleNamedOption(
  option: InsituTestTypeOption
): ModuleNamedOption {
  return {
    id: option.id,
    name: option.name,
    active: option.active,
    graphic: option.graphic,
    enableSegregatedGraphic: option.enableSegregatedGraphic,
    topGraphic: option.topGraphic,
    bottomGraphic: option.bottomGraphic,
    depthFrequencyEnabled: option.depthFrequencyEnabled,
    depthFrequency: option.depthFrequency,
    enableSampleLogging: option.enableSampleLogging,
    enableSubsurfaceLogging: option.enableSubsurfaceLogging,
    defaultSampleTypeId: option.defaultSampleTypeId,
    enableAutoSampleDescription: option.enableAutoSampleDescription,
    splitGraphic: option.enableSegregatedGraphic,
    settings: cloneInsituTestTypeSettings(option.settings),
  };
}
