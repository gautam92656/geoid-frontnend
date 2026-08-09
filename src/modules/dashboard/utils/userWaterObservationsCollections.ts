import type { ConfigModuleSettings, StoredModuleSettings } from "./configModules/types";
import {
  parseWaterObservationTypeOptions,
  toWaterObservationTypeModuleNamedOption,
  type WaterObservationTypeOption,
} from "./configModules/waterObservationType";
import { WATER_OBSERVATIONS_MODULE_ID } from "./configModules/modules/water-observations";
import {
  getUserWaterObservationTypes,
  saveUserWaterObservationTypes,
} from "../services/configModulesApi";

/** Module slugs whose water-observation-type collections live in dedicated user tables. */
export const USER_WATER_OBSERVATIONS_MODULE_SLUGS = [WATER_OBSERVATIONS_MODULE_ID] as const;

export type UserWaterObservationsModuleSlug =
  (typeof USER_WATER_OBSERVATIONS_MODULE_SLUGS)[number];

export type UserWaterObservationsCollections = {
  waterObservationTypes: WaterObservationTypeOption[];
};

export function moduleUsesUserWaterObservationsCollections(
  moduleSlug: string
): moduleSlug is UserWaterObservationsModuleSlug {
  return (USER_WATER_OBSERVATIONS_MODULE_SLUGS as readonly string[]).includes(moduleSlug);
}

export function mergeUserWaterObservationTypesIntoModuleSettings(
  moduleSettings: StoredModuleSettings,
  options: WaterObservationTypeOption[]
): StoredModuleSettings {
  return {
    ...moduleSettings,
    dataTypeOptions: {
      ...moduleSettings.dataTypeOptions,
      "water-observation-types": options.map((entry) =>
        toWaterObservationTypeModuleNamedOption(entry)
      ),
    },
  };
}

export function mergeUserWaterObservationsCollectionsIntoModuleSettings(
  moduleSettings: StoredModuleSettings,
  collections: UserWaterObservationsCollections
): StoredModuleSettings {
  return mergeUserWaterObservationTypesIntoModuleSettings(
    moduleSettings,
    collections.waterObservationTypes
  );
}

export function applyUserWaterObservationsCollectionsToLogConfigModuleSettings(
  moduleSettings: ConfigModuleSettings,
  moduleId: string,
  collections: UserWaterObservationsCollections
): ConfigModuleSettings {
  const current = moduleSettings.modules[moduleId];
  if (!current) return moduleSettings;
  return {
    ...moduleSettings,
    modules: {
      ...moduleSettings.modules,
      [moduleId]: mergeUserWaterObservationsCollectionsIntoModuleSettings(current, collections),
    },
  };
}

export async function loadUserWaterObservationsCollectionsForEnabledModules(
  enabledModuleIds: readonly string[],
  logConfigurationId: string | number
): Promise<Partial<Record<UserWaterObservationsModuleSlug, UserWaterObservationsCollections>>> {
  const result: Partial<Record<UserWaterObservationsModuleSlug, UserWaterObservationsCollections>> =
    {};

  await Promise.all(
    USER_WATER_OBSERVATIONS_MODULE_SLUGS.map(async (moduleSlug) => {
      if (!enabledModuleIds.includes(moduleSlug)) return;

      const waterObservationTypesResponse = await getUserWaterObservationTypes(
        moduleSlug,
        logConfigurationId
      );

      result[moduleSlug] = {
        waterObservationTypes: parseWaterObservationTypeOptions(
          waterObservationTypesResponse.data,
          []
        ),
      };
    })
  );

  return result;
}

export async function persistUserWaterObservationTypes(
  moduleSlug: string,
  options: WaterObservationTypeOption[],
  logConfigurationId: string | number
): Promise<WaterObservationTypeOption[]> {
  const { data } = await saveUserWaterObservationTypes(moduleSlug, options, logConfigurationId);
  return parseWaterObservationTypeOptions(data, options);
}
