import { useCallback, useEffect, useState } from "react";
import { API_ERROR_MESSAGES } from "@/shared/constants/apiMessages";
import { showApiError } from "@/shared/utils/apiToast";
import type {
  ConfigModuleDefinition,
  ConfigModuleScope,
} from "../data/configModules";
import { listConfigModules } from "../services/configModulesApi";

type UseConfigModuleCatalogOptions = {
  /** When false, skips the request. Defaults to true. */
  enabled?: boolean;
  scope?: ConfigModuleScope;
  availableOnly?: boolean;
  logConfigurationId?: string | number;
};

export function useConfigModuleCatalog(
  options: UseConfigModuleCatalogOptions = {}
) {
  const { enabled = true, scope, availableOnly = true, logConfigurationId } = options;
  const [modules, setModules] = useState<ConfigModuleDefinition[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!enabled) {
      setModules([]);
      setLoading(false);
      setError(null);
      return [];
    }

    setLoading(true);
    setError(null);

    try {
      const result = await listConfigModules(1, 100, {
        availableOnly,
        scope,
        logConfigurationId,
      });
      setModules(result.data);
      return result.data;
    } catch (err) {
      setModules([]);
      setError(API_ERROR_MESSAGES.LOAD_CONFIG_MODULES);
      showApiError(err, API_ERROR_MESSAGES.LOAD_CONFIG_MODULES);
      return [];
    } finally {
      setLoading(false);
    }
  }, [availableOnly, enabled, logConfigurationId, scope]);

  useEffect(() => {
    if (!enabled) {
      setModules([]);
      setLoading(false);
      setError(null);
      return;
    }

    let cancelled = false;

    void (async () => {
      setLoading(true);
      setError(null);
      try {
        const result = await listConfigModules(1, 100, {
          availableOnly,
          scope,
          logConfigurationId,
        });
        if (!cancelled) setModules(result.data);
      } catch (err) {
        if (!cancelled) {
          setModules([]);
          setError(API_ERROR_MESSAGES.LOAD_CONFIG_MODULES);
          showApiError(err, API_ERROR_MESSAGES.LOAD_CONFIG_MODULES);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [availableOnly, enabled, logConfigurationId, scope]);

  return { modules, loading, error, reload, setModules };
}
