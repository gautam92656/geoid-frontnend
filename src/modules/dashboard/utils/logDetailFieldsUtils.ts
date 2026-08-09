import {
  DEFAULT_LOG_DETAIL_FIELD_ENABLED,
  DEFAULT_LOG_DETAIL_FIELD_OPTIONS,
  LOG_DETAIL_FIELD_KEYS,
  MANAGEABLE_LOG_DETAIL_FIELD_KEYS,
  type LogDetailFieldKey,
  type ManageableLogDetailFieldKey,
} from "../data/logDetailFields";

export type LogDetailFieldsSettings = {
  enabled: Record<LogDetailFieldKey, boolean>;
  options: Record<ManageableLogDetailFieldKey, string[]>;
};

function createDefaultOptions(): Record<ManageableLogDetailFieldKey, string[]> {
  return MANAGEABLE_LOG_DETAIL_FIELD_KEYS.reduce(
    (acc, key) => {
      acc[key] = [...DEFAULT_LOG_DETAIL_FIELD_OPTIONS[key]];
      return acc;
    },
    {} as Record<ManageableLogDetailFieldKey, string[]>
  );
}

export const DEFAULT_LOG_DETAIL_FIELDS_SETTINGS: LogDetailFieldsSettings = {
  enabled: { ...DEFAULT_LOG_DETAIL_FIELD_ENABLED },
  options: createDefaultOptions(),
};

function isLogDetailFieldKey(value: string): value is LogDetailFieldKey {
  return (LOG_DETAIL_FIELD_KEYS as readonly string[]).includes(value);
}

export function isManageableLogDetailFieldKey(
  value: string
): value is ManageableLogDetailFieldKey {
  return (MANAGEABLE_LOG_DETAIL_FIELD_KEYS as readonly string[]).includes(value);
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

export function parseLogDetailFieldsSettings(value: unknown): LogDetailFieldsSettings {
  const defaults = DEFAULT_LOG_DETAIL_FIELDS_SETTINGS;

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
      if (isLogDetailFieldKey(key) && typeof enabledValue === "boolean") {
        enabled[key] = enabledValue;
      }
    }
  }

  if (record.options && typeof record.options === "object") {
    for (const [key, optionValues] of Object.entries(record.options)) {
      if (isManageableLogDetailFieldKey(key)) {
        const normalized = normalizeOptionList(optionValues);
        options[key] = normalized.length > 0 ? normalized : [...defaults.options[key]];
      }
    }
  }

  return { enabled, options };
}

export function cloneLogDetailFieldsSettings(
  settings: LogDetailFieldsSettings
): LogDetailFieldsSettings {
  return {
    enabled: { ...settings.enabled },
    options: MANAGEABLE_LOG_DETAIL_FIELD_KEYS.reduce(
      (acc, key) => {
        acc[key] = [...settings.options[key]];
        return acc;
      },
      {} as Record<ManageableLogDetailFieldKey, string[]>
    ),
  };
}
