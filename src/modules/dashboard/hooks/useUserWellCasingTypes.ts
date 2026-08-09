import { useCallback, useEffect, useRef, useState } from "react";
import { API_ERROR_MESSAGES } from "@/shared/constants/apiMessages";
import { showApiError } from "@/shared/utils/apiToast";
import {
  parseWellCasingTypeOptions,
  type WellCasingTypeOption,
} from "../utils/configModules/wellCasingType";
import {
  getWellCasingTypeTemplates,
  getUserWellCasingTypes,
  resetUserWellCasingTypes,
  saveUserWellCasingTypes,
} from "../services/configModulesApi";

type UseUserWellCasingTypesOptions = {
  enabled?: boolean;
  logConfigurationId: string | number;
};

function hasLogConfigurationId(id: string | number | undefined | null): id is string | number {
  return id != null && id !== "";
}

/**
 * Loads and persists well casing types for a specific log configuration,
 * seeded from common templates.
 */
export function useUserWellCasingTypes(
  moduleSlug: string,
  options: UseUserWellCasingTypesOptions
) {
  const { enabled = true, logConfigurationId } = options;
  const canLoad = enabled && hasLogConfigurationId(logConfigurationId);
  const [items, setItems] = useState<WellCasingTypeOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const latestRef = useRef<WellCasingTypeOption[]>([]);

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
      const { data } = await getUserWellCasingTypes(moduleSlug, logConfigurationId);
      const parsed = parseWellCasingTypeOptions(data, []);
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
    async (next: WellCasingTypeOption[]) => {
      if (!hasLogConfigurationId(logConfigurationId)) return [];
      setSaving(true);
      try {
        const { data } = await saveUserWellCasingTypes(moduleSlug, next, logConfigurationId);
        const saved = parseWellCasingTypeOptions(data, next);
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
      const { data } = await resetUserWellCasingTypes(moduleSlug, logConfigurationId);
      const reset = parseWellCasingTypeOptions(data, []);
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
    const { data } = await getWellCasingTypeTemplates(moduleSlug);
    return parseWellCasingTypeOptions(data, []);
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
