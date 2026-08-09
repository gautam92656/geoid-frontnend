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
import { CORE_LOGGING_MODULE_ID } from "./configModules/modules/core-logging";
import {
  getUserApertureColors,
  getUserApertureMinerals,
  getUserCoreDefectTypes,
  getUserInfillMaterials,
  saveUserApertureColors,
  saveUserApertureMinerals,
  saveUserCoreDefectTypes,
  saveUserInfillMaterials,
} from "../services/configModulesApi";

/** Module slugs whose core-logging collections live in dedicated user tables. */
export const USER_CORE_LOGGING_MODULE_SLUGS = [CORE_LOGGING_MODULE_ID] as const;

export type UserCoreLoggingModuleSlug = (typeof USER_CORE_LOGGING_MODULE_SLUGS)[number];

export type UserCoreLoggingCollections = {
  coreDefectTypes: CoreDefectTypeOption[];
  apertureColors: ColorOption[];
  apertureMinerals: ApertureMineralOption[];
  infillMaterials: InfillMaterialOption[];
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

export function mergeUserCoreLoggingCollectionsIntoModuleSettings(
  moduleSettings: StoredModuleSettings,
  collections: UserCoreLoggingCollections
): StoredModuleSettings {
  return mergeUserInfillMaterialsIntoModuleSettings(
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
      ] = await Promise.all([
        getUserCoreDefectTypes(moduleSlug, logConfigurationId),
        getUserApertureColors(moduleSlug, logConfigurationId),
        getUserApertureMinerals(moduleSlug, logConfigurationId),
        getUserInfillMaterials(moduleSlug, logConfigurationId),
      ]);

      result[moduleSlug] = {
        coreDefectTypes: parseCoreDefectTypeOptions(coreDefectTypesResponse.data, []),
        apertureColors: parseColorOptions(apertureColorsResponse.data, []),
        apertureMinerals: parseApertureMineralOptions(apertureMineralsResponse.data, []),
        infillMaterials: parseInfillMaterialOptions(infillMaterialsResponse.data, []),
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
