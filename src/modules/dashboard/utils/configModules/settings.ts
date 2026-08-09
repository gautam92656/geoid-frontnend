import {
  MODULE_DISPLAY_NAME_MAX_LENGTH,
  MODULE_OPTION_NAME_MAX_LENGTH,
  MODULE_OPTIONS_MAX_COUNT,
  type ConfigModuleSettings,
  type ModuleGeneralSettings,
  type ModuleNamedOption,
  type StoredModuleSettings,
} from "./types";
import { isRecord } from "./helpers";
import {
  DEFAULT_DATA_TYPE_OPTIONS,
  DEFAULT_MODULE_DISPLAY_NAMES,
  MODULE_DATA_TYPES,
  getModuleSettingsSpec,
} from "./registry";
import { parseWorkflowSettings } from "./workflow";
import { cloneClassificationCode } from "./classification";
import { LOG_REMARKS_MODULE_ID } from "./modules/log-remarks";

/** Option catalogs persisted in dedicated DB collections (API), not bundled JSON. */
const DB_BACKED_DATA_TYPE_IDS = new Set([
  "origin",
  "rock_type",
  "non_soil_type",
  "rock_texture",
  "finish-reasons",
  "finish-texts",
  "geomodal_layer",
  "colors",
  "core-defect-types",
  "aperture-colors",
  "aperture-minerals",
  "infill-materials",
  "remark-types",
  "remarks-quick-notes",
  "drilling-types",
  "drilling-resistances",
  "drilling-observations",
  "drilling-casings",
  "water-observation-types",
  "well-types",
  "well-casing-types",
  "well-casing-tops",
  "well-cover-types",
  "well-probe-types",
  "well-backfill-types",
  "default-well-ids",
  "sample-types",
  "lab-test-types",
  "lab-test-presets",
]);

export function isDbBackedDataTypeId(dataTypeId: string): boolean {
  return DB_BACKED_DATA_TYPE_IDS.has(dataTypeId);
}

function editableDataTypeIds(moduleId: string): string[] {
  return (MODULE_DATA_TYPES[moduleId] ?? [])
    .filter((entry) => entry.editable)
    .map((entry) => entry.id);
}

export function createOptionId(prefix = "option"): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function createRemarkTypeId(): string {
  return createOptionId("remark-type");
}

