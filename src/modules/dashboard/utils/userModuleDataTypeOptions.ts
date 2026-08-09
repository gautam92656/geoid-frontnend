import type {
  ConfigModuleSettings,
  ModuleNamedOption,
  StoredModuleSettings,
} from "./configModules/types";
import { SUBSURFACES_MODULE_ID } from "./configModules/modules/subsurfaces";
import {
  parseRockTypeOptions,
  type RockTypeOption,
} from "./configModules/rockType";
import {
  parseNonSoilTypeOptions,
  type NonSoilTypeOption,
} from "./configModules/nonSoilType";
import {
  parseFinishingReasonOptions,
  type FinishingReasonOption,
} from "./configModules/finishingReason";
import {
  parseColorOptions,
  type ColorOption,
} from "./configModules/colorOption";
import {
  parseGeomodalLayerOptions,
  type GeomodalLayerOption,
} from "./configModules/geomodalLayer";
import {
  getUserDataTypeOptions,
  saveUserDataTypeOptions,
  type ModuleDataTypeOption,
} from "../services/configModulesApi";

/** Data type ids stored in the shared user/common data-type option collections. */
export const USER_DATA_TYPE_OPTION_IDS = [
  "rock_type",
  "non_soil_type",
  "rock_texture",
  "finish-reasons",
  "finish-texts",
  "geomodal_layer",
  "colors",
] as const;

export type UserDataTypeOptionId = (typeof USER_DATA_TYPE_OPTION_IDS)[number];

export function isUserDataTypeOptionId(value: string): value is UserDataTypeOptionId {
  return (USER_DATA_TYPE_OPTION_IDS as readonly string[]).includes(value);
}

/** Modules that use DB-backed rock / non-soil catalogs. */
export const USER_DATA_TYPE_OPTION_MODULE_SLUGS = [SUBSURFACES_MODULE_ID] as const;

export type UserDataTypeOptionModuleSlug = (typeof USER_DATA_TYPE_OPTION_MODULE_SLUGS)[number];

export function moduleUsesUserDataTypeOptions(
  moduleSlug: string
): moduleSlug is UserDataTypeOptionModuleSlug {
  return (USER_DATA_TYPE_OPTION_MODULE_SLUGS as readonly string[]).includes(moduleSlug);
}

function toNamedOptions(options: ModuleDataTypeOption[]): ModuleNamedOption[] {
  return options.map((entry) => ({
    id: entry.id,
    name: entry.name,
    code: entry.code ?? null,
    abbreviation: entry.abbreviation ?? entry.code ?? null,
    graphic: entry.graphic ?? null,
    rockGroup: entry.rockGroup ?? null,
    color: entry.color ?? null,
    overlayColor: entry.overlayColor ?? null,
    textColor: entry.textColor ?? null,
    showAutoScale: entry.showAutoScale ?? true,
  }));
}

export function mergeUserDataTypeOptionsIntoModuleSettings(
  moduleSettings: StoredModuleSettings,
  dataTypeId: UserDataTypeOptionId,
  options: ModuleDataTypeOption[]
): StoredModuleSettings {
  const named = toNamedOptions(options);
  const next: StoredModuleSettings = {
    ...moduleSettings,
    dataTypeOptions: {
      ...moduleSettings.dataTypeOptions,
      [dataTypeId]: named,
    },
  };

  // Keep legacy subsurface.finishTexts mirrored for any readers still on that field.
  if (dataTypeId === "finish-texts" && next.subsurface) {
    next.subsurface = {
      ...next.subsurface,
      finishTexts: named.map((entry) => ({ id: entry.id, name: entry.name })),
    };
  }

  return next;
}

export function applyUserDataTypeOptionsToLogConfigModuleSettings(
  moduleSettings: ConfigModuleSettings,
  moduleId: string,
  dataTypeId: UserDataTypeOptionId,
  options: ModuleDataTypeOption[]
): ConfigModuleSettings {
  const current = moduleSettings.modules[moduleId];
  if (!current) return moduleSettings;
  return {
    ...moduleSettings,
    modules: {
      ...moduleSettings.modules,
      [moduleId]: mergeUserDataTypeOptionsIntoModuleSettings(current, dataTypeId, options),
    },
  };
}

