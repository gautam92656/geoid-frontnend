import { useCallback, useEffect, useState } from "react";
import { API_ERROR_MESSAGES } from "@/shared/constants/apiMessages";
import { showApiError } from "@/shared/utils/apiToast";
import {
  getUserDataTypeOptions,
  saveUserDataTypeOptions,
  type ModuleDataTypeOption,
} from "../services/configModulesApi";
import type { UserDataTypeOptionId } from "../utils/userModuleDataTypeOptions";

type UseUserDataTypeOptionsOptions = {
  enabled?: boolean;
  logConfigurationId: string | number;
};

function hasLogConfigurationId(id: string | number | undefined | null): id is string | number {
  return id != null && id !== "";
}

/**
 * Loads/saves DB-backed data-type options (rock_type, non_soil_type, rock_texture,
 * finish-reasons, finish-texts, geomodal_layer, colors) for a specific log configuration.
 */
export function useUserDataTypeOptions(
  moduleSlug: string,
  dataTypeId: UserDataTypeOptionId,
  options: UseUserDataTypeOptionsOptions
) {
  const { enabled = true, logConfigurationId } = options;
  const canLoad = enabled && hasLogConfigurationId(logConfigurationId);
  const [items, setItems] = useState<ModuleDataTypeOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const reload = useCallback(async () => {
    if (!canLoad) {
      setItems([]);
      setLoading(false);
      return [];
    }

    setLoading(true);
    try {
      const { data } = await getUserDataTypeOptions(moduleSlug, dataTypeId, logConfigurationId);
      const next = data.map((entry) => ({ ...entry }));
      setItems(next);
      return next;
    } catch (err) {
      setItems([]);
      showApiError(err, API_ERROR_MESSAGES.LOAD_CONFIG_MODULES);
      return [];
    } finally {
      setLoading(false);
    }
  }, [canLoad, dataTypeId, logConfigurationId, moduleSlug]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const save = useCallback(
    async (next: ModuleDataTypeOption[]) => {
      if (!hasLogConfigurationId(logConfigurationId)) return [];
      setSaving(true);
      try {
        const { data } = await saveUserDataTypeOptions(
          moduleSlug,
          dataTypeId,
          next,
          logConfigurationId
        );
        const saved = data.map((entry) => ({ ...entry }));
        setItems(saved);
        return saved;
      } catch (err) {
        showApiError(err, API_ERROR_MESSAGES.UPDATE_LOG_CONFIGURATION);
        throw err;
      } finally {
        setSaving(false);
      }
    },
    [dataTypeId, logConfigurationId, moduleSlug]
  );

  return { items, loading, saving, reload, save, setItems };
}
