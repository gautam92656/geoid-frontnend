import {
  DEFAULT_PROJECT_DETAIL_FIELD_OPTIONS,
  MANAGEABLE_PROJECT_DETAIL_FIELD_KEYS,
  PROJECT_DETAIL_FIELD_KEYS,
  type ManageableProjectDetailFieldKey,
  type ProjectDetailFieldKey,
} from "../data/projectDetailFields";

export type ProjectDetailFieldsSettings = {
  enabled: Record<ProjectDetailFieldKey, boolean>;
  options: Record<ManageableProjectDetailFieldKey, string[]>;
};

function createDefaultEnabledFields(): Record<ProjectDetailFieldKey, boolean> {
  return PROJECT_DETAIL_FIELD_KEYS.reduce(
    (acc, key) => {
      acc[key] = true;
      return acc;
    },
    {} as Record<ProjectDetailFieldKey, boolean>
  );
}

function createDefaultOptions(): Record<ManageableProjectDetailFieldKey, string[]> {
  return MANAGEABLE_PROJECT_DETAIL_FIELD_KEYS.reduce(
    (acc, key) => {
      acc[key] = [...DEFAULT_PROJECT_DETAIL_FIELD_OPTIONS[key]];
      return acc;
    },
    {} as Record<ManageableProjectDetailFieldKey, string[]>
  );
}

export const DEFAULT_PROJECT_DETAIL_FIELDS_SETTINGS: ProjectDetailFieldsSettings = {
  enabled: createDefaultEnabledFields(),
  options: createDefaultOptions(),
};

function isProjectDetailFieldKey(value: string): value is ProjectDetailFieldKey {
  return (PROJECT_DETAIL_FIELD_KEYS as readonly string[]).includes(value);
}

export function isManageableProjectDetailFieldKey(
  value: string
): value is ManageableProjectDetailFieldKey {
  return (MANAGEABLE_PROJECT_DETAIL_FIELD_KEYS as readonly string[]).includes(value);
}

function normalizeOptionList(values: unknown): string[] {
  if (!Array.isArray(values)) return [];

  const seen = new Set<string>();
  const normalized: string[] = [];

  for (const value of values) {
    if (typeof value !== "string") continue;
    const trimmed = value.trim();
    if (!trimmed) continue;
    const dedupeKey = trimmed.toLowerCase();
    if (seen.has(dedupeKey)) continue;
    seen.add(dedupeKey);
    normalized.push(trimmed);
  }

  return normalized;
}

export function parseProjectDetailFieldsSettings(
  value: unknown
): ProjectDetailFieldsSettings {
  const defaults = DEFAULT_PROJECT_DETAIL_FIELDS_SETTINGS;

  if (!value || typeof value !== "object") {
    return {
      enabled: { ...defaults.enabled },
      options: createDefaultOptions(),
    };
  }

  const record = value as Record<string, unknown>;
  const enabled = { ...defaults.enabled };
  const options = createDefaultOptions();

  if (record.enabled && typeof record.enabled === "object") {
    for (const [key, enabledValue] of Object.entries(record.enabled)) {
      if (isProjectDetailFieldKey(key) && typeof enabledValue === "boolean") {
        enabled[key] = enabledValue;
      }
    }
  }

  if (record.options && typeof record.options === "object") {
    for (const [key, optionValues] of Object.entries(record.options)) {
      if (isManageableProjectDetailFieldKey(key)) {
        const normalized = normalizeOptionList(optionValues);
        options[key] = normalized.length > 0 ? normalized : [...defaults.options[key]];
      }
    }
  }

  return { enabled, options };
}

export function cloneProjectDetailFieldsSettings(
  settings: ProjectDetailFieldsSettings
): ProjectDetailFieldsSettings {
  return {
    enabled: { ...settings.enabled },
    options: MANAGEABLE_PROJECT_DETAIL_FIELD_KEYS.reduce(
      (acc, key) => {
        acc[key] = [...settings.options[key]];
        return acc;
      },
      {} as Record<ManageableProjectDetailFieldKey, string[]>
    ),
  };
}
