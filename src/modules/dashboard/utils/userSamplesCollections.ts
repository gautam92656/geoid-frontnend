import type { ConfigModuleSettings, StoredModuleSettings } from "./configModules/types";
import {
  parseSampleTypeOptions,
  toSampleTypeModuleNamedOption,
  type SampleTypeOption,
} from "./configModules/sampleType";
import { SAMPLES_MODULE_ID } from "./configModules/modules/samples";
import { getUserSampleTypes, saveUserSampleTypes } from "../services/configModulesApi";

/** Module slugs whose sample-type collections live in dedicated user tables. */
export const USER_SAMPLES_MODULE_SLUGS = [SAMPLES_MODULE_ID] as const;

export type UserSamplesModuleSlug = (typeof USER_SAMPLES_MODULE_SLUGS)[number];

export type UserSamplesCollections = {
  sampleTypes: SampleTypeOption[];
};

export function moduleUsesUserSamplesCollections(
  moduleSlug: string
): moduleSlug is UserSamplesModuleSlug {
  return (USER_SAMPLES_MODULE_SLUGS as readonly string[]).includes(moduleSlug);
}

export function mergeUserSampleTypesIntoModuleSettings(
  moduleSettings: StoredModuleSettings,
  options: SampleTypeOption[]
): StoredModuleSettings {
  return {
    ...moduleSettings,
    dataTypeOptions: {
      ...moduleSettings.dataTypeOptions,
      "sample-types": options.map((entry) => toSampleTypeModuleNamedOption(entry)),
    },
  };
}

export function mergeUserSamplesCollectionsIntoModuleSettings(
  moduleSettings: StoredModuleSettings,
  collections: UserSamplesCollections
): StoredModuleSettings {
  return mergeUserSampleTypesIntoModuleSettings(moduleSettings, collections.sampleTypes);
}

export function applyUserSamplesCollectionsToLogConfigModuleSettings(
  moduleSettings: ConfigModuleSettings,
  moduleId: string,
  collections: UserSamplesCollections
): ConfigModuleSettings {
  const current = moduleSettings.modules[moduleId];
  if (!current) return moduleSettings;
  return {
    ...moduleSettings,
    modules: {
      ...moduleSettings.modules,
      [moduleId]: mergeUserSamplesCollectionsIntoModuleSettings(current, collections),
    },
  };
}

export async function loadUserSamplesCollectionsForEnabledModules(
  enabledModuleIds: readonly string[],
  logConfigurationId: string | number
): Promise<Partial<Record<UserSamplesModuleSlug, UserSamplesCollections>>> {
  const result: Partial<Record<UserSamplesModuleSlug, UserSamplesCollections>> = {};

  await Promise.all(
    USER_SAMPLES_MODULE_SLUGS.map(async (moduleSlug) => {
      if (!enabledModuleIds.includes(moduleSlug)) return;

      const sampleTypesResponse = await getUserSampleTypes(moduleSlug, logConfigurationId);

      result[moduleSlug] = {
        sampleTypes: parseSampleTypeOptions(sampleTypesResponse.data, []),
      };
    })
  );

  return result;
}

export async function persistUserSampleTypes(
  moduleSlug: string,
  options: SampleTypeOption[],
  logConfigurationId: string | number
): Promise<SampleTypeOption[]> {
  const { data } = await saveUserSampleTypes(moduleSlug, options, logConfigurationId);
  return parseSampleTypeOptions(data, options);
}