function parseNamedOption(value: unknown, index: number): ModuleNamedOption | null {
  if (!isRecord(value)) return null;
  const name = typeof value.name === "string" ? value.name.trim() : "";
  if (!name || name.length > MODULE_OPTION_NAME_MAX_LENGTH) return null;
  const id =
    typeof value.id === "string" && value.id.trim()
      ? value.id.trim()
      : typeof value.id === "number"
        ? String(value.id)
        : `option-${index + 1}`;

  const option: ModuleNamedOption = { id, name };

  if (typeof value.nameInDescription === "string") {
    option.nameInDescription = value.nameInDescription.trim();
  } else if (typeof value.name_in_description === "string") {
    option.nameInDescription = value.name_in_description.trim();
  }

  if (typeof value.codeInDescription === "string") {
    option.codeInDescription = value.codeInDescription.trim() || null;
  } else if (typeof value.code_in_description === "string") {
    option.codeInDescription = value.code_in_description.trim() || null;
  } else if (value.codeInDescription === null || value.code_in_description === null) {
    option.codeInDescription = null;
  }

  if (typeof value.code === "string") {
    option.code = value.code.trim() || null;
  } else if (value.code === null) {
    option.code = null;
  }

  if (typeof value.rockGroup === "string") {
    option.rockGroup = value.rockGroup.trim() || null;
  } else if (typeof value.rock_group === "string") {
    option.rockGroup = value.rock_group.trim() || null;
  } else if (value.rockGroup === null || value.rock_group === null) {
    option.rockGroup = null;
  }

  if (typeof value.classificationCodeOverride === "boolean") {
    option.classificationCodeOverride = value.classificationCodeOverride;
  } else if (typeof value.classification_code_override === "boolean") {
    option.classificationCodeOverride = value.classification_code_override;
  } else if (typeof value.classification_code_override === "number") {
    option.classificationCodeOverride = value.classification_code_override !== 0;
  }

  if (typeof value.type === "string" && value.type.trim()) {
    option.type = value.type.trim();
  } else if (typeof value.group === "string" && value.group.trim()) {
    option.type = value.group.trim();
  }

  if (typeof value.color === "string") {
    option.color = value.color.trim() || null;
  } else if (typeof value.origin_graphic_overlay_color === "string") {
    option.color = value.origin_graphic_overlay_color.trim() || null;
  } else if (value.color === null) {
    option.color = null;
  }

  if (typeof value.overlayColor === "string") {
    option.overlayColor = value.overlayColor.trim() || null;
  } else if (typeof value.overlay_color === "string") {
    option.overlayColor = value.overlay_color.trim() || null;
  } else if (typeof value.graphicOverlayColor === "string") {
    option.overlayColor = value.graphicOverlayColor.trim() || null;
  } else if (typeof value.graphic_overlay_color === "string") {
    option.overlayColor = value.graphic_overlay_color.trim() || null;
  } else if (typeof value.graphicColorOverlay === "string") {
    option.overlayColor = value.graphicColorOverlay.trim() || null;
  } else if (typeof value.graphic_color_overlay === "string") {
    option.overlayColor = value.graphic_color_overlay.trim() || null;
  } else if (
    value.overlayColor === null ||
    value.overlay_color === null ||
    value.graphicOverlayColor === null ||
    value.graphic_overlay_color === null ||
    value.graphicColorOverlay === null ||
    value.graphic_color_overlay === null
  ) {
    option.overlayColor = null;
  }

  if (typeof value.textColor === "string") {
    option.textColor = value.textColor.trim() || null;
  } else if (typeof value.text_color === "string") {
    option.textColor = value.text_color.trim() || null;
  } else if (typeof value.text === "string") {
    option.textColor = value.text.trim() || null;
  } else if (value.textColor === null || value.text_color === null || value.text === null) {
    option.textColor = null;
  }

  if (typeof value.applyColorToPdf === "boolean") {
    option.applyColorToPdf = value.applyColorToPdf;
  } else if (typeof value.apply_origin_graphic_colour_to_pdf === "boolean") {
    option.applyColorToPdf = value.apply_origin_graphic_colour_to_pdf;
  } else if (typeof value.apply_origin_graphic_colour_to_pdf === "number") {
    option.applyColorToPdf = value.apply_origin_graphic_colour_to_pdf !== 0;
  }

  if (typeof value.overrideGraphic === "boolean") {
    option.overrideGraphic = value.overrideGraphic;
  } else if (typeof value.override_graphic === "boolean") {
    option.overrideGraphic = value.override_graphic;
  } else if (typeof value.override_graphic === "number") {
    option.overrideGraphic = value.override_graphic !== 0;
  }

  if (typeof value.splitGraphic === "boolean") {
    option.splitGraphic = value.splitGraphic;
  } else if (typeof value.split_graphic === "boolean") {
    option.splitGraphic = value.split_graphic;
  } else if (typeof value.split_graphic === "number") {
    option.splitGraphic = value.split_graphic !== 0;
  }

  if (typeof value.graphic === "string") {
    option.graphic = value.graphic.trim() || null;
  } else if (typeof value.sampleGraphic === "string") {
    option.graphic = value.sampleGraphic.trim() || null;
  } else if (typeof value.sample_graphic === "string") {
    option.graphic = value.sample_graphic.trim() || null;
  } else if (value.graphic === null || value.sampleGraphic === null || value.sample_graphic === null) {
    option.graphic = null;
  }

  if (typeof value.active === "boolean") {
    option.active = value.active;
  }

  if (typeof value.enableSegregatedGraphic === "boolean") {
    option.enableSegregatedGraphic = value.enableSegregatedGraphic;
  } else if (typeof value.enable_segregated_graphic === "boolean") {
    option.enableSegregatedGraphic = value.enable_segregated_graphic;
  }

  if (typeof value.topGraphic === "string") {
    option.topGraphic = value.topGraphic.trim() || null;
  } else if (typeof value.top_graphic === "string") {
    option.topGraphic = value.top_graphic.trim() || null;
  } else if (value.topGraphic === null || value.top_graphic === null) {
    option.topGraphic = null;
  }

  if (typeof value.bottomGraphic === "string") {
    option.bottomGraphic = value.bottomGraphic.trim() || null;
  } else if (typeof value.bottom_graphic === "string") {
    option.bottomGraphic = value.bottom_graphic.trim() || null;
  } else if (value.bottomGraphic === null || value.bottom_graphic === null) {
    option.bottomGraphic = null;
  }

  if (typeof value.startGraphic === "string") {
    option.startGraphic = value.startGraphic.trim() || null;
  } else if (typeof value.start_graphic === "string") {
    option.startGraphic = value.start_graphic.trim() || null;
  } else if (value.startGraphic === null || value.start_graphic === null) {
    option.startGraphic = null;
  }

  if (typeof value.endGraphic === "string") {
    option.endGraphic = value.endGraphic.trim() || null;
  } else if (typeof value.end_graphic === "string") {
    option.endGraphic = value.end_graphic.trim() || null;
  } else if (value.endGraphic === null || value.end_graphic === null) {
    option.endGraphic = null;
  }

  if (typeof value.depthFrequencyEnabled === "boolean") {
    option.depthFrequencyEnabled = value.depthFrequencyEnabled;
  } else if (typeof value.depth_frequency_enabled === "boolean") {
    option.depthFrequencyEnabled = value.depth_frequency_enabled;
  }

  if (typeof value.depthFrequency === "string") {
    option.depthFrequency = value.depthFrequency.trim() || null;
  } else if (typeof value.depth_frequency === "string") {
    option.depthFrequency = value.depth_frequency.trim() || null;
  } else if (value.depthFrequency === null || value.depth_frequency === null) {
    option.depthFrequency = null;
  }

  if (typeof value.enableSampleLogging === "boolean") {
    option.enableSampleLogging = value.enableSampleLogging;
  } else if (typeof value.enable_sample_logging === "boolean") {
    option.enableSampleLogging = value.enable_sample_logging;
  }

  if (typeof value.enableSubsurfaceLogging === "boolean") {
    option.enableSubsurfaceLogging = value.enableSubsurfaceLogging;
  } else if (typeof value.enable_subsurface_logging === "boolean") {
    option.enableSubsurfaceLogging = value.enable_subsurface_logging;
  }

  if (typeof value.defaultSampleTypeId === "string") {
    option.defaultSampleTypeId = value.defaultSampleTypeId.trim() || null;
  } else if (typeof value.default_sample_type_id === "string") {
    option.defaultSampleTypeId = value.default_sample_type_id.trim() || null;
  } else if (value.defaultSampleTypeId === null || value.default_sample_type_id === null) {
    option.defaultSampleTypeId = null;
  }

  if (typeof value.enableAutoSampleDescription === "boolean") {
    option.enableAutoSampleDescription = value.enableAutoSampleDescription;
  } else if (typeof value.enable_auto_sample_description === "boolean") {
    option.enableAutoSampleDescription = value.enable_auto_sample_description;
  }

  if (typeof value.tablogsAlias === "string") {
    option.tablogsAlias = value.tablogsAlias.trim() || null;
  } else if (typeof value.tablogs_alias === "string") {
    option.tablogsAlias = value.tablogs_alias.trim() || null;
  } else if (value.tablogsAlias === null || value.tablogs_alias === null) {
    option.tablogsAlias = null;
  }

  if (typeof value.logKind === "string") {
    const normalized = value.logKind.trim().toLowerCase();
    option.logKind = normalized === "core" ? "core" : "bore";
  } else if (typeof value.log_kind === "string") {
    const normalized = value.log_kind.trim().toLowerCase();
    option.logKind = normalized === "core" ? "core" : "bore";
  }

  if (typeof value.enableRecoveryField === "boolean") {
    option.enableRecoveryField = value.enableRecoveryField;
  } else if (typeof value.enable_recovery_field === "boolean") {
    option.enableRecoveryField = value.enable_recovery_field;
  }

  if (typeof value.enableWindowedWindowless === "boolean") {
    option.enableWindowedWindowless = value.enableWindowedWindowless;
  } else if (typeof value.enable_windowed_windowless === "boolean") {
    option.enableWindowedWindowless = value.enable_windowed_windowless;
  }

  if (typeof value.waterAdded === "boolean") {
    option.waterAdded = value.waterAdded;
  } else if (typeof value.water_added === "boolean") {
    option.waterAdded = value.water_added;
  }

  if (typeof value.depthRequired === "boolean") {
    option.depthRequired = value.depthRequired;
  } else if (typeof value.depth_required === "boolean") {
    option.depthRequired = value.depth_required;
  } else if (typeof value.depth_required === "number") {
    option.depthRequired = value.depth_required !== 0;
  }

  if (typeof value.allowNegativeDepth === "boolean") {
    option.allowNegativeDepth = value.allowNegativeDepth;
  } else if (typeof value.allow_negative_depth === "boolean") {
    option.allowNegativeDepth = value.allow_negative_depth;
  } else if (typeof value.allow_negative_depth === "number") {
    option.allowNegativeDepth = value.allow_negative_depth !== 0;
  }

  if (typeof value.graphicAlignment === "string") {
    const normalized = value.graphicAlignment.trim().toLowerCase();
    if (normalized === "top" || normalized === "bottom") {
      option.graphicAlignment = normalized;
    }
  } else if (typeof value.graphic_alignment === "string") {
    const normalized = value.graphic_alignment.trim().toLowerCase();
    if (normalized === "top" || normalized === "bottom") {
      option.graphicAlignment = normalized;
    }
  }

  if (typeof value.observationDateTimeRequired === "boolean") {
    option.observationDateTimeRequired = value.observationDateTimeRequired;
  } else if (typeof value.observation_date_time_required === "boolean") {
    option.observationDateTimeRequired = value.observation_date_time_required;
  } else if (typeof value.observation_date_time_required === "number") {
    option.observationDateTimeRequired = value.observation_date_time_required !== 0;
  }

  if (typeof value.isDepthOfCasing === "boolean") {
    option.isDepthOfCasing = value.isDepthOfCasing;
  } else if (typeof value.is_depth_of_casing === "boolean") {
    option.isDepthOfCasing = value.is_depth_of_casing;
  } else if (typeof value.is_depth_of_casing === "number") {
    option.isDepthOfCasing = value.is_depth_of_casing !== 0;
  }

  if (typeof value.isDepthToWater === "boolean") {
    option.isDepthToWater = value.isDepthToWater;
  } else if (typeof value.is_depth_to_water === "boolean") {
    option.isDepthToWater = value.is_depth_to_water;
  } else if (typeof value.is_depth_to_water === "number") {
    option.isDepthToWater = value.is_depth_to_water !== 0;
  }

  if (typeof value.abbreviation === "string") {
    option.abbreviation = value.abbreviation.trim() || null;
  } else if (value.abbreviation === null) {
    option.abbreviation = null;
  }

  if (typeof value.sampleAbbreviation === "string") {
    option.sampleAbbreviation = value.sampleAbbreviation.trim() || null;
  } else if (typeof value.sample_abbreviation === "string") {
    option.sampleAbbreviation = value.sample_abbreviation.trim() || null;
  } else if (value.sampleAbbreviation === null || value.sample_abbreviation === null) {
    option.sampleAbbreviation = null;
  }

  if (typeof value.noteRecovery === "boolean") {
    option.noteRecovery = value.noteRecovery;
  } else if (typeof value.note_recovery === "boolean") {
    option.noteRecovery = value.note_recovery;
  } else if (typeof value.note_recovery === "number") {
    option.noteRecovery = value.note_recovery !== 0;
  }

  if (typeof value.displayQcId === "boolean") {
    option.displayQcId = value.displayQcId;
  } else if (typeof value.display_qc_id === "boolean") {
    option.displayQcId = value.display_qc_id;
  } else if (typeof value.display_qc_id === "number") {
    option.displayQcId = value.display_qc_id !== 0;
  }

  if (typeof value.enableAssignLabTest === "boolean") {
    option.enableAssignLabTest = value.enableAssignLabTest;
  } else if (typeof value.enable_assign_lab_test === "boolean") {
    option.enableAssignLabTest = value.enable_assign_lab_test;
  } else if (typeof value.enable_assign_lab_test === "number") {
    option.enableAssignLabTest = value.enable_assign_lab_test !== 0;
  }

  if (typeof value.enableInsituTestLogging === "boolean") {
    option.enableInsituTestLogging = value.enableInsituTestLogging;
  } else if (typeof value.enable_insitu_test_logging === "boolean") {
    option.enableInsituTestLogging = value.enable_insitu_test_logging;
  } else if (typeof value.enable_insitu === "boolean") {
    option.enableInsituTestLogging = value.enable_insitu;
  } else if (typeof value.enable_insitu === "number") {
    option.enableInsituTestLogging = value.enable_insitu !== 0;
  }

  if (typeof value.defaultInsituTestTypeId === "string") {
    option.defaultInsituTestTypeId = value.defaultInsituTestTypeId.trim() || null;
  } else if (typeof value.default_insitu_test_type_id === "string") {
    option.defaultInsituTestTypeId = value.default_insitu_test_type_id.trim() || null;
  } else if (typeof value.situ_test_id === "string") {
    option.defaultInsituTestTypeId = value.situ_test_id.trim() || null;
  } else if (typeof value.situ_test_id === "number") {
    option.defaultInsituTestTypeId = String(value.situ_test_id);
  } else if (
    value.defaultInsituTestTypeId === null ||
    value.default_insitu_test_type_id === null ||
    value.situ_test_id === null
  ) {
    option.defaultInsituTestTypeId = null;
  }

  const labTestTypeIdsSource =
    value.labTestTypeIds ?? value.lab_test_type_ids ?? value.labTestTypes ?? value.lab_test_types;
  if (Array.isArray(labTestTypeIdsSource)) {
    const ids: string[] = [];
    const seen = new Set<string>();
    for (const entry of labTestTypeIdsSource) {
      if (typeof entry !== "string") continue;
      const id = entry.trim();
      if (!id || seen.has(id)) continue;
      seen.add(id);
      ids.push(id);
    }
    option.labTestTypeIds = ids;
  }

  if (typeof value.externalAlias === "string") {
    option.externalAlias = value.externalAlias.trim() || null;
  } else if (typeof value.external_alias === "string") {
    option.externalAlias = value.external_alias.trim() || null;
  } else if (value.externalAlias === null || value.external_alias === null) {
    option.externalAlias = null;
  }

  if (typeof value.aliasTable === "string") {
    option.aliasTable = value.aliasTable.trim() || null;
  } else if (typeof value.alias_table === "string") {
    option.aliasTable = value.alias_table.trim() || null;
  } else if (value.aliasTable === null || value.alias_table === null) {
    option.aliasTable = null;
  }

  if (typeof value.addAsSelectedDataPlot === "boolean") {
    option.addAsSelectedDataPlot = value.addAsSelectedDataPlot;
  } else if (typeof value.add_as_selected_data_plot === "boolean") {
    option.addAsSelectedDataPlot = value.add_as_selected_data_plot;
  } else if (typeof value.add_as_selected_data_plot === "number") {
    option.addAsSelectedDataPlot = value.add_as_selected_data_plot !== 0;
  }

  const resultFieldsSource =
    value.labTestResultFields ??
    value.lab_test_result_fields ??
    value.resultFields ??
    value.result_fields;
  if (Array.isArray(resultFieldsSource)) {
    const fields: NonNullable<ModuleNamedOption["labTestResultFields"]> = [];
    for (const [index, entry] of resultFieldsSource.entries()) {
      if (!isRecord(entry) || fields.length >= MODULE_OPTIONS_MAX_COUNT) continue;
      const fieldName = typeof entry.name === "string" ? entry.name : "";
      const fieldId =
        typeof entry.id === "string" && entry.id.trim()
          ? entry.id.trim()
          : `lab-result-field-${index + 1}`;
      const externalAlias =
        typeof entry.externalAlias === "string"
          ? entry.externalAlias.trim() || null
          : typeof entry.external_alias === "string"
            ? entry.external_alias.trim() || null
            : null;
      const tablogsAlias =
        typeof entry.tablogsAlias === "string"
          ? entry.tablogsAlias.trim() || null
          : typeof entry.tablogs_alias === "string"
            ? entry.tablogs_alias.trim() || null
            : null;
      fields.push({
        id: fieldId,
        name: fieldName,
        externalAlias,
        tablogsAlias,
      });
    }
    option.labTestResultFields = fields;
  }

  if (typeof value.showAutoScale === "boolean") {
    option.showAutoScale = value.showAutoScale;
  } else if (typeof value.show_auto_scale === "boolean") {
    option.showAutoScale = value.show_auto_scale;
  } else if (typeof value.show_auto_scale === "number") {
    option.showAutoScale = value.show_auto_scale !== 0;
  }

  if (typeof value.remarkTypeId === "string") {
    option.remarkTypeId = value.remarkTypeId.trim() || null;
  } else if (typeof value.remark_type_id === "string") {
    option.remarkTypeId = value.remark_type_id.trim() || null;
  } else if (value.remarkTypeId === null || value.remark_type_id === null) {
    option.remarkTypeId = null;
  }

  return option;
}

