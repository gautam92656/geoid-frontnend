import type { ConfigModuleSettings, StoredModuleSettings } from "./configModules/types";
import {
  parseDrillingTypeOptions,
  toDrillingTypeModuleNamedOption,
  type DrillingTypeOption,
} from "./configModules/drillingType";
import {
  parseDrillingResistanceOptions,
  toDrillingResistanceModuleNamedOption,
  type DrillingResistanceOption,
} from "./configModules/drillingResistance";
import {
  parseDrillingObservationOptions,
  toDrillingObservationModuleNamedOption,
  type DrillingObservationOption,
} from "./configModules/drillingObservation";
import {
  parseDrillingCasingOptions,
  toDrillingCasingModuleNamedOption,
  type DrillingCasingOption,
} from "./configModules/drillingCasing";
import { DRILLING_OBSERVATIONS_MODULE_ID } from "./configModules/modules/drilling-observations";
import {
  getUserDrillingCasings,
  getUserDrillingObservations,
  getUserDrillingResistances,
  getUserDrillingTypes,
  saveUserDrillingCasings,
  saveUserDrillingObservations,
  saveUserDrillingResistances,
  saveUserDrillingTypes,
} from "../services/configModulesApi";

/** Module slugs whose drilling-observations collections live in dedicated user tables. */
export const USER_DRILLING_OBSERVATIONS_MODULE_SLUGS = [
  DRILLING_OBSERVATIONS_MODULE_ID,
] as const;

export type UserDrillingObservationsModuleSlug =
  (typeof USER_DRILLING_OBSERVATIONS_MODULE_SLUGS)[number];

export type UserDrillingObservationsCollections = {
  drillingTypes: DrillingTypeOption[];
  drillingResistances: DrillingResistanceOption[];
  drillingObservations: DrillingObservationOption[];
  drillingCasings: DrillingCasingOption[];
};

export function moduleUsesUserDrillingObservationsCollections(
  moduleSlug: string
): moduleSlug is UserDrillingObservationsModuleSlug {
  return (USER_DRILLING_OBSERVATIONS_MODULE_SLUGS as readonly string[]).includes(moduleSlug);
}

export function mergeUserDrillingTypesIntoModuleSettings(
  moduleSettings: StoredModuleSettings,
  options: DrillingTypeOption[]
): StoredModuleSettings {
  return {
    ...moduleSettings,
    dataTypeOptions: {
      ...moduleSettings.dataTypeOptions,
      "drilling-types": options.map((entry) => toDrillingTypeModuleNamedOption(entry)),
    },
  };
}

export function mergeUserDrillingResistancesIntoModuleSettings(
  moduleSettings: StoredModuleSettings,
  options: DrillingResistanceOption[]
): StoredModuleSettings {
  return {
    ...moduleSettings,
    dataTypeOptions: {
      ...moduleSettings.dataTypeOptions,
      "drilling-resistances": options.map((entry) =>
        toDrillingResistanceModuleNamedOption(entry)
      ),
    },
  };
}

export function mergeUserDrillingObservationsIntoModuleSettings(
  moduleSettings: StoredModuleSettings,
  options: DrillingObservationOption[]
): StoredModuleSettings {
  return {
    ...moduleSettings,
    dataTypeOptions: {
      ...moduleSettings.dataTypeOptions,
      "drilling-observations": options.map((entry) =>
        toDrillingObservationModuleNamedOption(entry)
      ),
    },
  };
}

export function mergeUserDrillingCasingsIntoModuleSettings(
  moduleSettings: StoredModuleSettings,
  options: DrillingCasingOption[]
): StoredModuleSettings {
  return {
    ...moduleSettings,
    dataTypeOptions: {
      ...moduleSettings.dataTypeOptions,
      "drilling-casings": options.map((entry) => toDrillingCasingModuleNamedOption(entry)),
    },
  };
}

