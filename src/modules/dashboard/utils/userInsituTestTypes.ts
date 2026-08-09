import type { ConfigModuleSettings, StoredModuleSettings } from "./configModules/types";
import {
  parseInsituTestTypeOptions,
  toInsituTestTypeModuleNamedOption,
  type InsituTestTypeOption,
} from "./configModules/insituTestType";
import { INSITU_TESTS_USA_MODULE_ID } from "./configModules/modules/insitu-tests-usa";
import {
  getUserInsituTestTypes,
  saveUserInsituTestTypes,
} from "../services/configModulesApi";

/** Module slugs whose testing types live in `log_configuration_user_insitu_test_types`. */
export const USER_INSITU_TEST_TYPE_MODULE_SLUGS = [INSITU_TESTS_USA_MODULE_ID] as const;

export type UserInsituTestTypeModuleSlug = (typeof USER_INSITU_TEST_TYPE_MODULE_SLUGS)[number];

export function moduleUsesUserInsituTestTypes(
  moduleSlug: string
): moduleSlug is UserInsituTestTypeModuleSlug {
  return (USER_INSITU_TEST_TYPE_MODULE_SLUGS as readonly string[]).includes(moduleSlug);
}

export function mergeUserInsituTestTypesIntoModuleSettings(
  moduleSettings: StoredModuleSettings,
  options: InsituTestTypeOption[]
): StoredModuleSettings {
  return {
    ...moduleSettings,
    dataTypeOptions: {
      ...moduleSettings.dataTypeOptions,
      "testing-types": options.map((entry) => toInsituTestTypeModuleNamedOption(entry)),
    },
  };
}

export function applyUserInsituTestTypesToLogConfigModuleSettings(
  moduleSettings: ConfigModuleSettings,
  moduleId: string,
  options: InsituTestTypeOption[]
): ConfigModuleSettings {
  const current = moduleSettings.modules[moduleId];
  if (!current) return moduleSettings;
  return {
    ...moduleSettings,
    modules: {
      ...moduleSettings.modules,
      [moduleId]: mergeUserInsituTestTypesIntoModuleSettings(current, options),
    },
  };
}

export async function loadUserInsituTestTypesForEnabledModules(
  enabledModuleIds: readonly string[],
  logConfigurationId: string | number
): Promise<Partial<Record<UserInsituTestTypeModuleSlug, InsituTestTypeOption[]>>> {
  const result: Partial<Record<UserInsituTestTypeModuleSlug, InsituTestTypeOption[]>> = {};

  await Promise.all(
    USER_INSITU_TEST_TYPE_MODULE_SLUGS.map(async (moduleSlug) => {
      if (!enabledModuleIds.includes(moduleSlug)) return;
      const { data } = await getUserInsituTestTypes(moduleSlug, logConfigurationId);
      result[moduleSlug] = parseInsituTestTypeOptions(data, []);
    })
  );

  return result;
}

export async function persistUserInsituTestTypes(
  moduleSlug: string,
  options: InsituTestTypeOption[],
  logConfigurationId: string | number
): Promise<InsituTestTypeOption[]> {
  const { data } = await saveUserInsituTestTypes(moduleSlug, options, logConfigurationId);
  return parseInsituTestTypeOptions(data, options);
}
