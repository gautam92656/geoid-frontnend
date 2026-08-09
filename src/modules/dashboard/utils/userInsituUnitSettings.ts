import type {
  ConfigModuleSettings,
  ModuleNamedOption,
  StoredModuleSettings,
} from "./configModules/types";
import {
  createDefaultInsituTestsConfig,
  INSITU_TESTS_USA_MODULE_ID,
} from "./configModules/modules/insitu-tests-usa";
import {
  getUserInsituUnitSettings,
  saveUserInsituUnitSettings,
  type InsituUnitSettingOption,
} from "../services/configModulesApi";

/** Module slugs whose unit settings live in `log_configuration_user_insitu_unit_settings`. */
export const USER_INSITU_UNIT_SETTING_MODULE_SLUGS = [INSITU_TESTS_USA_MODULE_ID] as const;

export type UserInsituUnitSettingModuleSlug =
  (typeof USER_INSITU_UNIT_SETTING_MODULE_SLUGS)[number];

export function moduleUsesUserInsituUnitSettings(
  moduleSlug: string
): moduleSlug is UserInsituUnitSettingModuleSlug {
  return (USER_INSITU_UNIT_SETTING_MODULE_SLUGS as readonly string[]).includes(moduleSlug);
}

function parseUnitSettingOptions(
  value: readonly InsituUnitSettingOption[] | unknown,
  fallback: readonly ModuleNamedOption[] = []
): ModuleNamedOption[] {
  if (!Array.isArray(value)) {
    return fallback.map((entry) => ({ id: entry.id, name: entry.name }));
  }

  const options: ModuleNamedOption[] = [];
  const seen = new Set<string>();

  for (const [index, entry] of value.entries()) {
    if (!entry || typeof entry !== "object") continue;
    const record = entry as Record<string, unknown>;
    const name = typeof record.name === "string" ? record.name.trim() : "";
    if (!name) continue;
    const key = name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    const id =
      typeof record.id === "string" && record.id.trim()
        ? record.id.trim()
        : `unit-setting-${index + 1}`;
    options.push({ id, name });
  }

  return options;
}

export function mergeUserInsituUnitSettingsIntoModuleSettings(
  moduleSettings: StoredModuleSettings,
  unitSettings: ModuleNamedOption[]
): StoredModuleSettings {
  const insitu = moduleSettings.insitu ?? createDefaultInsituTestsConfig();
  return {
    ...moduleSettings,
    insitu: {
      ...insitu,
      allowUsersToManage: { ...insitu.allowUsersToManage },
      unitSettings: unitSettings.map((entry) => ({ id: entry.id, name: entry.name })),
    },
  };
}

export function applyUserInsituUnitSettingsToLogConfigModuleSettings(
  moduleSettings: ConfigModuleSettings,
  moduleId: string,
  unitSettings: ModuleNamedOption[]
): ConfigModuleSettings {
  const current = moduleSettings.modules[moduleId];
  if (!current) return moduleSettings;
  return {
    ...moduleSettings,
    modules: {
      ...moduleSettings.modules,
      [moduleId]: mergeUserInsituUnitSettingsIntoModuleSettings(current, unitSettings),
    },
  };
}

export async function loadUserInsituUnitSettingsForEnabledModules(
  enabledModuleIds: readonly string[],
  logConfigurationId: string | number
): Promise<Partial<Record<UserInsituUnitSettingModuleSlug, ModuleNamedOption[]>>> {
  const result: Partial<Record<UserInsituUnitSettingModuleSlug, ModuleNamedOption[]>> = {};

  await Promise.all(
    USER_INSITU_UNIT_SETTING_MODULE_SLUGS.map(async (moduleSlug) => {
      if (!enabledModuleIds.includes(moduleSlug)) return;
      const { data } = await getUserInsituUnitSettings(moduleSlug, logConfigurationId);
      result[moduleSlug] = parseUnitSettingOptions(data, []);
    })
  );

  return result;
}

export async function persistUserInsituUnitSettings(
  moduleSlug: string,
  options: ModuleNamedOption[],
  logConfigurationId: string | number
): Promise<ModuleNamedOption[]> {
  const payload = options.map((entry) => ({ id: entry.id, name: entry.name }));
  const { data } = await saveUserInsituUnitSettings(moduleSlug, payload, logConfigurationId);
  return parseUnitSettingOptions(data, payload);
}
