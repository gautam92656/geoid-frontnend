import type { ConfigModuleSettings, ModuleNamedOption, StoredModuleSettings } from "./configModules/types";
import {
  parseWellTypeOptions,
  toWellTypeModuleNamedOption,
  type WellTypeOption,
} from "./configModules/wellType";
import {
  parseWellCasingTypeOptions,
  toWellCasingTypeModuleNamedOption,
  type WellCasingTypeOption,
} from "./configModules/wellCasingType";
import {
  parseWellCasingTopTypeOptions,
  toWellCasingTopTypeModuleNamedOption,
  type WellCasingTopTypeOption,
} from "./configModules/wellCasingTopType";
import {
  parseWellCoverTypeOptions,
  toWellCoverTypeModuleNamedOption,
  type WellCoverTypeOption,
} from "./configModules/wellCoverType";
import {
  parseWellProbeTypeOptions,
  toWellProbeTypeModuleNamedOption,
  type WellProbeTypeOption,
} from "./configModules/wellProbeType";
import {
  parseWellBackfillTypeOptions,
  toWellBackfillTypeModuleNamedOption,
  type WellBackfillTypeOption,
} from "./configModules/wellBackfillType";
import {
  WELL_BACKFILL_TYPES_DATA_TYPE_ID,
  WELL_CASING_TOPS_DATA_TYPE_ID,
  WELL_CASING_TYPES_DATA_TYPE_ID,
  WELL_COVER_TYPES_DATA_TYPE_ID,
  WELL_LOGS_MODULE_ID,
  WELL_PROBE_TYPES_DATA_TYPE_ID,
  WELL_TYPES_DATA_TYPE_ID,
  createDefaultWellLogsConfig,
} from "./configModules/modules/well-logs";
import {
  getUserWellBackfillTypes,
  getUserWellCasingTops,
  getUserWellCasingTypes,
  getUserWellCoverTypes,
  getUserWellDefaultWellIds,
  getUserWellProbeTypes,
  getUserWellTypes,
  saveUserWellBackfillTypes,
  saveUserWellCasingTops,
  saveUserWellCasingTypes,
  saveUserWellCoverTypes,
  saveUserWellDefaultWellIds,
  saveUserWellProbeTypes,
  saveUserWellTypes,
  type WellDefaultWellIdOption,
} from "../services/configModulesApi";

export const DEFAULT_WELL_IDS_DATA_TYPE_ID = "default-well-ids" as const;

/** Module slugs whose well-logs collections live in dedicated user tables. */
export const USER_WELL_LOGS_MODULE_SLUGS = [WELL_LOGS_MODULE_ID] as const;

export type UserWellLogsModuleSlug = (typeof USER_WELL_LOGS_MODULE_SLUGS)[number];

export type UserWellLogsCollections = {
  wellTypes: WellTypeOption[];
  wellCasingTypes: WellCasingTypeOption[];
  wellCasingTops: WellCasingTopTypeOption[];
  wellCoverTypes: WellCoverTypeOption[];
  wellProbeTypes: WellProbeTypeOption[];
  wellBackfillTypes: WellBackfillTypeOption[];
  defaultWellIds: ModuleNamedOption[];
};

export function moduleUsesUserWellLogsCollections(
  moduleSlug: string
): moduleSlug is UserWellLogsModuleSlug {
  return (USER_WELL_LOGS_MODULE_SLUGS as readonly string[]).includes(moduleSlug);
}

function parseNamedOptions(value: unknown): ModuleNamedOption[] {
  if (!Array.isArray(value)) return [];
  const result: ModuleNamedOption[] = [];
  const seen = new Set<string>();
  for (const entry of value) {
    if (!entry || typeof entry !== "object") continue;
    const record = entry as Record<string, unknown>;
    const name = typeof record.name === "string" ? record.name.trim() : "";
    if (!name) continue;
    const id =
      typeof record.id === "string" && record.id.trim()
        ? record.id.trim()
        : `well-id-${result.length + 1}`;
    const key = name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    result.push({ id, name });
  }
  return result;
}

export function mergeUserWellTypesIntoModuleSettings(
  moduleSettings: StoredModuleSettings,
  options: WellTypeOption[]
): StoredModuleSettings {
  return {
    ...moduleSettings,
    dataTypeOptions: {
      ...moduleSettings.dataTypeOptions,
      [WELL_TYPES_DATA_TYPE_ID]: options.map((entry) => toWellTypeModuleNamedOption(entry)),
    },
  };
}

