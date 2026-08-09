"use client";

import { useCallback, useEffect, useState } from "react";
import { API_ERROR_MESSAGES } from "@/shared/constants/apiMessages";
import { showApiError } from "@/shared/utils/apiToast";
import {
  normalizeWorkflowSettings,
  parseWorkflowSettings,
  parseStoredModuleSettings,
  ensureModuleSettingsForEnabledModules,
  DEFAULT_WORKFLOW_SETTINGS,
  type StoredModuleSettings,
  type WorkflowSettings,
} from "../utils/configModuleSettings";
import { SUBSURFACES_MODULE_ID } from "../utils/configModules/modules/subsurfaces";
import {
  mergeUserOriginsIntoModuleSettings,
  persistUserOrigins,
} from "../utils/userModuleOrigins";
import {
  loadUserDataTypeOptionsForEnabledModules,
  mergeUserDataTypeOptionsIntoModuleSettings,
  persistUserNonSoilTypes,
  persistUserRockTypes,
  type UserDataTypeOptionId,
} from "../utils/userModuleDataTypeOptions";
import {
  getUserModuleWorkflow,
  getUserOriginOptions,
  listConfigModules,
} from "../services/configModulesApi";
import { parseOriginOptions, type OriginOption } from "../utils/configModules/origin";
import {
  parseNonSoilTypeOptions,
  type NonSoilTypeOption,
} from "../utils/configModules/nonSoilType";
import {
  parseRockTypeOptions,
  type RockTypeOption,
} from "../utils/configModules/rockType";
import { hydrateModuleSettingsFromUserCatalog } from "../utils/userModuleSettings";

export type SubsurfaceRuntimeContext = {
  workflow: WorkflowSettings;
  subsurfaceSettings: StoredModuleSettings;
};

function emptySubsurfaceSettings(): StoredModuleSettings {
  return parseStoredModuleSettings({}, SUBSURFACES_MODULE_ID);
}

/**
 * Loads the selected log configuration's subsurface workflow + option catalogs
 * so the Edit Subsurface modal can render steps dynamically.
 */
export function useSubsurfaceRuntime(options: {
  logConfigurationId: string;
  enabled: boolean;
}) {
  const { logConfigurationId, enabled } = options;
  const [context, setContext] = useState<SubsurfaceRuntimeContext | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!enabled || !logConfigurationId.trim()) {
      setContext(null);
      setLoading(false);
      setError(null);
      return null;
    }

    setLoading(true);
    setError(null);

    try {
      const [workflowResult, originsResult, dataTypes, catalog] = await Promise.all([
        getUserModuleWorkflow(SUBSURFACES_MODULE_ID, logConfigurationId),
        getUserOriginOptions(SUBSURFACES_MODULE_ID, logConfigurationId),
        loadUserDataTypeOptionsForEnabledModules(
          [SUBSURFACES_MODULE_ID],
          logConfigurationId
        ),
        listConfigModules(1, 100, {
          availableOnly: true,
          logConfigurationId,
        }),
      ]);

      const workflow = normalizeWorkflowSettings(
        parseWorkflowSettings(workflowResult.data)
      );
      const origins = parseOriginOptions(originsResult.data, []);

      let settings = emptySubsurfaceSettings();
      const baseSettings = ensureModuleSettingsForEnabledModules(
        [SUBSURFACES_MODULE_ID],
        {
          order: [SUBSURFACES_MODULE_ID],
          modules: { [SUBSURFACES_MODULE_ID]: settings },
          workflow: DEFAULT_WORKFLOW_SETTINGS,
        }
      );
      const hydrated = hydrateModuleSettingsFromUserCatalog(
        [SUBSURFACES_MODULE_ID],
        baseSettings,
        catalog.data
      );
      settings = hydrated.modules[SUBSURFACES_MODULE_ID] ?? settings;
      settings = mergeUserOriginsIntoModuleSettings(settings, origins);

      const byType = dataTypes[SUBSURFACES_MODULE_ID] ?? {};
      for (const dataTypeId of Object.keys(byType) as UserDataTypeOptionId[]) {
        const optionsForType = byType[dataTypeId];
        if (!optionsForType) continue;
        settings = mergeUserDataTypeOptionsIntoModuleSettings(
          settings,
          dataTypeId,
          optionsForType
        );
      }

      const next: SubsurfaceRuntimeContext = {
        workflow,
        subsurfaceSettings: settings,
      };
      setContext(next);
      return next;
    } catch (err) {
      setContext(null);
      setError(API_ERROR_MESSAGES.LOAD_CONFIG_MODULES);
      showApiError(err, API_ERROR_MESSAGES.LOAD_CONFIG_MODULES);
      return null;
    } finally {
      setLoading(false);
    }
  }, [enabled, logConfigurationId]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const updateSubsurfaceSettings = useCallback((next: StoredModuleSettings) => {
    setContext((current) => (current ? { ...current, subsurfaceSettings: next } : current));
  }, []);

  const saveOrigins = useCallback(
    async (options: OriginOption[]) => {
      const saved = await persistUserOrigins(
        SUBSURFACES_MODULE_ID,
        options,
        logConfigurationId
      );
      setContext((current) => {
        if (!current) return current;
        return {
          ...current,
          subsurfaceSettings: mergeUserOriginsIntoModuleSettings(
            current.subsurfaceSettings,
            saved
          ),
        };
      });
      return saved;
    },
    [logConfigurationId]
  );

  const saveRockTypes = useCallback(
    async (options: RockTypeOption[]) => {
      const saved = await persistUserRockTypes(
        SUBSURFACES_MODULE_ID,
        options,
        logConfigurationId
      );
      setContext((current) => {
        if (!current) return current;
        return {
          ...current,
          subsurfaceSettings: mergeUserDataTypeOptionsIntoModuleSettings(
            current.subsurfaceSettings,
            "rock_type",
            saved
          ),
        };
      });
      return saved;
    },
    [logConfigurationId]
  );

  const saveNonSoilTypes = useCallback(
    async (options: NonSoilTypeOption[]) => {
      const saved = await persistUserNonSoilTypes(
        SUBSURFACES_MODULE_ID,
        options,
        logConfigurationId
      );
      setContext((current) => {
        if (!current) return current;
        return {
          ...current,
          subsurfaceSettings: mergeUserDataTypeOptionsIntoModuleSettings(
            current.subsurfaceSettings,
            "non_soil_type",
            saved
          ),
        };
      });
      return saved;
    },
    [logConfigurationId]
  );

  return {
    context,
    loading,
    error,
    reload,
    updateSubsurfaceSettings,
    saveOrigins,
    saveRockTypes,
    saveNonSoilTypes,
  };
}

export function readOriginOptionsFromSettings(
  settings: StoredModuleSettings | undefined
): OriginOption[] {
  return parseOriginOptions(settings?.dataTypeOptions.origin ?? [], []);
}

export function readRockTypeOptionsFromSettings(
  settings: StoredModuleSettings | undefined
): RockTypeOption[] {
  return parseRockTypeOptions(settings?.dataTypeOptions.rock_type ?? [], []);
}

export function readNonSoilTypeOptionsFromSettings(
  settings: StoredModuleSettings | undefined
): NonSoilTypeOption[] {
  return parseNonSoilTypeOptions(settings?.dataTypeOptions.non_soil_type ?? [], []);
}
