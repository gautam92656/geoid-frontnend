import type { ConfigModuleSettings, StoredModuleSettings } from "./configModules/types";
import {
  parseLabTestTypeOptions,
  toLabTestTypeModuleNamedOption,
  type LabTestTypeOption,
} from "./configModules/labTestType";
import {
  parseLabTestPresetOptions,
  toLabTestPresetModuleNamedOption,
  type LabTestPresetOption,
} from "./configModules/labTestPreset";
import { LAB_TESTS_MODULE_ID } from "./configModules/modules/lab-tests";
import {
  getUserLabTestPresets,
  getUserLabTestTypes,
  saveUserLabTestPresets,
  saveUserLabTestTypes,
} from "../services/configModulesApi";

/** Module slugs whose lab-test collections live in dedicated user tables. */
export const USER_LAB_TESTS_MODULE_SLUGS = [LAB_TESTS_MODULE_ID] as const;

export type UserLabTestsModuleSlug = (typeof USER_LAB_TESTS_MODULE_SLUGS)[number];

export type UserLabTestsCollections = {
  labTestTypes: LabTestTypeOption[];
  labTestPresets: LabTestPresetOption[];
};

export function moduleUsesUserLabTestsCollections(
  moduleSlug: string
): moduleSlug is UserLabTestsModuleSlug {
  return (USER_LAB_TESTS_MODULE_SLUGS as readonly string[]).includes(moduleSlug);
}

export function mergeUserLabTestsCollectionsIntoModuleSettings(
  moduleSettings: StoredModuleSettings,
  collections: UserLabTestsCollections
): StoredModuleSettings {
  return {
    ...moduleSettings,
    dataTypeOptions: {
      ...moduleSettings.dataTypeOptions,
      "lab-test-types": collections.labTestTypes.map((entry) =>
        toLabTestTypeModuleNamedOption(entry)
      ),
      "lab-test-presets": collections.labTestPresets.map((entry) =>
        toLabTestPresetModuleNamedOption(entry)
      ),
    },
  };
}

export function applyUserLabTestsCollectionsToLogConfigModuleSettings(
  moduleSettings: ConfigModuleSettings,
  moduleId: string,
  collections: UserLabTestsCollections
): ConfigModuleSettings {
  const current = moduleSettings.modules[moduleId];
  if (!current) return moduleSettings;
  return {
    ...moduleSettings,
    modules: {
      ...moduleSettings.modules,
      [moduleId]: mergeUserLabTestsCollectionsIntoModuleSettings(current, collections),
    },
  };
}

export async function loadUserLabTestsCollectionsForEnabledModules(
  enabledModuleIds: readonly string[],
  logConfigurationId: string | number
): Promise<Partial<Record<UserLabTestsModuleSlug, UserLabTestsCollections>>> {
  const result: Partial<Record<UserLabTestsModuleSlug, UserLabTestsCollections>> = {};

  await Promise.all(
    USER_LAB_TESTS_MODULE_SLUGS.map(async (moduleSlug) => {
      if (!enabledModuleIds.includes(moduleSlug)) return;

      const [labTestTypesResponse, labTestPresetsResponse] = await Promise.all([
        getUserLabTestTypes(moduleSlug, logConfigurationId),
        getUserLabTestPresets(moduleSlug, logConfigurationId),
      ]);

      result[moduleSlug] = {
        labTestTypes: parseLabTestTypeOptions(labTestTypesResponse.data, []),
        labTestPresets: parseLabTestPresetOptions(labTestPresetsResponse.data, []),
      };
    })
  );

  return result;
}

export async function persistUserLabTestTypes(
  moduleSlug: string,
  options: LabTestTypeOption[],
  logConfigurationId: string | number
): Promise<LabTestTypeOption[]> {
  const { data } = await saveUserLabTestTypes(moduleSlug, options, logConfigurationId);
  return parseLabTestTypeOptions(data, options);
}

export async function persistUserLabTestPresets(
  moduleSlug: string,
  options: LabTestPresetOption[],
  logConfigurationId: string | number
): Promise<LabTestPresetOption[]> {
  const { data } = await saveUserLabTestPresets(moduleSlug, options, logConfigurationId);
  return parseLabTestPresetOptions(data, options);
}