export function mergeUserWellCasingTypesIntoModuleSettings(
  moduleSettings: StoredModuleSettings,
  options: WellCasingTypeOption[]
): StoredModuleSettings {
  return {
    ...moduleSettings,
    dataTypeOptions: {
      ...moduleSettings.dataTypeOptions,
      [WELL_CASING_TYPES_DATA_TYPE_ID]: options.map((entry) =>
        toWellCasingTypeModuleNamedOption(entry)
      ),
    },
  };
}

export function mergeUserWellCasingTopsIntoModuleSettings(
  moduleSettings: StoredModuleSettings,
  options: WellCasingTopTypeOption[]
): StoredModuleSettings {
  return {
    ...moduleSettings,
    dataTypeOptions: {
      ...moduleSettings.dataTypeOptions,
      [WELL_CASING_TOPS_DATA_TYPE_ID]: options.map((entry) =>
        toWellCasingTopTypeModuleNamedOption(entry)
      ),
    },
  };
}

export function mergeUserWellCoverTypesIntoModuleSettings(
  moduleSettings: StoredModuleSettings,
  options: WellCoverTypeOption[]
): StoredModuleSettings {
  return {
    ...moduleSettings,
    dataTypeOptions: {
      ...moduleSettings.dataTypeOptions,
      [WELL_COVER_TYPES_DATA_TYPE_ID]: options.map((entry) =>
        toWellCoverTypeModuleNamedOption(entry)
      ),
    },
  };
}

export function mergeUserWellProbeTypesIntoModuleSettings(
  moduleSettings: StoredModuleSettings,
  options: WellProbeTypeOption[]
): StoredModuleSettings {
  return {
    ...moduleSettings,
    dataTypeOptions: {
      ...moduleSettings.dataTypeOptions,
      [WELL_PROBE_TYPES_DATA_TYPE_ID]: options.map((entry) =>
        toWellProbeTypeModuleNamedOption(entry)
      ),
    },
  };
}

export function mergeUserWellBackfillTypesIntoModuleSettings(
  moduleSettings: StoredModuleSettings,
  options: WellBackfillTypeOption[]
): StoredModuleSettings {
  return {
    ...moduleSettings,
    dataTypeOptions: {
      ...moduleSettings.dataTypeOptions,
      [WELL_BACKFILL_TYPES_DATA_TYPE_ID]: options.map((entry) =>
        toWellBackfillTypeModuleNamedOption(entry)
      ),
    },
  };
}

export function mergeUserWellDefaultWellIdsIntoModuleSettings(
  moduleSettings: StoredModuleSettings,
  options: ModuleNamedOption[]
): StoredModuleSettings {
  const named = options.map((entry) => ({ id: entry.id, name: entry.name }));
  const wellLogs = moduleSettings.wellLogs ?? createDefaultWellLogsConfig();
  return {
    ...moduleSettings,
    dataTypeOptions: {
      ...moduleSettings.dataTypeOptions,
      [DEFAULT_WELL_IDS_DATA_TYPE_ID]: named,
    },
    wellLogs: {
      ...wellLogs,
      defaultWellIds: named,
    },
  };
}

export function mergeUserWellLogsCollectionsIntoModuleSettings(
  moduleSettings: StoredModuleSettings,
  collections: UserWellLogsCollections
): StoredModuleSettings {
  return mergeUserWellDefaultWellIdsIntoModuleSettings(
    mergeUserWellBackfillTypesIntoModuleSettings(
      mergeUserWellProbeTypesIntoModuleSettings(
        mergeUserWellCoverTypesIntoModuleSettings(
          mergeUserWellCasingTopsIntoModuleSettings(
            mergeUserWellCasingTypesIntoModuleSettings(
              mergeUserWellTypesIntoModuleSettings(moduleSettings, collections.wellTypes),
              collections.wellCasingTypes
            ),
            collections.wellCasingTops
          ),
          collections.wellCoverTypes
        ),
        collections.wellProbeTypes
      ),
      collections.wellBackfillTypes
    ),
    collections.defaultWellIds
  );
}

export function applyUserWellLogsCollectionsToLogConfigModuleSettings(
  moduleSettings: ConfigModuleSettings,
  moduleId: string,
  collections: UserWellLogsCollections
): ConfigModuleSettings {
  const current = moduleSettings.modules[moduleId];
  if (!current) return moduleSettings;
  return {
    ...moduleSettings,
    modules: {
      ...moduleSettings.modules,
      [moduleId]: mergeUserWellLogsCollectionsIntoModuleSettings(current, collections),
    },
  };
}

