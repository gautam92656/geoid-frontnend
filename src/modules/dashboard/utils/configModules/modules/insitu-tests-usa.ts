import { isRecord } from "../helpers";
import type { InsituTestsModuleConfig, ModuleNamedOption, ModuleSettingsSpec } from "../types";
import { getDefaultInsituTestTypeOptions } from "../insituTestType";

export const INSITU_TESTS_USA_MODULE_ID = "insitu-tests-usa" as const;

export type { InsituTestsModuleConfig };

const DEFAULT_ALLOW_USERS_TO_MANAGE: Record<string, boolean> = {
  "testing-types": true,
};

function parseNamedOptionsList(value: unknown): ModuleNamedOption[] {
  if (!Array.isArray(value)) return [];
  const options: ModuleNamedOption[] = [];
  const seen = new Set<string>();

  for (const [index, entry] of value.entries()) {
    if (!isRecord(entry)) continue;
    const name = typeof entry.name === "string" ? entry.name.trim() : "";
    if (!name) continue;
    const key = name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    const id =
      typeof entry.id === "string" && entry.id.trim()
        ? entry.id.trim()
        : `unit-setting-${index + 1}`;
    options.push({ id, name });
  }

  return options;
}

export function createDefaultInsituTestsConfig(): InsituTestsModuleConfig {
  return {
    enableAutoAddResult: true,
    allowUsersToManage: { ...DEFAULT_ALLOW_USERS_TO_MANAGE },
    unitSettings: [],
  };
}

export function parseInsituTestsConfig(value: unknown): InsituTestsModuleConfig {
  const defaults = createDefaultInsituTestsConfig();
  if (!isRecord(value)) return defaults;

  const allowSource = isRecord(value.allowUsersToManage) ? value.allowUsersToManage : {};
  const allowUsersToManage: Record<string, boolean> = { ...defaults.allowUsersToManage };
  for (const [dataTypeId, entry] of Object.entries(allowSource)) {
    if (typeof entry === "boolean") allowUsersToManage[dataTypeId] = entry;
  }

  return {
    enableAutoAddResult:
      typeof value.enableAutoAddResult === "boolean"
        ? value.enableAutoAddResult
        : defaults.enableAutoAddResult,
    allowUsersToManage,
    unitSettings: parseNamedOptionsList(value.unitSettings),
  };
}

export const insituTestsUsaModule: ModuleSettingsSpec = {
  id: INSITU_TESTS_USA_MODULE_ID,
  displayName: "Insitu Tests",
  dataTypes: [
    { id: "testing-types", name: "Testing Types", editable: true },
    // { id: "unit-settings", name: "Unit Settings", editable: false },
  ],
  defaultOptions: {
    "testing-types": getDefaultInsituTestTypeOptions(),
  },
  enrichDefaults: (settings) => ({
    ...settings,
    insitu: createDefaultInsituTestsConfig(),
  }),
  enrichParsed: (value, settings) => {
    const source = isRecord(value) && isRecord(value.insitu) ? value.insitu : value;
    return {
      ...settings,
      insitu: parseInsituTestsConfig(source),
    };
  },
  cloneExtra: (entry) =>
    entry.insitu
      ? {
          insitu: {
            ...entry.insitu,
            allowUsersToManage: { ...entry.insitu.allowUsersToManage },
            unitSettings: entry.insitu.unitSettings.map((item) => ({ ...item })),
          },
        }
      : {},
};
