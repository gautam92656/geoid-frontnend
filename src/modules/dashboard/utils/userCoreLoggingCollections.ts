import type { ConfigModuleSettings, StoredModuleSettings } from "./configModules/types";
import {
  parseCoreDefectTypeOptions,
  toCoreDefectTypeModuleNamedOption,
  type CoreDefectTypeOption,
} from "./configModules/coreDefectType";
import {
  parseColorOptions,
  toColorModuleNamedOption,
  type ColorOption,
} from "./configModules/colorOption";
import {
  parseApertureMineralOptions,
  toApertureMineralModuleNamedOption,
  type ApertureMineralOption,
} from "./configModules/apertureMineral";
import {
  parseInfillMaterialOptions,
  toInfillMaterialModuleNamedOption,
  type InfillMaterialOption,
} from "./configModules/infillMaterial";
import {
  parseSurfaceShapeOptions,
  toSurfaceShapeModuleNamedOption,
  type SurfaceShapeOption,
} from "./configModules/surfaceShape";
import {
  parseSurfaceRoughnessOptions,
  toSurfaceRoughnessModuleNamedOption,
  type SurfaceRoughnessOption,
} from "./configModules/surfaceRoughness";
import {
  parseDefectOpennessOptions,
  toDefectOpennessModuleNamedOption,
  type DefectOpennessOption,
} from "./configModules/defectOpenness";
import {
  parseDefectCoatingOptions,
  toDefectCoatingModuleNamedOption,
  type DefectCoatingOption,
} from "./configModules/defectCoating";
import { CORE_LOGGING_MODULE_ID } from "./configModules/modules/core-logging";
import {
  getUserApertureColors,
  getUserApertureMinerals,
  getUserCoreDefectTypes,
  getUserInfillMaterials,
  getUserSurfaceShapes,
  getUserSurfaceRoughnesses,
  getUserDefectOpennesses,
  getUserDefectCoatings,
  saveUserApertureColors,
  saveUserApertureMinerals,
  saveUserCoreDefectTypes,
  saveUserInfillMaterials,
  saveUserSurfaceShapes,
  saveUserSurfaceRoughnesses,
  saveUserDefectOpennesses,
  saveUserDefectCoatings,
} from "../services/configModulesApi";

/** Module slugs whose core-logging collections live in dedicated user tables. */
export const USER_CORE_LOGGING_MODULE_SLUGS = [CORE_LOGGING_MODULE_ID] as const;

export type UserCoreLoggingModuleSlug = (typeof USER_CORE_LOGGING_MODULE_SLUGS)[number];

export type UserCoreLoggingCollections = {
  coreDefectTypes: CoreDefectTypeOption[];
  apertureColors: ColorOption[];
  apertureMinerals: ApertureMineralOption[];
  infillMaterials: InfillMaterialOption[];
  surfaceShapes: SurfaceShapeOption[];
  surfaceRoughnesses: SurfaceRoughnessOption[];
  defectOpennesses: DefectOpennessOption[];
  defectCoatings: DefectCoatingOption[];
};

export function moduleUsesUserCoreLoggingCollections(
  moduleSlug: string
): moduleSlug is UserCoreLoggingModuleSlug {
  return (USER_CORE_LOGGING_MODULE_SLUGS as readonly string[]).includes(moduleSlug);
}

export function mergeUserCoreDefectTypesIntoModuleSettings(
  moduleSettings: StoredModuleSettings,
  options: CoreDefectTypeOption[]
): StoredModuleSettings {
  return {
    ...moduleSettings,
    dataTypeOptions: {
      ...moduleSettings.dataTypeOptions,
      "core-defect-types": options.map((entry) => toCoreDefectTypeModuleNamedOption(entry)),
    },
  };
}

export function mergeUserApertureColorsIntoModuleSettings(
  moduleSettings: StoredModuleSettings,
  options: ColorOption[]
): StoredModuleSettings {
  return {
    ...moduleSettings,
    dataTypeOptions: {
      ...moduleSettings.dataTypeOptions,
      "aperture-colors": options.map((entry) => toColorModuleNamedOption(entry)),
    },
  };
}

export function mergeUserApertureMineralsIntoModuleSettings(
  moduleSettings: StoredModuleSettings,
  options: ApertureMineralOption[]
): StoredModuleSettings {
  return {
    ...moduleSettings,
    dataTypeOptions: {
      ...moduleSettings.dataTypeOptions,
      "aperture-minerals": options.map((entry) => toApertureMineralModuleNamedOption(entry)),
    },
  };
}