export async function loadUserWellLogsCollectionsForEnabledModules(
  enabledModuleIds: readonly string[],
  logConfigurationId: string | number
): Promise<Partial<Record<UserWellLogsModuleSlug, UserWellLogsCollections>>> {
  const result: Partial<Record<UserWellLogsModuleSlug, UserWellLogsCollections>> = {};

  await Promise.all(
    USER_WELL_LOGS_MODULE_SLUGS.map(async (moduleSlug) => {
      if (!enabledModuleIds.includes(moduleSlug)) return;

      const [
        wellTypesResponse,
        wellCasingTypesResponse,
        wellCasingTopsResponse,
        wellCoverTypesResponse,
        wellProbeTypesResponse,
        wellBackfillTypesResponse,
        defaultWellIdsResponse,
      ] = await Promise.all([
        getUserWellTypes(moduleSlug, logConfigurationId),
        getUserWellCasingTypes(moduleSlug, logConfigurationId),
        getUserWellCasingTops(moduleSlug, logConfigurationId),
        getUserWellCoverTypes(moduleSlug, logConfigurationId),
        getUserWellProbeTypes(moduleSlug, logConfigurationId),
        getUserWellBackfillTypes(moduleSlug, logConfigurationId),
        getUserWellDefaultWellIds(moduleSlug, logConfigurationId),
      ]);

      result[moduleSlug] = {
        wellTypes: parseWellTypeOptions(wellTypesResponse.data, []),
        wellCasingTypes: parseWellCasingTypeOptions(wellCasingTypesResponse.data, []),
        wellCasingTops: parseWellCasingTopTypeOptions(wellCasingTopsResponse.data, []),
        wellCoverTypes: parseWellCoverTypeOptions(wellCoverTypesResponse.data, []),
        wellProbeTypes: parseWellProbeTypeOptions(wellProbeTypesResponse.data, []),
        wellBackfillTypes: parseWellBackfillTypeOptions(wellBackfillTypesResponse.data, []),
        defaultWellIds: parseNamedOptions(defaultWellIdsResponse.data),
      };
    })
  );

  return result;
}

export async function persistUserWellTypes(
  moduleSlug: string,
  options: WellTypeOption[],
  logConfigurationId: string | number
): Promise<WellTypeOption[]> {
  const { data } = await saveUserWellTypes(moduleSlug, options, logConfigurationId);
  return parseWellTypeOptions(data, options);
}

export async function persistUserWellCasingTypes(
  moduleSlug: string,
  options: WellCasingTypeOption[],
  logConfigurationId: string | number
): Promise<WellCasingTypeOption[]> {
  const { data } = await saveUserWellCasingTypes(moduleSlug, options, logConfigurationId);
  return parseWellCasingTypeOptions(data, options);
}

export async function persistUserWellCasingTops(
  moduleSlug: string,
  options: WellCasingTopTypeOption[],
  logConfigurationId: string | number
): Promise<WellCasingTopTypeOption[]> {
  const { data } = await saveUserWellCasingTops(moduleSlug, options, logConfigurationId);
  return parseWellCasingTopTypeOptions(data, options);
}

export async function persistUserWellCoverTypes(
  moduleSlug: string,
  options: WellCoverTypeOption[],
  logConfigurationId: string | number
): Promise<WellCoverTypeOption[]> {
  const { data } = await saveUserWellCoverTypes(moduleSlug, options, logConfigurationId);
  return parseWellCoverTypeOptions(data, options);
}

export async function persistUserWellProbeTypes(
  moduleSlug: string,
  options: WellProbeTypeOption[],
  logConfigurationId: string | number
): Promise<WellProbeTypeOption[]> {
  const { data } = await saveUserWellProbeTypes(moduleSlug, options, logConfigurationId);
  return parseWellProbeTypeOptions(data, options);
}

export async function persistUserWellBackfillTypes(
  moduleSlug: string,
  options: WellBackfillTypeOption[],
  logConfigurationId: string | number
): Promise<WellBackfillTypeOption[]> {
  const { data } = await saveUserWellBackfillTypes(moduleSlug, options, logConfigurationId);
  return parseWellBackfillTypeOptions(data, options);
}

export async function persistUserWellDefaultWellIds(
  moduleSlug: string,
  options: WellDefaultWellIdOption[],
  logConfigurationId: string | number
): Promise<ModuleNamedOption[]> {
  const { data } = await saveUserWellDefaultWellIds(moduleSlug, options, logConfigurationId);
  return parseNamedOptions(data);
}
