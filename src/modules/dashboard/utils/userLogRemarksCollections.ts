import type { ConfigModuleSettings, StoredModuleSettings } from "./configModules/types";
import {
  parseRemarkTypeOptions,
  toRemarkTypeModuleNamedOption,
  type RemarkTypeOption,
} from "./configModules/remarkType";
import {
  parseRemarksQuickNoteOptions,
  toRemarksQuickNoteModuleNamedOption,
  type RemarksQuickNoteOption,
} from "./configModules/remarksQuickNote";
import { LOG_REMARKS_MODULE_ID } from "./configModules/modules/log-remarks";
import {
  getUserRemarkTypes,
  getUserRemarksQuickNotes,
  saveUserRemarkTypes,
  saveUserRemarksQuickNotes,
} from "../services/configModulesApi";

/** Module slugs whose log-remarks collections live in dedicated user tables. */
export const USER_LOG_REMARKS_MODULE_SLUGS = [LOG_REMARKS_MODULE_ID] as const;

export type UserLogRemarksModuleSlug = (typeof USER_LOG_REMARKS_MODULE_SLUGS)[number];

export type UserLogRemarksCollections = {
  remarkTypes: RemarkTypeOption[];
  quickNotes: RemarksQuickNoteOption[];
};

export function moduleUsesUserLogRemarksCollections(
  moduleSlug: string
): moduleSlug is UserLogRemarksModuleSlug {
  return (USER_LOG_REMARKS_MODULE_SLUGS as readonly string[]).includes(moduleSlug);
}

export function mergeUserRemarkTypesIntoModuleSettings(
  moduleSettings: StoredModuleSettings,
  options: RemarkTypeOption[]
): StoredModuleSettings {
  return {
    ...moduleSettings,
    dataTypeOptions: {
      ...moduleSettings.dataTypeOptions,
      "remark-types": options.map((entry) => toRemarkTypeModuleNamedOption(entry)),
    },
  };
}

export function mergeUserRemarksQuickNotesIntoModuleSettings(
  moduleSettings: StoredModuleSettings,
  options: RemarksQuickNoteOption[]
): StoredModuleSettings {
  return {
    ...moduleSettings,
    dataTypeOptions: {
      ...moduleSettings.dataTypeOptions,
      "remarks-quick-notes": options.map((entry) => toRemarksQuickNoteModuleNamedOption(entry)),
    },
  };
}

export function mergeUserLogRemarksCollectionsIntoModuleSettings(
  moduleSettings: StoredModuleSettings,
  collections: UserLogRemarksCollections
): StoredModuleSettings {
  return mergeUserRemarksQuickNotesIntoModuleSettings(
    mergeUserRemarkTypesIntoModuleSettings(moduleSettings, collections.remarkTypes),
    collections.quickNotes
  );
}

export function applyUserLogRemarksCollectionsToLogConfigModuleSettings(
  moduleSettings: ConfigModuleSettings,
  moduleId: string,
  collections: UserLogRemarksCollections
): ConfigModuleSettings {
  const current = moduleSettings.modules[moduleId];
  if (!current) return moduleSettings;
  return {
    ...moduleSettings,
    modules: {
      ...moduleSettings.modules,
      [moduleId]: mergeUserLogRemarksCollectionsIntoModuleSettings(current, collections),
    },
  };
}

export async function loadUserLogRemarksCollectionsForEnabledModules(
  enabledModuleIds: readonly string[],
  logConfigurationId: string | number
): Promise<Partial<Record<UserLogRemarksModuleSlug, UserLogRemarksCollections>>> {
  const result: Partial<Record<UserLogRemarksModuleSlug, UserLogRemarksCollections>> = {};

  await Promise.all(
    USER_LOG_REMARKS_MODULE_SLUGS.map(async (moduleSlug) => {
      if (!enabledModuleIds.includes(moduleSlug)) return;

      const [remarkTypesResponse, quickNotesResponse] = await Promise.all([
        getUserRemarkTypes(moduleSlug, logConfigurationId),
        getUserRemarksQuickNotes(moduleSlug, logConfigurationId),
      ]);

      result[moduleSlug] = {
        remarkTypes: parseRemarkTypeOptions(remarkTypesResponse.data, []),
        quickNotes: parseRemarksQuickNoteOptions(quickNotesResponse.data, []),
      };
    })
  );

  return result;
}

export async function persistUserRemarkTypes(
  moduleSlug: string,
  options: RemarkTypeOption[],
  logConfigurationId: string | number
): Promise<RemarkTypeOption[]> {
  const { data } = await saveUserRemarkTypes(moduleSlug, options, logConfigurationId);
  return parseRemarkTypeOptions(data, options);
}

export async function persistUserRemarksQuickNotes(
  moduleSlug: string,
  options: RemarksQuickNoteOption[],
  logConfigurationId: string | number
): Promise<RemarksQuickNoteOption[]> {
  const { data } = await saveUserRemarksQuickNotes(moduleSlug, options, logConfigurationId);
  return parseRemarksQuickNoteOptions(data, options);
}