function parseNamedOptions(value: unknown, fallback: ModuleNamedOption[]): ModuleNamedOption[] {
  if (!Array.isArray(value)) return fallback.map((entry) => ({ ...entry }));

  const options: ModuleNamedOption[] = [];
  const seen = new Set<string>();

  for (const [index, entry] of value.entries()) {
    if (options.length >= MODULE_OPTIONS_MAX_COUNT) break;
    const parsed = parseNamedOption(entry, index);
    if (!parsed) continue;
    const key = parsed.remarkTypeId
      ? `${parsed.remarkTypeId}::${parsed.name.toLowerCase()}`
      : parsed.name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    options.push(parsed);
  }

  return options;
}

export function createDefaultModuleGeneralSettings(moduleId: string): ModuleGeneralSettings {
  const spec = getModuleSettingsSpec(moduleId);
  return {
    moduleName: DEFAULT_MODULE_DISPLAY_NAMES[moduleId] ?? moduleId,
    status: "active",
    showOnWeb: true,
    showOnMobile: spec?.defaultShowOnMobile ?? true,
  };
}

export function createDefaultDataTypeOptions(moduleId: string): Record<string, ModuleNamedOption[]> {
  const options: Record<string, ModuleNamedOption[]> = {};
  for (const dataTypeId of editableDataTypeIds(moduleId)) {
    const defaults = DEFAULT_DATA_TYPE_OPTIONS[dataTypeId] ?? [];
    options[dataTypeId] = defaults.map((entry) => ({ ...entry }));
  }
  return options;
}

