import { useCallback, useEffect, useRef, useState } from "react";
import { API_ERROR_MESSAGES } from "@/shared/constants/apiMessages";
import { showApiError } from "@/shared/utils/apiToast";
import {
  parseOriginOptions,
  type OriginOption,
} from "../utils/configModules/origin";
import {
  getOriginOptionTemplates,
  getUserOriginOptions,
  resetUserOriginOptions,
  saveUserOriginOptions,
} from "../services/configModulesApi";

type UseUserModuleOriginsOptions = {
  enabled?: boolean;
  logConfigurationId: string | number;
};

function hasLogConfigurationId(id: string | number | undefined | null): id is string | number {
  return id != null && id !== "";
}

/**
 * Loads and persists origin options for a specific log configuration
 * (`log_configuration_user_origin_options`), seeded from common templates.
 */
export function useUserModuleOrigins(
  moduleSlug: string,
  options: UseUserModuleOriginsOptions
) {
  const { enabled = true, logConfigurationId } = options;
  const canLoad = enabled && hasLogConfigurationId(logConfigurationId);
  const [origins, setOrigins] = useState<OriginOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const latestRef = useRef<OriginOption[]>([]);

  const reload = useCallback(async () => {
    if (!canLoad) {
      setOrigins([]);
      setLoading(false);
      setError(null);
      return [];
    }

    setLoading(true);
    setError(null);

    try {
      const { data } = await getUserOriginOptions(moduleSlug, logConfigurationId);
      const parsed = parseOriginOptions(data, []);
      latestRef.current = parsed;
      setOrigins(parsed);
      return parsed;
    } catch (err) {
      setOrigins([]);
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
    async (next: OriginOption[]) => {
      if (!hasLogConfigurationId(logConfigurationId)) return [];
      setSaving(true);
      try {
        const { data } = await saveUserOriginOptions(moduleSlug, next, logConfigurationId);
        const saved = parseOriginOptions(data, next);
        latestRef.current = saved;
        setOrigins(saved);
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
      const { data } = await resetUserOriginOptions(moduleSlug, logConfigurationId);
      const reset = parseOriginOptions(data, []);
      latestRef.current = reset;
      setOrigins(reset);
      return reset;
    } catch (err) {
      showApiError(err, API_ERROR_MESSAGES.UPDATE_LOG_CONFIGURATION);
      throw err;
    } finally {
      setSaving(false);
    }
  }, [logConfigurationId, moduleSlug]);

  const loadTemplate = useCallback(async () => {
    const { data } = await getOriginOptionTemplates(moduleSlug);
    return parseOriginOptions(data, []);
  }, [moduleSlug]);

  return {
    origins,
    loading,
    saving,
    error,
    reload,
    save,
    resetToTemplate,
    loadTemplate,
    setOrigins,
  };
}
