import { isRecord, option } from "../helpers";
import type { LogRemarksModuleConfig, ModuleSettingsSpec } from "../types";

export const LOG_REMARKS_MODULE_ID = "log-remarks" as const;

export type { LogRemarksModuleConfig };

const DEFAULT_ALLOW_USERS_TO_MANAGE: Record<string, boolean> = {
  "remark-types": true,
  "remarks-quick-notes": false,
};

export function createDefaultLogRemarksConfig(): LogRemarksModuleConfig {
  return {
    allowUsersToManage: { ...DEFAULT_ALLOW_USERS_TO_MANAGE },
  };
}

export function parseLogRemarksConfig(value: unknown): LogRemarksModuleConfig {
  const defaults = createDefaultLogRemarksConfig();
  if (!isRecord(value)) return defaults;

  const allowSource = isRecord(value.allowUsersToManage) ? value.allowUsersToManage : {};
  const allowUsersToManage: Record<string, boolean> = { ...defaults.allowUsersToManage };
  for (const [dataTypeId, entry] of Object.entries(allowSource)) {
    if (typeof entry === "boolean") allowUsersToManage[dataTypeId] = entry;
  }

  return { allowUsersToManage };
}

export const logRemarksModule: ModuleSettingsSpec = {
  id: LOG_REMARKS_MODULE_ID,
  displayName: "Remarks",
  dataTypes: [
    { id: "remark-types", name: "Remark Types", editable: true },
    { id: "remarks-quick-notes", name: "Remarks Quick Notes", editable: true },
  ],
  defaultOptions: {
    "remark-types": [
      option("logged-remarks", "Logged Remarks"),
      option("unlogged-remarks", "Unlogged Remarks"),
      option("l-pile-value", "L-Pile Value"),
      option("remarks", "Remarks"),
    ].map((entry) => ({ ...entry, tablogsAlias: entry.id })),
    "remarks-quick-notes": [],
  },
  enrichDefaults: (settings) => ({
    ...settings,
    remarks: createDefaultLogRemarksConfig(),
  }),
  enrichParsed: (value, settings) => {
    const source = isRecord(value) && isRecord(value.remarks) ? value.remarks : value;
    return {
      ...settings,
      remarks: parseLogRemarksConfig(source),
    };
  },
  cloneExtra: (entry) =>
    entry.remarks
      ? {
          remarks: {
            allowUsersToManage: { ...entry.remarks.allowUsersToManage },
          },
        }
      : {},
};