export function createDefaultModuleSettings(moduleId: string): StoredModuleSettings {
  const settings: StoredModuleSettings = {
    ...createDefaultModuleGeneralSettings(moduleId),
    dataTypeOptions: createDefaultDataTypeOptions(moduleId),
  };
  return getModuleSettingsSpec(moduleId)?.enrichDefaults?.(settings) ?? settings;
}

export function parseModuleGeneralSettings(value: unknown, moduleId: string): ModuleGeneralSettings {
  const defaults = createDefaultModuleGeneralSettings(moduleId);
  if (!isRecord(value)) return defaults;

  // Preserve spaces while editing — only treat whitespace-only as empty.
  const rawName =
    typeof value.moduleName === "string"
      ? value.moduleName
      : typeof value.displayName === "string"
        ? value.displayName
        : "";

  const moduleName =
    rawName.trim() && rawName.length <= MODULE_DISPLAY_NAME_MAX_LENGTH
      ? rawName
      : defaults.moduleName;

  const status =
    value.status === "active" || value.status === "inactive" ? value.status : defaults.status;

  return {
    moduleName,
    status,
    showOnWeb: typeof value.showOnWeb === "boolean" ? value.showOnWeb : defaults.showOnWeb,
    showOnMobile:
      typeof value.showOnMobile === "boolean" ? value.showOnMobile : defaults.showOnMobile,
  };
}

