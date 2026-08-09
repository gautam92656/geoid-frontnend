import { isRecord } from "../helpers";
import {
  DEFAULT_LAB_TEST_PRESET_OPTIONS,
  toLabTestPresetModuleNamedOption,
} from "../labTestPreset";
import {
  DEFAULT_LAB_TEST_TYPE_OPTIONS,
  toLabTestTypeModuleNamedOption,
} from "../labTestType";
import type { LabTestsModuleConfig, ModuleSettingsSpec } from "../types";

export const LAB_TESTS_MODULE_ID = "lab-tests" as const;
export const LAB_TEST_TYPES_DATA_TYPE_ID = "lab-test-types" as const;
export const LAB_TEST_PRESETS_DATA_TYPE_ID = "lab-test-presets" as const;

export type { LabTestsModuleConfig };

const DEFAULT_ALLOW_USERS_TO_MANAGE: Record<string, boolean> = {
  [LAB_TEST_TYPES_DATA_TYPE_ID]: true,
  [LAB_TEST_PRESETS_DATA_TYPE_ID]: true,
};

export function createDefaultLabTestsConfig(): LabTestsModuleConfig {
  return {
    allowUsersToManage: { ...DEFAULT_ALLOW_USERS_TO_MANAGE },
  };
}

export function parseLabTestsConfig(value: unknown): LabTestsModuleConfig {
  const defaults = createDefaultLabTestsConfig();
  if (!isRecord(value)) return defaults;

  const allowSource = isRecord(value.allowUsersToManage) ? value.allowUsersToManage : {};
  const allowUsersToManage: Record<string, boolean> = { ...defaults.allowUsersToManage };
  for (const [dataTypeId, entry] of Object.entries(allowSource)) {
    if (typeof entry === "boolean") allowUsersToManage[dataTypeId] = entry;
  }

  return { allowUsersToManage };
}

export const labTestsModule: ModuleSettingsSpec = {
  id: LAB_TESTS_MODULE_ID,
  displayName: "Lab Tests",
  dataTypes: [
    { id: LAB_TEST_TYPES_DATA_TYPE_ID, name: "Lab Test Types", editable: true },
    { id: LAB_TEST_PRESETS_DATA_TYPE_ID, name: "Lab Test Presets", editable: true },
  ],
  defaultOptions: {
    [LAB_TEST_TYPES_DATA_TYPE_ID]: DEFAULT_LAB_TEST_TYPE_OPTIONS.map((entry) =>
      toLabTestTypeModuleNamedOption(entry)
    ),
    [LAB_TEST_PRESETS_DATA_TYPE_ID]: DEFAULT_LAB_TEST_PRESET_OPTIONS.map((entry) =>
      toLabTestPresetModuleNamedOption(entry)
    ),
  },
  enrichDefaults: (settings) => ({
    ...settings,
    labTests: createDefaultLabTestsConfig(),
  }),
  enrichParsed: (value, settings) => {
    const source = isRecord(value) && isRecord(value.labTests) ? value.labTests : value;
    return {
      ...settings,
      labTests: parseLabTestsConfig(source),
    };
  },
  cloneExtra: (entry) =>
    entry.labTests
      ? {
          labTests: {
            ...entry.labTests,
            allowUsersToManage: { ...entry.labTests.allowUsersToManage },
          },
        }
      : {},
};