export function mergeUserInfillMaterialsIntoModuleSettings(
  moduleSettings: StoredModuleSettings,
  options: InfillMaterialOption[]
): StoredModuleSettings {
  return {
    ...moduleSettings,
    dataTypeOptions: {
      ...moduleSettings.dataTypeOptions,
      "infill-materials": options.map((entry) => toInfillMaterialModuleNamedOption(entry)),
    },
  };
}

export function mergeUserSurfaceShapesIntoModuleSettings(
  moduleSettings: StoredModuleSettings,
  options: SurfaceShapeOption[]
): StoredModuleSettings {
  return {
    ...moduleSettings,
    dataTypeOptions: {
      ...moduleSettings.dataTypeOptions,
      "surface-shapes": options.map((entry) => toSurfaceShapeModuleNamedOption(entry)),
    },
  };
}

export function mergeUserSurfaceRoughnessesIntoModuleSettings(
  moduleSettings: StoredModuleSettings,
  options: SurfaceRoughnessOption[]
): StoredModuleSettings {
  return {
    ...moduleSettings,
    dataTypeOptions: {
      ...moduleSettings.dataTypeOptions,
      "surface-roughnesses": options.map((entry) =>
        toSurfaceRoughnessModuleNamedOption(entry)
      ),
    },
  };
}

export function mergeUserDefectOpennessesIntoModuleSettings(
  moduleSettings: StoredModuleSettings,
  options: DefectOpennessOption[]
): StoredModuleSettings {
  return {
    ...moduleSettings,
    dataTypeOptions: {
      ...moduleSettings.dataTypeOptions,
      "defect-opennesses": options.map((entry) =>
        toDefectOpennessModuleNamedOption(entry)
      ),
    },
  };
}

export function mergeUserDefectCoatingsIntoModuleSettings(
  moduleSettings: StoredModuleSettings,
  options: DefectCoatingOption[]
): StoredModuleSettings {
  return {
    ...moduleSettings,
    dataTypeOptions: {
      ...moduleSettings.dataTypeOptions,
      "defect-coatings": options.map((entry) => toDefectCoatingModuleNamedOption(entry)),
    },
  };
}

export function mergeUserCoreLoggingCollectionsIntoModuleSettings(
  moduleSettings: StoredModuleSettings,
  collections: UserCoreLoggingCollections
): StoredModuleSettings {
  return mergeUserDefectCoatingsIntoModuleSettings(
    mergeUserDefectOpennessesIntoModuleSettings(
      mergeUserSurfaceRoughnessesIntoModuleSettings(
        mergeUserSurfaceShapesIntoModuleSettings(
          mergeUserInfillMaterialsIntoModuleSettings(
            mergeUserApertureMineralsIntoModuleSettings(
              mergeUserApertureColorsIntoModuleSettings(
                mergeUserCoreDefectTypesIntoModuleSettings(
                  moduleSettings,
                  collections.coreDefectTypes
                ),
                collections.apertureColors
              ),
              collections.apertureMinerals
            ),
            collections.infillMaterials
          ),
          collections.surfaceShapes
        ),
        collections.surfaceRoughnesses
      ),
      collections.defectOpennesses
    ),
    collections.defectCoatings
  );
}

export function applyUserCoreLoggingCollectionsToLogConfigModuleSettings(
  moduleSettings: ConfigModuleSettings,
  moduleId: string,
  collections: UserCoreLoggingCollections
): ConfigModuleSettings {
  const current = moduleSettings.modules[moduleId];
  if (!current) return moduleSettings;
  return {
    ...moduleSettings,
    modules: {
      ...moduleSettings.modules,
      [moduleId]: mergeUserCoreLoggingCollectionsIntoModuleSettings(current, collections),
    },
  };
}

