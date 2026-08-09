import { useCallback, useEffect, useRef, useState } from "react";
import { API_ERROR_MESSAGES } from "@/shared/constants/apiMessages";
import { showApiError } from "@/shared/utils/apiToast";
import type { WorkflowSettings } from "../utils/configModules/types";
import {
  normalizeWorkflowSettings,
  parseWorkflowSettings,
} from "../utils/configModules/workflow";
import {
  getUserModuleWorkflow,
  getWorkflowTemplate,
  resetUserModuleWorkflow,
  saveUserModuleWorkflow,
} from "../services/configModulesApi";

type UseUserModuleWorkflowOptions = {
  /** When false, skips loading. Defaults to true. */
  enabled?: boolean;
  /** Debounced auto-save delay in ms. Set to 0 to disable. Default 800. */
  autoSaveDelayMs?: number;
  logConfigurationId: string | number;
};

function hasLogConfigurationId(id: string | number | undefined | null): id is string | number {
  return id != null && id !== "";
}

/**
 * Loads and persists a user's module workflow + classification codes for a
 * specific log configuration (`log_configuration_user_workflows`).
 */
export function useUserModuleWorkflow(
  moduleSlug: string,
  options: UseUserModuleWorkflowOptions
) {
  const { enabled = true, autoSaveDelayMs = 800, logConfigurationId } = options;
  const canLoad = enabled && hasLogConfigurationId(logConfigurationId);
  const [workflow, setWorkflow] = useState<WorkflowSettings | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestWorkflowRef = useRef<WorkflowSettings | null>(null);

  const reload = useCallback(async () => {
    if (!canLoad) {
      setWorkflow(null);
      setLoading(false);
      setError(null);
      return null;
    }

    setLoading(true);
    setError(null);

    try {
      const { data } = await getUserModuleWorkflow(moduleSlug, logConfigurationId);
      const parsed = normalizeWorkflowSettings(parseWorkflowSettings(data));
      latestWorkflowRef.current = parsed;
      setWorkflow(parsed);
      return parsed;
    } catch (err) {
      setWorkflow(null);
      setError(API_ERROR_MESSAGES.LOAD_CONFIG_MODULES);
      showApiError(err, API_ERROR_MESSAGES.LOAD_CONFIG_MODULES);
      return null;
    } finally {
      setLoading(false);
    }
  }, [canLoad, logConfigurationId, moduleSlug]);

  useEffect(() => {
    void reload();
  }, [reload]);

  useEffect(() => {
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      const pending = latestWorkflowRef.current;
      if (pending && hasLogConfigurationId(logConfigurationId)) {
        void saveUserModuleWorkflow(moduleSlug, pending, logConfigurationId).catch(() => undefined);
      }
    };
  }, [logConfigurationId, moduleSlug]);

  const save = useCallback(
    async (next: WorkflowSettings) => {
      if (!hasLogConfigurationId(logConfigurationId)) return null;
      setSaving(true);
      try {
        const parsed = normalizeWorkflowSettings(parseWorkflowSettings(next));
        const { data } = await saveUserModuleWorkflow(moduleSlug, parsed, logConfigurationId);
        const saved = normalizeWorkflowSettings(parseWorkflowSettings(data));
        latestWorkflowRef.current = saved;
        setWorkflow(saved);
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

  const updateWorkflow = useCallback(
    (next: WorkflowSettings) => {
      const parsed = normalizeWorkflowSettings(parseWorkflowSettings(next));
      latestWorkflowRef.current = parsed;
      setWorkflow(parsed);

      if (autoSaveDelayMs <= 0) return;

      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(() => {
        void save(parsed);
      }, autoSaveDelayMs);
    },
    [autoSaveDelayMs, save]
  );

  const flushSave = useCallback(async () => {
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
      saveTimerRef.current = null;
    }
    const pending = latestWorkflowRef.current;
    if (!pending) return null;
    return save(pending);
  }, [save]);

  const loadTemplate = useCallback(async () => {
    const { data } = await getWorkflowTemplate(moduleSlug);
    return normalizeWorkflowSettings(parseWorkflowSettings(data));
  }, [moduleSlug]);

  const resetToTemplate = useCallback(async () => {
    if (!hasLogConfigurationId(logConfigurationId)) return null;
    setSaving(true);
    try {
      const { data } = await resetUserModuleWorkflow(moduleSlug, logConfigurationId);
      const reset = normalizeWorkflowSettings(parseWorkflowSettings(data));
      latestWorkflowRef.current = reset;
      setWorkflow(reset);
      return reset;
    } catch (err) {
      showApiError(err, API_ERROR_MESSAGES.UPDATE_LOG_CONFIGURATION);
      throw err;
    } finally {
      setSaving(false);
    }
  }, [logConfigurationId, moduleSlug]);

  return {
    workflow,
    loading,
    saving,
    error,
    reload,
    save,
    updateWorkflow,
    flushSave,
    loadTemplate,
    resetToTemplate,
    setWorkflow,
  };
}
