import {
  DEFAULT_WATER_OBSERVATION_TYPE_OPTIONS,
  createWaterObservationTypeOption,
} from "../waterObservationType";
import { isRecord } from "../helpers";
import type { ModuleSettingsSpec, WaterObservationsModuleConfig } from "../types";

export const WATER_OBSERVATIONS_MODULE_ID = "water-observations" as const;

export type { WaterObservationsModuleConfig };

const DEFAULT_ALLOW_USERS_TO_MANAGE: Record<string, boolean> = {
  "water-observation-types": true,
};

export function createDefaultWaterObservationsConfig(): WaterObservationsModuleConfig {
  return {
    allowLinkingToWellId: false,
    allowUsersToManage: { ...DEFAULT_ALLOW_USERS_TO_MANAGE },
  };
}

export function parseWaterObservationsConfig(value: unknown): WaterObservationsModuleConfig {
  const defaults = createDefaultWaterObservationsConfig();
  if (!isRecord(value)) return defaults;

  const allowSource = isRecord(value.allowUsersToManage) ? value.allowUsersToManage : {};
  const allowUsersToManage: Record<string, boolean> = { ...defaults.allowUsersToManage };
  for (const [dataTypeId, entry] of Object.entries(allowSource)) {
    if (typeof entry === "boolean") allowUsersToManage[dataTypeId] = entry;
  }

  return {
    allowLinkingToWellId:
      typeof value.allowLinkingToWellId === "boolean"
        ? value.allowLinkingToWellId
        : defaults.allowLinkingToWellId,
    allowUsersToManage,
  };
}

export const waterObservationsModule: ModuleSettingsSpec = {
  id: WATER_OBSERVATIONS_MODULE_ID,
  displayName: "Water Observations",
  dataTypes: [
    { id: "water-observation-types", name: "Water Observation Types", editable: true },
  ],
  defaultOptions: {
    "water-observation-types": DEFAULT_WATER_OBSERVATION_TYPE_OPTIONS.map((entry) =>
      createWaterObservationTypeOption(entry.id, entry.name, entry)
    ),
  },
  enrichDefaults: (settings) => ({
    ...settings,
    waterObservations: createDefaultWaterObservationsConfig(),
  }),
  enrichParsed: (value, settings) => {
    const source =
      isRecord(value) && isRecord(value.waterObservations) ? value.waterObservations : value;
    return {
      ...settings,
      waterObservations: parseWaterObservationsConfig(source),
    };
  },
  cloneExtra: (entry) =>
    entry.waterObservations
      ? {
          waterObservations: {
            ...entry.waterObservations,
            allowUsersToManage: { ...entry.waterObservations.allowUsersToManage },
          },
        }
      : {},
};