function parseDataTypeOptions(
  value: unknown,
  moduleId: string
): Record<string, ModuleNamedOption[]> {
  const defaults = createDefaultDataTypeOptions(moduleId);
  const source = isRecord(value) ? value : {};

  // Legacy: remarkTypes at module root
  if (Array.isArray(source.remarkTypes) && !source.dataTypeOptions) {
    defaults["remark-types"] = parseNamedOptions(
      source.remarkTypes,
      DEFAULT_DATA_TYPE_OPTIONS["remark-types"] ?? []
    );
  }

  const nested = isRecord(source.dataTypeOptions) ? source.dataTypeOptions : source;
  // Start from defaults, but DB-backed catalogs must come from API (not JSON seed).
  const result: Record<string, ModuleNamedOption[]> = {};
  for (const [dataTypeId, options] of Object.entries(defaults)) {
    if (isDbBackedDataTypeId(dataTypeId)) continue;
    result[dataTypeId] = options;
  }

  for (const dataTypeId of editableDataTypeIds(moduleId)) {
    if (nested[dataTypeId] === undefined) {
      if (isDbBackedDataTypeId(dataTypeId)) {
        result[dataTypeId] = [];
      }
      continue;
    }
    const fallback = isDbBackedDataTypeId(dataTypeId)
      ? []
      : (DEFAULT_DATA_TYPE_OPTIONS[dataTypeId] ?? []);
    const parsed = parseNamedOptions(nested[dataTypeId], fallback);
    if (
      parsed.length === 0 &&
      !isDbBackedDataTypeId(dataTypeId) &&
      (DEFAULT_DATA_TYPE_OPTIONS[dataTypeId]?.length ?? 0) > 0
    ) {
      continue;
    }
    result[dataTypeId] = parsed;
  }

  return result;
}

