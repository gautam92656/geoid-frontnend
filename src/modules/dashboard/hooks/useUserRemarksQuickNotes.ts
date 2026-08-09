import { useCallback, useEffect, useRef, useState } from "react";
import { API_ERROR_MESSAGES } from "@/shared/constants/apiMessages";
import { showApiError } from "@/shared/utils/apiToast";
import {
  parseRemarksQuickNoteOptions,
  type RemarksQuickNoteOption,
} from "../utils/configModules/remarksQuickNote";
import {
  getRemarksQuickNoteTemplates,
  getUserRemarksQuickNotes,
  resetUserRemarksQuickNotes,
  saveUserRemarksQuickNotes,
} from "../services/configModulesApi";

type UseUserRemarksQuickNotesOptions = {
  enabled?: boolean;
  logConfigurationId: string | number;
};

function hasLogConfigurationId(id: string | number | undefined | null): id is string | number {
  return id != null && id !== "";
}

/**
 * Loads and persists remarks quick notes for a specific log configuration,
 * seeded from common templates.
 */
export function useUserRemarksQuickNotes(
  moduleSlug: string,
  options: UseUserRemarksQuickNotesOptions
) {
  const { enabled = true, logConfigurationId } = options;
  const canLoad = enabled && hasLogConfigurationId(logConfigurationId);
  const [items, setItems] = useState<RemarksQuickNoteOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const latestRef = useRef<RemarksQuickNoteOption[]>([]);

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
      const { data } = await getUserRemarksQuickNotes(moduleSlug, logConfigurationId);
      const parsed = parseRemarksQuickNoteOptions(data, []);
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
    async (next: RemarksQuickNoteOption[]) => {
      if (!hasLogConfigurationId(logConfigurationId)) return [];
      setSaving(true);
      try {
        const { data } = await saveUserRemarksQuickNotes(moduleSlug, next, logConfigurationId);
        const saved = parseRemarksQuickNoteOptions(data, next);
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
      const { data } = await resetUserRemarksQuickNotes(moduleSlug, logConfigurationId);
      const reset = parseRemarksQuickNoteOptions(data, []);
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
    const { data } = await getRemarksQuickNoteTemplates(moduleSlug);
    return parseRemarksQuickNoteOptions(data, []);
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
