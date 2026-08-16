import {
  DEFAULT_APERTURE_MINERAL_OPTIONS,
  toApertureMineralModuleNamedOption,
} from "../apertureMineral";
import {
  DEFAULT_CORE_DEFECT_TYPE_OPTIONS,
  toCoreDefectTypeModuleNamedOption,
} from "../coreDefectType";
import {
  DEFAULT_INFILL_MATERIAL_OPTIONS,
  toInfillMaterialModuleNamedOption,
} from "../infillMaterial";
import {
  DEFAULT_SURFACE_SHAPE_OPTIONS,
  toSurfaceShapeModuleNamedOption,
} from "../surfaceShape";
import {
  DEFAULT_SURFACE_ROUGHNESS_OPTIONS,
  toSurfaceRoughnessModuleNamedOption,
} from "../surfaceRoughness";
import {
  DEFAULT_DEFECT_OPENNESS_OPTIONS,
  toDefectOpennessModuleNamedOption,
} from "../defectOpenness";
import {
  DEFAULT_DEFECT_COATING_OPTIONS,
  toDefectCoatingModuleNamedOption,
} from "../defectCoating";
import { isRecord } from "../helpers";
import type { CoreLoggingModuleConfig, ModuleNamedOption, ModuleSettingsSpec } from "../types";

export const CORE_LOGGING_MODULE_ID = "core-logging" as const;
export const CORE_DEFECT_TYPES_DATA_TYPE_ID = "core-defect-types" as const;
export const APERTURE_MINERALS_DATA_TYPE_ID = "aperture-minerals" as const;
export const APERTURE_COLORS_DATA_TYPE_ID = "aperture-colors" as const;
export const INFILL_MATERIALS_DATA_TYPE_ID = "infill-materials" as const;
export const SURFACE_SHAPES_DATA_TYPE_ID = "surface-shapes" as const;
export const SURFACE_ROUGHNESSES_DATA_TYPE_ID = "surface-roughnesses" as const;
export const DEFECT_OPENNESSES_DATA_TYPE_ID = "defect-opennesses" as const;
export const DEFECT_COATINGS_DATA_TYPE_ID = "defect-coatings" as const;

export const DEFAULT_APERTURE_COLOR_OPTIONS: ModuleNamedOption[] = [
  { id: "none", name: "None", color: "#000000" },
];

export type { CoreLoggingModuleConfig };

const DEFAULT_ALLOW_USERS_TO_MANAGE: Record<string, boolean> = {
  "core-defect-types": true,
  "aperture-colors": true,
  "aperture-minerals": true,
  "infill-materials": true,
  "surface-shapes": true,
  "surface-roughnesses": true,
  "defect-opennesses": true,
  "defect-coatings": true,
};

function parseNamedOptionsList(value: unknown): ModuleNamedOption[] {
  if (!Array.isArray(value)) return [];
  const result: ModuleNamedOption[] = [];
  for (const entry of value) {
    if (!isRecord(entry)) continue;
    if (typeof entry.id !== "string" || typeof entry.name !== "string") continue;
    const id = entry.id.trim();
    const name = entry.name.trim();
    if (!id || !name) continue;
    result.push({ id, name });
  }
  return result;
}

function parseBoolean(value: unknown, fallback: boolean): boolean {
  return typeof value === "boolean" ? value : fallback;
}

function parseAllowUsersToManage(value: unknown): Record<string, boolean> {
  const allowUsersToManage: Record<string, boolean> = { ...DEFAULT_ALLOW_USERS_TO_MANAGE };
  if (!isRecord(value)) return allowUsersToManage;
  for (const [dataTypeId, entry] of Object.entries(value)) {
    if (typeof entry === "boolean") allowUsersToManage[dataTypeId] = entry;
  }
  return allowUsersToManage;
}