export type LoadedUserDataTypeOptions = Partial<
  Record<UserDataTypeOptionModuleSlug, Partial<Record<UserDataTypeOptionId, ModuleDataTypeOption[]>>>
>;

export async function loadUserDataTypeOptionsForEnabledModules(
  enabledModuleIds: readonly string[],
  logConfigurationId: string | number
): Promise<LoadedUserDataTypeOptions> {
  const result: LoadedUserDataTypeOptions = {};

  await Promise.all(
    USER_DATA_TYPE_OPTION_MODULE_SLUGS.map(async (moduleSlug) => {
      if (!enabledModuleIds.includes(moduleSlug)) return;
      const byType: Partial<Record<UserDataTypeOptionId, ModuleDataTypeOption[]>> = {};

      await Promise.all(
        USER_DATA_TYPE_OPTION_IDS.map(async (dataTypeId) => {
          const { data } = await getUserDataTypeOptions(moduleSlug, dataTypeId, logConfigurationId);
          byType[dataTypeId] = data.map((entry) => ({ ...entry }));
        })
      );

      result[moduleSlug] = byType;
    })
  );

  return result;
}

export async function persistUserRockTypes(
  moduleSlug: string,
  options: RockTypeOption[],
  logConfigurationId: string | number
): Promise<RockTypeOption[]> {
  const { data } = await saveUserDataTypeOptions(
    moduleSlug,
    "rock_type",
    options,
    logConfigurationId
  );
  return parseRockTypeOptions(data, options);
}

export async function persistUserNonSoilTypes(
  moduleSlug: string,
  options: NonSoilTypeOption[],
  logConfigurationId: string | number
): Promise<NonSoilTypeOption[]> {
  const { data } = await saveUserDataTypeOptions(
    moduleSlug,
    "non_soil_type",
    options,
    logConfigurationId
  );
  return parseNonSoilTypeOptions(data, options);
}

export async function persistUserRockTextures(
  moduleSlug: string,
  options: ModuleNamedOption[],
  logConfigurationId: string | number
): Promise<ModuleNamedOption[]> {
  const { data } = await saveUserDataTypeOptions(
    moduleSlug,
    "rock_texture",
    options,
    logConfigurationId
  );
  return toNamedOptions(data);
}

export async function persistUserFinishingReasons(
  moduleSlug: string,
  options: FinishingReasonOption[],
  logConfigurationId: string | number
): Promise<FinishingReasonOption[]> {
  const payload = options.map((entry) => ({
    id: entry.id,
    name: entry.name,
    code: entry.abbreviation ?? "",
    abbreviation: entry.abbreviation ?? "",
    showAutoScale: entry.showAutoScale ?? true,
  }));
  const { data } = await saveUserDataTypeOptions(
    moduleSlug,
    "finish-reasons",
    payload,
    logConfigurationId
  );
  return parseFinishingReasonOptions(data, []);
}

export async function persistUserColors(
  moduleSlug: string,
  options: ColorOption[],
  logConfigurationId: string | number
): Promise<ColorOption[]> {
  const payload = options.map((entry) => ({
    id: entry.id,
    name: entry.name,
    color: entry.color ?? null,
    textColor: entry.textColor ?? null,
  }));
  const { data } = await saveUserDataTypeOptions(
    moduleSlug,
    "colors",
    payload,
    logConfigurationId
  );
  return parseColorOptions(data, options);
}

export async function persistUserGeomodalLayers(
  moduleSlug: string,
  options: GeomodalLayerOption[],
  logConfigurationId: string | number
): Promise<GeomodalLayerOption[]> {
  const payload = options.map((entry) => ({
    id: entry.id,
    name: entry.name,
    color: entry.color ?? null,
    overlayColor: entry.overlayColor ?? null,
    graphic: entry.graphic ?? null,
  }));
  const { data } = await saveUserDataTypeOptions(
    moduleSlug,
    "geomodal_layer",
    payload,
    logConfigurationId
  );
  return parseGeomodalLayerOptions(data, options);
}