export function parseStoredModuleSettings(value: unknown, moduleId: string): StoredModuleSettings {
  const settings: StoredModuleSettings = {
    ...parseModuleGeneralSettings(value, moduleId),
    dataTypeOptions: parseDataTypeOptions(value, moduleId),
  };
  return getModuleSettingsSpec(moduleId)?.enrichParsed?.(value, settings) ?? settings;
}

export function getModuleDataTypeOptions(
  settings: StoredModuleSettings | undefined,
  dataTypeId: string
): ModuleNamedOption[] {
  const defaults = isDbBackedDataTypeId(dataTypeId)
    ? []
    : (DEFAULT_DATA_TYPE_OPTIONS[dataTypeId] ?? []).map((entry) => ({ ...entry }));
  if (!settings) return defaults;

  const stored = settings.dataTypeOptions[dataTypeId];
  if (!stored) return defaults;
  // DB-backed catalogs: trust stored/API values even when empty (do not re-seed JSON defaults).
  if (isDbBackedDataTypeId(dataTypeId)) {
    return stored.map((entry) => ({ ...entry }));
  }
  if (stored.length === 0) return defaults;

  return stored.map((entry) => ({ ...entry }));
}

function parseOrder(value: unknown, enabledModules: readonly string[]): string[] {
  const enabled = new Set(enabledModules);
  const order: string[] = [];

  if (Array.isArray(value)) {
    for (const entry of value) {
      if (typeof entry !== "string" || !enabled.has(entry) || order.includes(entry)) continue;
      order.push(entry);
    }
  }

  for (const moduleId of enabledModules) {
    if (!order.includes(moduleId)) order.push(moduleId);
  }

  return order;
}

