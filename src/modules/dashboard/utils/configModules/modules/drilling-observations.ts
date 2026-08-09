import { isRecord } from "../helpers";
import { createDrillingCasingOption } from "../drillingCasing";
import { createDrillingObservationOption } from "../drillingObservation";
import { createDrillingResistanceOption } from "../drillingResistance";
import {
  createDrillingTypeOption,
  type DrillingTypeOption,
} from "../drillingType";
import type { DrillingObservationsModuleConfig, ModuleSettingsSpec } from "../types";

export const DRILLING_OBSERVATIONS_MODULE_ID = "drilling-observations" as const;

export type { DrillingObservationsModuleConfig };

const DEFAULT_ALLOW_USERS_TO_MANAGE: Record<string, boolean> = {
  "drilling-types": true,
  "drilling-resistances": true,
  "drilling-observations": true,
  "drilling-casings": true,
};

function drillingType(
  id: string,
  name: string,
  graphic: string,
  partial?: Partial<DrillingTypeOption>
): DrillingTypeOption {
  return createDrillingTypeOption(id, name, { graphic, ...partial });
}

export function createDefaultDrillingObservationsConfig(): DrillingObservationsModuleConfig {
  return {
    allowUsersToManage: { ...DEFAULT_ALLOW_USERS_TO_MANAGE },
  };
}

export function parseDrillingObservationsConfig(
  value: unknown
): DrillingObservationsModuleConfig {
  const defaults = createDefaultDrillingObservationsConfig();
  if (!isRecord(value)) return defaults;

  const allowSource = isRecord(value.allowUsersToManage) ? value.allowUsersToManage : {};
  const allowUsersToManage: Record<string, boolean> = { ...defaults.allowUsersToManage };
  for (const [dataTypeId, entry] of Object.entries(allowSource)) {
    if (typeof entry === "boolean") allowUsersToManage[dataTypeId] = entry;
  }

  return { allowUsersToManage };
}

export const drillingObservationsModule: ModuleSettingsSpec = {
  id: DRILLING_OBSERVATIONS_MODULE_ID,
  displayName: "Drilling Observations",
  dataTypes: [
    { id: "drilling-types", name: "Drilling Types", editable: true },
    { id: "drilling-resistances", name: "Drilling Resistance Types", editable: true },
    { id: "drilling-observations", name: "Drilling Observations", editable: true },
    { id: "drilling-casings", name: "Drilling Casing Types", editable: true },
  ],
  defaultOptions: {
    "drilling-types": [
      drillingType("auger", "Auger", "graphic01.jpg", {
        tablogsAlias: "auger",
        logKind: "bore",
      }),
      drillingType("washbore", "Washbore", "graphic02.jpg", {
        tablogsAlias: "washbore",
        logKind: "bore",
      }),
      drillingType("coring", "Coring", "graphic03.jpg", {
        tablogsAlias: "coring",
        logKind: "core",
      }),
      drillingType("nmlc", "NMLC Coring", "graphic04.jpg", {
        tablogsAlias: "nmlc-coring",
        logKind: "core",
      }),
      drillingType("hq", "HQ Coring", "graphic05.jpg", {
        tablogsAlias: "hq-coring",
        logKind: "core",
      }),
      drillingType("direct-push", "Direct Push", "graphic06.jpg", {
        tablogsAlias: "direct-push",
        logKind: "bore",
      }),
    ],
    "drilling-resistances": [
      createDrillingResistanceOption("chatter", "Chatter", { tablogsAlias: "chatter" }),
      createDrillingResistanceOption("vibration", "Vibration", {
        tablogsAlias: "vibration",
      }),
      createDrillingResistanceOption("rig-standup", "Rig Stand-up", {
        tablogsAlias: "rig-standup",
      }),
    ],
    "drilling-observations": [
      createDrillingObservationOption("water-encountered", "Water encountered", {
        tablogsAlias: "Water encountered",
        graphic: "symbol_01.png",
        depthRequired: false,
        observationDateTimeRequired: true,
      }),
      createDrillingObservationOption("cave-in", "Cave in", {
        tablogsAlias: "Cave in",
        graphic: "symbol_13.png",
        depthRequired: true,
        observationDateTimeRequired: true,
      }),
    ],
    "drilling-casings": [
      createDrillingCasingOption("casing-200", "200mm Casing", {
        graphic: "graphic02.png",
      }),
    ],
  },
  enrichDefaults: (settings) => ({
    ...settings,
    drillingObservations: createDefaultDrillingObservationsConfig(),
  }),
  enrichParsed: (value, settings) => {
    const source =
      isRecord(value) && isRecord(value.drillingObservations)
        ? value.drillingObservations
        : value;
    return {
      ...settings,
      drillingObservations: parseDrillingObservationsConfig(source),
    };
  },
  cloneExtra: (entry) =>
    entry.drillingObservations
      ? {
          drillingObservations: {
            allowUsersToManage: { ...entry.drillingObservations.allowUsersToManage },
          },
        }
      : {},
};