export function createDefaultCoreLoggingConfig(): CoreLoggingModuleConfig {
  return {
    sampleOrientedCoreDefects: false,
    sampleOrientedRqdTcr: false,
    defaultSampleTypes: [],
    showDefectOrientation: true,
    showBetaAngle: false,
    showSurfaceShape: true,
    showSurfaceRoughness: true,
    showDefectCoatings: true,
    showDefectOpenness: true,
    showDefectSpacingOverride: true,
    showJointRoughnessCoefficient: false,
    showBoundsOnDefectMax: true,
    showBoundsOnDefectMin: true,
    showMajorInfillMaterial: false,
    showMinorInfillMaterial: false,
    showApertureSpacing: false,
    showApertureColor: false,
    showApertureMineral: false,
    showJointCondition: false,
    showRqdRecRunType: false,
    autoCalculationCoreRecoveryLength: true,
    showScr: false,
    showFractureIndex: false,
    showRmr: false,
    showStrengthInCoreLogging: false,
    showWeatheringInCoreLogging: false,
    showIndependentFractureIndex: false,
    allowUsersToManage: { ...DEFAULT_ALLOW_USERS_TO_MANAGE },
  };
}

export function parseCoreLoggingConfig(value: unknown): CoreLoggingModuleConfig {
  const defaults = createDefaultCoreLoggingConfig();
  if (!isRecord(value)) return defaults;

  return {
    sampleOrientedCoreDefects: parseBoolean(
      value.sampleOrientedCoreDefects,
      defaults.sampleOrientedCoreDefects
    ),
    sampleOrientedRqdTcr: parseBoolean(
      value.sampleOrientedRqdTcr,
      defaults.sampleOrientedRqdTcr
    ),
    defaultSampleTypes: Array.isArray(value.defaultSampleTypes)
      ? parseNamedOptionsList(value.defaultSampleTypes)
      : defaults.defaultSampleTypes,
    showDefectOrientation: parseBoolean(
      value.showDefectOrientation,
      defaults.showDefectOrientation
    ),
    showBetaAngle: parseBoolean(value.showBetaAngle, defaults.showBetaAngle),
    showSurfaceShape: parseBoolean(value.showSurfaceShape, defaults.showSurfaceShape),
    showSurfaceRoughness: parseBoolean(
      value.showSurfaceRoughness,
      defaults.showSurfaceRoughness
    ),
    showDefectCoatings: parseBoolean(value.showDefectCoatings, defaults.showDefectCoatings),
    showDefectOpenness: parseBoolean(value.showDefectOpenness, defaults.showDefectOpenness),
    showDefectSpacingOverride: parseBoolean(
      value.showDefectSpacingOverride,
      defaults.showDefectSpacingOverride
    ),
    showJointRoughnessCoefficient: parseBoolean(
      value.showJointRoughnessCoefficient,
      defaults.showJointRoughnessCoefficient
    ),
    showBoundsOnDefectMax: parseBoolean(
      value.showBoundsOnDefectMax,
      defaults.showBoundsOnDefectMax
    ),
    showBoundsOnDefectMin: parseBoolean(
      value.showBoundsOnDefectMin,
      defaults.showBoundsOnDefectMin
    ),
    showMajorInfillMaterial: parseBoolean(
      value.showMajorInfillMaterial,
      defaults.showMajorInfillMaterial
    ),
    showMinorInfillMaterial: parseBoolean(
      value.showMinorInfillMaterial,
      defaults.showMinorInfillMaterial
    ),
    showApertureSpacing: parseBoolean(value.showApertureSpacing, defaults.showApertureSpacing),
    showApertureColor: parseBoolean(value.showApertureColor, defaults.showApertureColor),
    showApertureMineral: parseBoolean(value.showApertureMineral, defaults.showApertureMineral),
    showJointCondition: parseBoolean(value.showJointCondition, defaults.showJointCondition),
    showRqdRecRunType: parseBoolean(value.showRqdRecRunType, defaults.showRqdRecRunType),
    autoCalculationCoreRecoveryLength: parseBoolean(
      value.autoCalculationCoreRecoveryLength,
      defaults.autoCalculationCoreRecoveryLength
    ),
    showScr: parseBoolean(value.showScr, defaults.showScr),
    showFractureIndex: parseBoolean(value.showFractureIndex, defaults.showFractureIndex),
    showRmr: parseBoolean(value.showRmr, defaults.showRmr),
    showStrengthInCoreLogging: parseBoolean(
      value.showStrengthInCoreLogging,
      defaults.showStrengthInCoreLogging
    ),
    showWeatheringInCoreLogging: parseBoolean(
      value.showWeatheringInCoreLogging,
      defaults.showWeatheringInCoreLogging
    ),
    showIndependentFractureIndex: parseBoolean(
      value.showIndependentFractureIndex,
      defaults.showIndependentFractureIndex
    ),
    allowUsersToManage: parseAllowUsersToManage(value.allowUsersToManage),
  };
}

