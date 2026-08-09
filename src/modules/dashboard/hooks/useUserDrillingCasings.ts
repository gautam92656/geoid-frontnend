import { useCallback, useEffect, useRef, useState } from "react";
import { API_ERROR_MESSAGES } from "@/shared/constants/apiMessages";
import { showApiError } from "@/shared/utils/apiToast";
import {
  parseDrillingCasingOptions,
  type DrillingCasingOption,
} from "../utils/configModules/drillingCasing";
import {
  getDrillingCasingTemplates,
  getUserDrillingCasings,
  resetUserDrillingCasings,
  saveUserDrillingCasings,
} from "../services/configModulesApi";

type UseUserDrillingCasingsOptions = {
  enabled?: boolean;
  logConfigurationId: string | number;
};

function hasLogConfigurationId(id: string | number | undefined | null): id is string | number {
  return id != null && id !== "";
}

/**
 * Loads and persists drilling casings for a specific log configuration,
 * seeded from common templates.
 */
export function useUserDrillingCasings(
  moduleSlug: string,
  options: UseUserDrillingCasingsOptions
) {
  const { enabled = true, logConfigurationId } = options;
  const canLoad = enabled && hasLogConfigurationId(logConfigurationId);
  const [items, setItems] = useState<DrillingCasingOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const latestRef = useRef<DrillingCasingOption[]>([]);

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
      const { data } = await getUserDrillingCasings(moduleSlug, logConfigurationId);
      const parsed = parseDrillingCasingOptions(data, []);
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
    async (next: DrillingCasingOption[]) => {
      if (!hasLogConfigurationId(logConfigurationId)) return [];
      setSaving(true);
      try {
        const { data } = await saveUserDrillingCasings(moduleSlug, next, logConfigurationId);
        const saved = parseDrillingCasingOptions(data, next);
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
      const { data } = await resetUserDrillingCasings(moduleSlug, logConfigurationId);
      const reset = parseDrillingCasingOptions(data, []);
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
    const { data } = await getDrillingCasingTemplates(moduleSlug);
    return parseDrillingCasingOptions(data, []);
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