export function mergeUserDrillingObservationsCollectionsIntoModuleSettings(
  moduleSettings: StoredModuleSettings,
  collections: UserDrillingObservationsCollections
): StoredModuleSettings {
  return mergeUserDrillingCasingsIntoModuleSettings(
    mergeUserDrillingObservationsIntoModuleSettings(
      mergeUserDrillingResistancesIntoModuleSettings(
        mergeUserDrillingTypesIntoModuleSettings(moduleSettings, collections.drillingTypes),
        collections.drillingResistances
      ),
      collections.drillingObservations
    ),
    collections.drillingCasings
  );
}

export function applyUserDrillingObservationsCollectionsToLogConfigModuleSettings(
  moduleSettings: ConfigModuleSettings,
  moduleId: string,
  collections: UserDrillingObservationsCollections
): ConfigModuleSettings {
  const current = moduleSettings.modules[moduleId];
  if (!current) return moduleSettings;
  return {
    ...moduleSettings,
    modules: {
      ...moduleSettings.modules,
      [moduleId]: mergeUserDrillingObservationsCollectionsIntoModuleSettings(
        current,
        collections
      ),
    },
  };
}

export async function loadUserDrillingObservationsCollectionsForEnabledModules(
  enabledModuleIds: readonly string[],
  logConfigurationId: string | number
): Promise<
  Partial<Record<UserDrillingObservationsModuleSlug, UserDrillingObservationsCollections>>
> {
  const result: Partial<
    Record<UserDrillingObservationsModuleSlug, UserDrillingObservationsCollections>
  > = {};

  await Promise.all(
    USER_DRILLING_OBSERVATIONS_MODULE_SLUGS.map(async (moduleSlug) => {
      if (!enabledModuleIds.includes(moduleSlug)) return;

      const [
        drillingTypesResponse,
        drillingResistancesResponse,
        drillingObservationsResponse,
        drillingCasingsResponse,
      ] = await Promise.all([
        getUserDrillingTypes(moduleSlug, logConfigurationId),
        getUserDrillingResistances(moduleSlug, logConfigurationId),
        getUserDrillingObservations(moduleSlug, logConfigurationId),
        getUserDrillingCasings(moduleSlug, logConfigurationId),
      ]);

      result[moduleSlug] = {
        drillingTypes: parseDrillingTypeOptions(drillingTypesResponse.data, []),
        drillingResistances: parseDrillingResistanceOptions(
          drillingResistancesResponse.data,
          []
        ),
        drillingObservations: parseDrillingObservationOptions(
          drillingObservationsResponse.data,
          []
        ),
        drillingCasings: parseDrillingCasingOptions(drillingCasingsResponse.data, []),
      };
    })
  );

  return result;
}

export async function persistUserDrillingTypes(
  moduleSlug: string,
  options: DrillingTypeOption[],
  logConfigurationId: string | number
): Promise<DrillingTypeOption[]> {
  const { data } = await saveUserDrillingTypes(moduleSlug, options, logConfigurationId);
  return parseDrillingTypeOptions(data, options);
}

export async function persistUserDrillingResistances(
  moduleSlug: string,
  options: DrillingResistanceOption[],
  logConfigurationId: string | number
): Promise<DrillingResistanceOption[]> {
  const { data } = await saveUserDrillingResistances(moduleSlug, options, logConfigurationId);
  return parseDrillingResistanceOptions(data, options);
}

export async function persistUserDrillingObservations(
  moduleSlug: string,
  options: DrillingObservationOption[],
  logConfigurationId: string | number
): Promise<DrillingObservationOption[]> {
  const { data } = await saveUserDrillingObservations(moduleSlug, options, logConfigurationId);
  return parseDrillingObservationOptions(data, options);
}

export async function persistUserDrillingCasings(
  moduleSlug: string,
  options: DrillingCasingOption[],
  logConfigurationId: string | number
): Promise<DrillingCasingOption[]> {
  const { data } = await saveUserDrillingCasings(moduleSlug, options, logConfigurationId);
  return parseDrillingCasingOptions(data, options);
}