export const coreLoggingModule: ModuleSettingsSpec = {
  id: CORE_LOGGING_MODULE_ID,
  displayName: "Core Logging",
  dataTypes: [
    { id: "core-defect-types", name: "Core Defect Types", editable: true },
    { id: "aperture-colors", name: "Aperture Colors", editable: true },
    { id: "aperture-minerals", name: "Aperture Minerals", editable: true },
    { id: "infill-materials", name: "Infill Materials", editable: true },
    { id: "surface-shapes", name: "Surface Shapes", editable: true },
    { id: "surface-roughnesses", name: "Surface Roughness", editable: true },
    { id: "defect-opennesses", name: "Defect Openness", editable: true },
    { id: "defect-coatings", name: "Defect Coatings", editable: true },
  ],
  defaultOptions: {
    "core-defect-types": DEFAULT_CORE_DEFECT_TYPE_OPTIONS.map((entry) =>
      toCoreDefectTypeModuleNamedOption(entry)
    ),
    "aperture-colors": DEFAULT_APERTURE_COLOR_OPTIONS.map((entry) => ({ ...entry })),
    "aperture-minerals": DEFAULT_APERTURE_MINERAL_OPTIONS.map((entry) =>
      toApertureMineralModuleNamedOption(entry)
    ),
    "infill-materials": DEFAULT_INFILL_MATERIAL_OPTIONS.map((entry) =>
      toInfillMaterialModuleNamedOption(entry)
    ),
    "surface-shapes": DEFAULT_SURFACE_SHAPE_OPTIONS.map((entry) =>
      toSurfaceShapeModuleNamedOption(entry)
    ),
    "surface-roughnesses": DEFAULT_SURFACE_ROUGHNESS_OPTIONS.map((entry) =>
      toSurfaceRoughnessModuleNamedOption(entry)
    ),
    "defect-opennesses": DEFAULT_DEFECT_OPENNESS_OPTIONS.map((entry) =>
      toDefectOpennessModuleNamedOption(entry)
    ),
    "defect-coatings": DEFAULT_DEFECT_COATING_OPTIONS.map((entry) =>
      toDefectCoatingModuleNamedOption(entry)
    ),
  },
  enrichDefaults: (settings) => ({
    ...settings,
    coreLogging: createDefaultCoreLoggingConfig(),
  }),
  enrichParsed: (value, settings) => {
    const source =
      isRecord(value) && isRecord(value.coreLogging) ? value.coreLogging : value;
    return {
      ...settings,
      coreLogging: parseCoreLoggingConfig(source),
    };
  },
  cloneExtra: (entry) =>
    entry.coreLogging
      ? {
          coreLogging: {
            ...entry.coreLogging,
            defaultSampleTypes: entry.coreLogging.defaultSampleTypes.map((item) => ({
              ...item,
            })),
            allowUsersToManage: { ...entry.coreLogging.allowUsersToManage },
          },
        }
      : {},
};