export function cloneModuleSettings(
  settings: ConfigModuleSettings
): ConfigModuleSettings {
  const modules: Record<string, StoredModuleSettings> = {};
  for (const [moduleId, entry] of Object.entries(settings.modules)) {
    const dataTypeOptions: Record<string, ModuleNamedOption[]> = {};
    for (const [dataTypeId, options] of Object.entries(entry.dataTypeOptions)) {
      dataTypeOptions[dataTypeId] = options.map((optionEntry) => ({ ...optionEntry }));
    }
    const extra = getModuleSettingsSpec(moduleId)?.cloneExtra?.(entry) ?? {};
    modules[moduleId] = {
      moduleName: entry.moduleName,
      status: entry.status,
      showOnWeb: entry.showOnWeb,
      showOnMobile: entry.showOnMobile,
      dataTypeOptions,
      ...extra,
    };
  }

  return {
    order: [...settings.order],
    modules,
    workflow: {
      enabled: settings.workflow.enabled,
      name: settings.workflow.name,
      ignoreParentLegacySettings: settings.workflow.ignoreParentLegacySettings,
      steps: settings.workflow.steps.map((step) => ({
        ...step,
        options: step.options?.map((option) => ({ ...option })),
        conditions: step.conditions?.map((condition) => ({ ...condition })),
      })),
      applyClassificationRules: settings.workflow.applyClassificationRules ?? true,
      classificationCodes: (settings.workflow.classificationCodes ?? []).map((code) =>
        cloneClassificationCode(code)
      ),
    },
  };
}

