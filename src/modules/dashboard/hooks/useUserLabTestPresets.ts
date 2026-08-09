import { useCallback, useEffect, useRef, useState } from "react";
import { API_ERROR_MESSAGES } from "@/shared/constants/apiMessages";
import { showApiError } from "@/shared/utils/apiToast";
import {
  parseLabTestPresetOptions,
  type LabTestPresetOption,
} from "../utils/configModules/labTestPreset";
import {
  getLabTestPresetTemplates,
  getUserLabTestPresets,
  resetUserLabTestPresets,
  saveUserLabTestPresets,
} from "../services/configModulesApi";

type UseUserLabTestPresetsOptions = {
  enabled?: boolean;
  logConfigurationId: string | number;
};

function hasLogConfigurationId(id: string | number | undefined | null): id is string | number {
  return id != null && id !== "";
}

/** Loads and persists lab test presets for a specific log configuration. */
export function useUserLabTestPresets(moduleSlug: string, options: UseUserLabTestPresetsOptions) {
  const { enabled = true, logConfigurationId } = options;
  const canLoad = enabled && hasLogConfigurationId(logConfigurationId);
  const [items, setItems] = useState<LabTestPresetOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const latestRef = useRef<LabTestPresetOption[]>([]);

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
      const { data } = await getUserLabTestPresets(moduleSlug, logConfigurationId);
      const parsed = parseLabTestPresetOptions(data, []);
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
    async (next: LabTestPresetOption[]) => {
      if (!hasLogConfigurationId(logConfigurationId)) return [];
      setSaving(true);
      try {
        const { data } = await saveUserLabTestPresets(moduleSlug, next, logConfigurationId);
        const saved = parseLabTestPresetOptions(data, next);
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
      const { data } = await resetUserLabTestPresets(moduleSlug, logConfigurationId);
      const reset = parseLabTestPresetOptions(data, []);
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
    const { data } = await getLabTestPresetTemplates(moduleSlug);
    return parseLabTestPresetOptions(data, []);
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
