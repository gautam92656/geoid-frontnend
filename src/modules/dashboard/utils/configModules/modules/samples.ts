import { isRecord } from "../helpers";
import {
  DEFAULT_AUTO_SAMPLE_ID_FORMAT_STRING,
  normalizeAutoSampleIdFormatString,
} from "../sampleIdFormat";
import { DEFAULT_SAMPLE_TYPE_OPTIONS, toSampleTypeModuleNamedOption } from "../sampleType";
import type { ModuleSettingsSpec, SamplesModuleConfig } from "../types";

export const SAMPLES_MODULE_ID = "samples" as const;

export type { SamplesModuleConfig };

const DEFAULT_ALLOW_USERS_TO_MANAGE: Record<string, boolean> = {
  "sample-types": true,
  "sample-ids": true,
};

export function createDefaultSamplesConfig(): SamplesModuleConfig {
  return {
    includeUniqueSampleCode: false,
    autoSampleIdFormat: true,
    autoSampleIdFormatString: DEFAULT_AUTO_SAMPLE_ID_FORMAT_STRING,
    projectLevelSampleId: false,
    noDuplicateSampleId: false,
    allowUsersToManage: { ...DEFAULT_ALLOW_USERS_TO_MANAGE },
  };
}

export function parseSamplesConfig(value: unknown): SamplesModuleConfig {
  const defaults = createDefaultSamplesConfig();
  if (!isRecord(value)) return defaults;

  const allowSource = isRecord(value.allowUsersToManage) ? value.allowUsersToManage : {};
  const allowUsersToManage: Record<string, boolean> = { ...defaults.allowUsersToManage };
  for (const [dataTypeId, entry] of Object.entries(allowSource)) {
    if (typeof entry === "boolean") allowUsersToManage[dataTypeId] = entry;
  }

  const formatRaw =
    value.autoSampleIdFormatString ??
    value.autoSampleIDFormatString ??
    value.auto_sample_id_format_string;

  return {
    includeUniqueSampleCode:
      typeof value.includeUniqueSampleCode === "boolean"
        ? value.includeUniqueSampleCode
        : defaults.includeUniqueSampleCode,
    autoSampleIdFormat:
      typeof value.autoSampleIdFormat === "boolean"
        ? value.autoSampleIdFormat
        : typeof value.autoSampleIDFormat === "boolean"
          ? value.autoSampleIDFormat
          : defaults.autoSampleIdFormat,
    autoSampleIdFormatString: normalizeAutoSampleIdFormatString(formatRaw),
    projectLevelSampleId:
      typeof value.projectLevelSampleId === "boolean"
        ? value.projectLevelSampleId
        : typeof value.enableProjectManageSampleId === "boolean"
          ? value.enableProjectManageSampleId
          : defaults.projectLevelSampleId,
    noDuplicateSampleId:
      typeof value.noDuplicateSampleId === "boolean"
        ? value.noDuplicateSampleId
        : defaults.noDuplicateSampleId,
    allowUsersToManage,
  };
}

export const samplesModule: ModuleSettingsSpec = {
  id: SAMPLES_MODULE_ID,
  displayName: "Samples",
  dataTypes: [
    { id: "sample-types", name: "Sample Types", editable: true },
    { id: "sample-ids", name: "Sample ID", editable: true },
  ],
  defaultOptions: {
    "sample-types": DEFAULT_SAMPLE_TYPE_OPTIONS.map((entry) =>
      toSampleTypeModuleNamedOption(entry)
    ),
    "sample-ids": [],
  },
  enrichDefaults: (settings) => ({
    ...settings,
    samples: createDefaultSamplesConfig(),
  }),
  enrichParsed: (value, settings) => {
    const source = isRecord(value) && isRecord(value.samples) ? value.samples : value;
    return {
      ...settings,
      samples: parseSamplesConfig(source),
    };
  },
  cloneExtra: (entry) =>
    entry.samples
      ? {
          samples: {
            ...entry.samples,
            allowUsersToManage: { ...entry.samples.allowUsersToManage },
          },
        }
      : {},
};