export function parseConfigModuleSettings(
  value: unknown,
  enabledModules: readonly string[] = []
): ConfigModuleSettings {
  if (!isRecord(value)) {
    return ensureModuleSettingsForEnabledModules(enabledModules, {
      order: [],
      modules: {},
      workflow: parseWorkflowSettings(undefined),
    });
  }

  const modulesSource = isRecord(value.modules) ? value.modules : value;
  const modules: Record<string, StoredModuleSettings> = {};

  for (const [moduleId, entry] of Object.entries(modulesSource)) {
    if (moduleId === "order" || moduleId === "modules" || moduleId === "workflow") continue;
    modules[moduleId] = parseStoredModuleSettings(entry, moduleId);
  }

  const seedIds = enabledModules.length > 0 ? enabledModules : Object.keys(modules);

  return ensureModuleSettingsForEnabledModules(seedIds, {
    order: parseOrder(value.order, seedIds),
    modules,
    workflow: parseWorkflowSettings(value.workflow),
  });
}

export function ensureModuleSettingsForEnabledModules(
  enabledModules: readonly string[],
  current: ConfigModuleSettings
): ConfigModuleSettings {
  const modules: Record<string, StoredModuleSettings> = { ...current.modules };

  for (const moduleId of enabledModules) {
    if (!modules[moduleId]) {
      modules[moduleId] = createDefaultModuleSettings(moduleId);
    } else {
      modules[moduleId] = parseStoredModuleSettings(modules[moduleId], moduleId);
    }
  }

  for (const moduleId of Object.keys(modules)) {
    if (!enabledModules.includes(moduleId)) {
      delete modules[moduleId];
    }
  }

  return {
    order: parseOrder(current.order, enabledModules),
    modules,
    workflow: current.workflow
      ? parseWorkflowSettings(current.workflow)
      : parseWorkflowSettings(undefined),
  };
}

/** @deprecated */
export type LogRemarksRemarkType = ModuleNamedOption;
export type LogRemarksModuleSettings = StoredModuleSettings;
export const LOG_REMARKS_DISPLAY_NAME_MAX_LENGTH = MODULE_DISPLAY_NAME_MAX_LENGTH;
export const LOG_REMARKS_TYPE_NAME_MAX_LENGTH = MODULE_OPTION_NAME_MAX_LENGTH;
export const LOG_REMARKS_TYPES_MAX_COUNT = MODULE_OPTIONS_MAX_COUNT;
export const DEFAULT_LOG_REMARKS_TYPES = DEFAULT_DATA_TYPE_OPTIONS["remark-types"] ?? [];
export const DEFAULT_LOG_REMARKS_MODULE_SETTINGS: StoredModuleSettings =
  createDefaultModuleSettings(LOG_REMARKS_MODULE_ID);

export function isLogRemarksSettings(
  _moduleId: string,
  _settings: StoredModuleSettings
): _settings is StoredModuleSettings {
  return true;
}

export function cloneLogRemarksModuleSettings(settings: StoredModuleSettings): StoredModuleSettings {
  return parseStoredModuleSettings(settings, LOG_REMARKS_MODULE_ID);
}

export function parseLogRemarksModuleSettings(value: unknown): StoredModuleSettings {
  return parseStoredModuleSettings(value, LOG_REMARKS_MODULE_ID);
}
