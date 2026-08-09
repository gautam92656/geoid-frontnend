import { useCallback, useEffect, useRef, useState } from "react";
import { API_ERROR_MESSAGES } from "@/shared/constants/apiMessages";
import { showApiError } from "@/shared/utils/apiToast";
import {
  parseInsituTestTypeOptions,
  type InsituTestTypeOption,
} from "../utils/configModules/insituTestType";
import {
  getInsituTestTypeTemplates,
  getUserInsituTestTypes,
  resetUserInsituTestTypes,
  saveUserInsituTestTypes,
} from "../services/configModulesApi";

type UseUserInsituTestTypesOptions = {
  enabled?: boolean;
  logConfigurationId: string | number;
};

function hasLogConfigurationId(id: string | number | undefined | null): id is string | number {
  return id != null && id !== "";
}

/**
 * Loads and persists insitu testing types for a specific log configuration
 * (`log_configuration_user_insitu_test_types`), seeded from common templates.
 */
export function useUserInsituTestTypes(
  moduleSlug: string,
  options: UseUserInsituTestTypesOptions
) {
  const { enabled = true, logConfigurationId } = options;
  const canLoad = enabled && hasLogConfigurationId(logConfigurationId);
  const [items, setItems] = useState<InsituTestTypeOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const latestRef = useRef<InsituTestTypeOption[]>([]);

  const reload = useCallback(async () => {
    if (!canLoad) {
      setItems([]);
      setLoading(false);
      setLoaded(false);
      setError(null);
      return [];
    }

    setLoading(true);
    setError(null);

    try {
      const { data } = await getUserInsituTestTypes(moduleSlug, logConfigurationId);
      const parsed = parseInsituTestTypeOptions(data, []);
      latestRef.current = parsed;
      setItems(parsed);
      setLoaded(true);
      return parsed;
    } catch (err) {
      setItems([]);
      setLoaded(true);
      setError(API_ERROR_MESSAGES.LOAD_CONFIG_MODULES);
      showApiError(err, API_ERROR_MESSAGES.LOAD_CONFIG_MODULES);
      return [];
    } finally {
      setLoading(false);
    }
  }, [canLoad, logConfigurationId, moduleSlug]);

  useEffect(() => {
    if (!canLoad) {
      setItems([]);
      setLoading(false);
      setLoaded(false);
      setError(null);
      return;
    }
    // Mark loading on the enable transition so consumers don't treat the
    // pre-fetch empty state as "ready".
    setLoading(true);
    setLoaded(false);
    void reload();
  }, [canLoad, reload]);

  const save = useCallback(
    async (next: InsituTestTypeOption[]) => {
      if (!hasLogConfigurationId(logConfigurationId)) return [];
      setSaving(true);
      try {
        const { data } = await saveUserInsituTestTypes(moduleSlug, next, logConfigurationId);
        const saved = parseInsituTestTypeOptions(data, next);
        latestRef.current = saved;
        setItems(saved);
        setLoaded(true);
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
      const { data } = await resetUserInsituTestTypes(moduleSlug, logConfigurationId);
      const reset = parseInsituTestTypeOptions(data, []);
      latestRef.current = reset;
      setItems(reset);
      setLoaded(true);
      return reset;
    } catch (err) {
      showApiError(err, API_ERROR_MESSAGES.UPDATE_LOG_CONFIGURATION);
      throw err;
    } finally {
      setSaving(false);
    }
  }, [logConfigurationId, moduleSlug]);

  const loadTemplate = useCallback(async () => {
    const { data } = await getInsituTestTypeTemplates(moduleSlug);
    return parseInsituTestTypeOptions(data, []);
  }, [moduleSlug]);

  return {
    items,
    loading: canLoad ? loading || !loaded : false,
    loaded,
    saving,
    error,
    reload,
    save,
    resetToTemplate,
    loadTemplate,
    setItems,
  };
}