export async function loadUserCoreLoggingCollectionsForEnabledModules(
  enabledModuleIds: readonly string[],
  logConfigurationId: string | number
): Promise<Partial<Record<UserCoreLoggingModuleSlug, UserCoreLoggingCollections>>> {
  const result: Partial<Record<UserCoreLoggingModuleSlug, UserCoreLoggingCollections>> = {};

  await Promise.all(
    USER_CORE_LOGGING_MODULE_SLUGS.map(async (moduleSlug) => {
      if (!enabledModuleIds.includes(moduleSlug)) return;

      const [
        coreDefectTypesResponse,
        apertureColorsResponse,
        apertureMineralsResponse,
        infillMaterialsResponse,
        surfaceShapesResponse,
        surfaceRoughnessesResponse,
        defectOpennessesResponse,
        defectCoatingsResponse,
      ] = await Promise.all([
        getUserCoreDefectTypes(moduleSlug, logConfigurationId),
        getUserApertureColors(moduleSlug, logConfigurationId),
        getUserApertureMinerals(moduleSlug, logConfigurationId),
        getUserInfillMaterials(moduleSlug, logConfigurationId),
        getUserSurfaceShapes(moduleSlug, logConfigurationId),
        getUserSurfaceRoughnesses(moduleSlug, logConfigurationId),
        getUserDefectOpennesses(moduleSlug, logConfigurationId),
        getUserDefectCoatings(moduleSlug, logConfigurationId),
      ]);

      result[moduleSlug] = {
        coreDefectTypes: parseCoreDefectTypeOptions(coreDefectTypesResponse.data, []),
        apertureColors: parseColorOptions(apertureColorsResponse.data, []),
        apertureMinerals: parseApertureMineralOptions(apertureMineralsResponse.data, []),
        infillMaterials: parseInfillMaterialOptions(infillMaterialsResponse.data, []),
        surfaceShapes: parseSurfaceShapeOptions(surfaceShapesResponse.data, []),
        surfaceRoughnesses: parseSurfaceRoughnessOptions(surfaceRoughnessesResponse.data, []),
        defectOpennesses: parseDefectOpennessOptions(defectOpennessesResponse.data, []),
        defectCoatings: parseDefectCoatingOptions(defectCoatingsResponse.data, []),
      };
    })
  );

  return result;
}

export async function persistUserCoreDefectTypes(
  moduleSlug: string,
  options: CoreDefectTypeOption[],
  logConfigurationId: string | number
): Promise<CoreDefectTypeOption[]> {
  const { data } = await saveUserCoreDefectTypes(moduleSlug, options, logConfigurationId);
  return parseCoreDefectTypeOptions(data, options);
}

export async function persistUserApertureColors(
  moduleSlug: string,
  options: ColorOption[],
  logConfigurationId: string | number
): Promise<ColorOption[]> {
  const { data } = await saveUserApertureColors(moduleSlug, options, logConfigurationId);
  return parseColorOptions(data, options);
}

export async function persistUserApertureMinerals(
  moduleSlug: string,
  options: ApertureMineralOption[],
  logConfigurationId: string | number
): Promise<ApertureMineralOption[]> {
  const { data } = await saveUserApertureMinerals(moduleSlug, options, logConfigurationId);
  return parseApertureMineralOptions(data, options);
}

export async function persistUserInfillMaterials(
  moduleSlug: string,
  options: InfillMaterialOption[],
  logConfigurationId: string | number
): Promise<InfillMaterialOption[]> {
  const { data } = await saveUserInfillMaterials(moduleSlug, options, logConfigurationId);
  return parseInfillMaterialOptions(data, options);
}

export async function persistUserSurfaceShapes(
  moduleSlug: string,
  options: SurfaceShapeOption[],
  logConfigurationId: string | number
): Promise<SurfaceShapeOption[]> {
  const { data } = await saveUserSurfaceShapes(moduleSlug, options, logConfigurationId);
  return parseSurfaceShapeOptions(data, options);
}

export async function persistUserSurfaceRoughnesses(
  moduleSlug: string,
  options: SurfaceRoughnessOption[],
  logConfigurationId: string | number
): Promise<SurfaceRoughnessOption[]> {
  const { data } = await saveUserSurfaceRoughnesses(moduleSlug, options, logConfigurationId);
  return parseSurfaceRoughnessOptions(data, options);
}

export async function persistUserDefectOpennesses(
  moduleSlug: string,
  options: DefectOpennessOption[],
  logConfigurationId: string | number
): Promise<DefectOpennessOption[]> {
  const { data } = await saveUserDefectOpennesses(moduleSlug, options, logConfigurationId);
  return parseDefectOpennessOptions(data, options);
}

export async function persistUserDefectCoatings(
  moduleSlug: string,
  options: DefectCoatingOption[],
  logConfigurationId: string | number
): Promise<DefectCoatingOption[]> {
  const { data } = await saveUserDefectCoatings(moduleSlug, options, logConfigurationId);
  return parseDefectCoatingOptions(data, options);
}
