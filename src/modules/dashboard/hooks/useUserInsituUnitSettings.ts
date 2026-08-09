import { useCallback, useEffect, useRef, useState } from "react";
import { API_ERROR_MESSAGES } from "@/shared/constants/apiMessages";
import { showApiError } from "@/shared/utils/apiToast";
import type { ModuleNamedOption } from "../utils/configModules/types";
import {
  getInsituUnitSettingTemplates,
  getUserInsituUnitSettings,
  resetUserInsituUnitSettings,
  saveUserInsituUnitSettings,
  type InsituUnitSettingOption,
} from "../services/configModulesApi";

type UseUserInsituUnitSettingsOptions = {
  enabled?: boolean;
  logConfigurationId: string | number;
};

function hasLogConfigurationId(id: string | number | undefined | null): id is string | number {
  return id != null && id !== "";
}

function parseNamedOptions(
  value: readonly InsituUnitSettingOption[] | unknown,
  fallback: readonly ModuleNamedOption[] = []
): ModuleNamedOption[] {
  if (!Array.isArray(value)) {
    return fallback.map((entry) => ({ id: entry.id, name: entry.name }));
  }

  const options: ModuleNamedOption[] = [];
  const seen = new Set<string>();

  for (const [index, entry] of value.entries()) {
    if (!entry || typeof entry !== "object") continue;
    const record = entry as Record<string, unknown>;
    const name = typeof record.name === "string" ? record.name.trim() : "";
    if (!name) continue;
    const key = name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    const id =
      typeof record.id === "string" && record.id.trim()
        ? record.id.trim()
        : `unit-setting-${index + 1}`;
    options.push({ id, name });
  }

  return options;
}

/**
 * Loads and persists insitu unit settings for a specific log configuration
 * (`log_configuration_user_insitu_unit_settings`), seeded from common templates.
 */
export function useUserInsituUnitSettings(
  moduleSlug: string,
  options: UseUserInsituUnitSettingsOptions
) {
  const { enabled = true, logConfigurationId } = options;
  const canLoad = enabled && hasLogConfigurationId(logConfigurationId);
  const [items, setItems] = useState<ModuleNamedOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const latestRef = useRef<ModuleNamedOption[]>([]);

  const reload = useCallback(async () => {
    if (!canLoad) {
      setItems([]);
      setLoading(false);
      setError(null);
      return [];
    }

    setLoading(true);
    setError(null);

    try {
      const { data } = await getUserInsituUnitSettings(moduleSlug, logConfigurationId);
      const parsed = parseNamedOptions(data, []);
      latestRef.current = parsed;
      setItems(parsed);
      return parsed;
    } catch (err) {
      setItems([]);
      setError(API_ERROR_MESSAGES.LOAD_CONFIG_MODULES);
      showApiError(err, API_ERROR_MESSAGES.LOAD_CONFIG_MODULES);
      return [];
    } finally {
      setLoading(false);
    }
  }, [canLoad, logConfigurationId, moduleSlug]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const save = useCallback(
    async (next: ModuleNamedOption[]) => {
      if (!hasLogConfigurationId(logConfigurationId)) return [];
      setSaving(true);
      try {
        const payload = next.map((entry) => ({ id: entry.id, name: entry.name }));
        const { data } = await saveUserInsituUnitSettings(
          moduleSlug,
          payload,
          logConfigurationId
        );
        const saved = parseNamedOptions(data, payload);
        latestRef.current = saved;
        setItems(saved);
        return saved;
      } catch (err) {
        showApiError(err, API_ERROR_MESSAGES.UPDATE_LOG_CONFIGURATION);
        throw err;
      } finally {
        setSaving(false);
      }
    },
    [logConfigurationId, moduleSlug]
  );

  const resetToTemplate = useCallback(async () => {
    if (!hasLogConfigurationId(logConfigurationId)) return [];
    setSaving(true);
    try {
      const { data } = await resetUserInsituUnitSettings(moduleSlug, logConfigurationId);
      const reset = parseNamedOptions(data, []);
      latestRef.current = reset;
      setItems(reset);
      return reset;
    } catch (err) {
      showApiError(err, API_ERROR_MESSAGES.UPDATE_LOG_CONFIGURATION);
      throw err;
    } finally {
      setSaving(false);
    }
  }, [logConfigurationId, moduleSlug]);

  const loadTemplate = useCallback(async () => {
    const { data } = await getInsituUnitSettingTemplates(moduleSlug);
    return parseNamedOptions(data, []);
  }, [moduleSlug]);

  return {
    items,
    loading,
    saving,
    error,
    reload,
    save,
    resetToTemplate,
    loadTemplate,
    setItems,
  };
}
