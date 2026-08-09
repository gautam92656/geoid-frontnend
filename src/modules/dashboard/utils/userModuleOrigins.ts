import type { ConfigModuleSettings, StoredModuleSettings } from "./configModules/types";
import {
  parseOriginOptions,
  type OriginOption,
} from "./configModules/origin";
import { SUBSURFACES_MODULE_ID } from "./configModules/modules/subsurfaces";
import {
  getUserOriginOptions,
  saveUserOriginOptions,
} from "../services/configModulesApi";

/** Module slugs whose origin options live in `log_configuration_user_origin_options`. */
export const USER_ORIGIN_MODULE_SLUGS = [SUBSURFACES_MODULE_ID] as const;

export type UserOriginModuleSlug = (typeof USER_ORIGIN_MODULE_SLUGS)[number];

export function moduleUsesUserOrigins(moduleSlug: string): moduleSlug is UserOriginModuleSlug {
  return (USER_ORIGIN_MODULE_SLUGS as readonly string[]).includes(moduleSlug);
}

export function mergeUserOriginsIntoModuleSettings(
  moduleSettings: StoredModuleSettings,
  origins: OriginOption[]
): StoredModuleSettings {
  return {
    ...moduleSettings,
    dataTypeOptions: {
      ...moduleSettings.dataTypeOptions,
      origin: origins.map((entry) => ({ ...entry })),
    },
  };
}

export function applyUserOriginsToLogConfigModuleSettings(
  moduleSettings: ConfigModuleSettings,
  moduleId: string,
  origins: OriginOption[]
): ConfigModuleSettings {
  const current = moduleSettings.modules[moduleId];
  if (!current) return moduleSettings;
  return {
    ...moduleSettings,
    modules: {
      ...moduleSettings.modules,
      [moduleId]: mergeUserOriginsIntoModuleSettings(current, origins),
    },
  };
}

export async function loadUserOriginsForEnabledModules(
  enabledModuleIds: readonly string[],
  logConfigurationId: string | number
): Promise<Partial<Record<UserOriginModuleSlug, OriginOption[]>>> {
  const origins: Partial<Record<UserOriginModuleSlug, OriginOption[]>> = {};

  await Promise.all(
    USER_ORIGIN_MODULE_SLUGS.map(async (moduleSlug) => {
      if (!enabledModuleIds.includes(moduleSlug)) return;
      const { data } = await getUserOriginOptions(moduleSlug, logConfigurationId);
      origins[moduleSlug] = parseOriginOptions(data, []);
    })
  );

  return origins;
}

export async function persistUserOrigins(
  moduleSlug: string,
  options: OriginOption[],
  logConfigurationId: string | number
): Promise<OriginOption[]> {
  const { data } = await saveUserOriginOptions(moduleSlug, options, logConfigurationId);
  return parseOriginOptions(data, options);
}
