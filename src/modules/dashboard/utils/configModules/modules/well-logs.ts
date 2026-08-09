import { isRecord } from "../helpers";
import type { ModuleNamedOption, ModuleSettingsSpec, WellLogsModuleConfig } from "../types";
import {
  DEFAULT_WELL_BACKFILL_TYPE_OPTIONS,
  toWellBackfillTypeModuleNamedOption,
} from "../wellBackfillType";
import {
  DEFAULT_WELL_CASING_TYPE_OPTIONS,
  toWellCasingTypeModuleNamedOption,
} from "../wellCasingType";
import {
  DEFAULT_WELL_CASING_TOP_TYPE_OPTIONS,
  toWellCasingTopTypeModuleNamedOption,
} from "../wellCasingTopType";
import {
  DEFAULT_WELL_COVER_TYPE_OPTIONS,
  toWellCoverTypeModuleNamedOption,
} from "../wellCoverType";
import {
  DEFAULT_WELL_PROBE_TYPE_OPTIONS,
  toWellProbeTypeModuleNamedOption,
} from "../wellProbeType";
import { DEFAULT_WELL_TYPE_OPTIONS, toWellTypeModuleNamedOption } from "../wellType";

export const WELL_LOGS_MODULE_ID = "well-logs" as const;
export const WELL_TYPES_DATA_TYPE_ID = "well-types" as const;
export const WELL_CASING_TYPES_DATA_TYPE_ID = "well-casing-types" as const;
export const WELL_COVER_TYPES_DATA_TYPE_ID = "well-cover-types" as const;
export const WELL_PROBE_TYPES_DATA_TYPE_ID = "well-probe-types" as const;
export const WELL_CASING_TOPS_DATA_TYPE_ID = "well-casing-tops" as const;
export const WELL_BACKFILL_TYPES_DATA_TYPE_ID = "well-backfill-types" as const;

export type { WellLogsModuleConfig };

const DEFAULT_ALLOW_USERS_TO_MANAGE: Record<string, boolean> = {
  "well-types": true,
  "well-casing-types": true,
  "well-cover-types": true,
  "well-probe-types": true,
  "well-casing-tops": true,
  "well-backfill-types": true,
};

function parseNamedOptionsList(value: unknown): ModuleNamedOption[] {
  if (!Array.isArray(value)) return [];
  const result: ModuleNamedOption[] = [];
  for (const entry of value) {
    if (!isRecord(entry)) continue;
    if (typeof entry.id !== "string" || typeof entry.name !== "string") continue;
    const id = entry.id.trim();
    const name = entry.name.trim();
    if (!id || !name) continue;
    result.push({ id, name });
  }
  return result;
}

export function createDefaultWellLogsConfig(): WellLogsModuleConfig {
  return {
    setDefaultWellId: false,
    defaultWellIds: [],
    allowUsersToManage: { ...DEFAULT_ALLOW_USERS_TO_MANAGE },
  };
}

export function parseWellLogsConfig(value: unknown): WellLogsModuleConfig {
  const defaults = createDefaultWellLogsConfig();
  if (!isRecord(value)) return defaults;

  const allowSource = isRecord(value.allowUsersToManage) ? value.allowUsersToManage : {};
  const allowUsersToManage: Record<string, boolean> = { ...defaults.allowUsersToManage };
  for (const [dataTypeId, entry] of Object.entries(allowSource)) {
    if (typeof entry === "boolean") allowUsersToManage[dataTypeId] = entry;
  }

  return {
    setDefaultWellId:
      typeof value.setDefaultWellId === "boolean"
        ? value.setDefaultWellId
        : defaults.setDefaultWellId,
    defaultWellIds: Array.isArray(value.defaultWellIds)
      ? parseNamedOptionsList(value.defaultWellIds)
      : defaults.defaultWellIds,
    allowUsersToManage,
  };
}

export const wellLogsModule: ModuleSettingsSpec = {
  id: WELL_LOGS_MODULE_ID,
  displayName: "Well Logs",
  dataTypes: [
    { id: "well-types", name: "Well Types", editable: true },
    { id: "well-casing-types", name: "Well Casing Types", editable: true },
    { id: "well-cover-types", name: "Well Cover Types", editable: true },
    { id: "well-probe-types", name: "Well Probe & Instrument Types", editable: true },
    { id: "well-casing-tops", name: "Well Casing Tops", editable: true },
    { id: "well-backfill-types", name: "Well Backfill Types", editable: true },
  ],
  defaultOptions: {
    "well-types": DEFAULT_WELL_TYPE_OPTIONS.map((entry) => toWellTypeModuleNamedOption(entry)),
    "well-casing-types": DEFAULT_WELL_CASING_TYPE_OPTIONS.map((entry) =>
      toWellCasingTypeModuleNamedOption(entry)
    ),
    "well-cover-types": DEFAULT_WELL_COVER_TYPE_OPTIONS.map((entry) =>
      toWellCoverTypeModuleNamedOption(entry)
    ),
    "well-probe-types": DEFAULT_WELL_PROBE_TYPE_OPTIONS.map((entry) =>
      toWellProbeTypeModuleNamedOption(entry)
    ),
    "well-casing-tops": DEFAULT_WELL_CASING_TOP_TYPE_OPTIONS.map((entry) =>
      toWellCasingTopTypeModuleNamedOption(entry)
    ),
    "well-backfill-types": DEFAULT_WELL_BACKFILL_TYPE_OPTIONS.map((entry) =>
      toWellBackfillTypeModuleNamedOption(entry)
    ),
  },
  enrichDefaults: (settings) => ({
    ...settings,
    wellLogs: createDefaultWellLogsConfig(),
  }),
  enrichParsed: (value, settings) => {
    const source = isRecord(value) && isRecord(value.wellLogs) ? value.wellLogs : value;
    return {
      ...settings,
      wellLogs: parseWellLogsConfig(source),
    };
  },
  cloneExtra: (entry) =>
    entry.wellLogs
      ? {
          wellLogs: {
            ...entry.wellLogs,
            defaultWellIds: entry.wellLogs.defaultWellIds.map((item) => ({ ...item })),
            allowUsersToManage: { ...entry.wellLogs.allowUsersToManage },
          },
        }
      : {},
};
