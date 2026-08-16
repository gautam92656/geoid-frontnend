"use client";

import type { FormEvent, ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useId, useMemo, useState } from "react";
import {
  FormField,
  Input,
  Select,
  Toggle,
  UiButton,
} from "@/shared/components/ui";
import { API_ERROR_MESSAGES, API_MESSAGES } from "@/shared/constants/apiMessages";
import { showApiError, showApiSuccess } from "@/shared/utils/apiToast";
import {
  LOG_CONFIGURATION_COORDINATE_REQUIREMENT_OPTIONS,
  LOG_CONFIGURATION_COORDINATE_SYSTEM_OPTIONS,
  LOG_CONFIGURATION_COORDINATE_SYSTEM_UNIT_OPTIONS,
  LOG_CONFIGURATION_DATE_FORMAT_OPTIONS,
  LOG_CONFIGURATION_ELEVATION_UNIT_OPTIONS,
  LOG_CONFIGURATION_MEASUREMENT_SYSTEM_OPTIONS,
} from "../data/logConfigurationSettings";
import {
  getLogConfiguration,
  updateLogConfiguration,
} from "../services/logConfigurationApi";
import { useLogConfigurationOwnerUserId } from "../context/LogConfigurationOwnerContext";
import type { LogConfigurationFormState } from "../types/logConfiguration";
import { toLogConfigurationFormState } from "../types/logConfiguration";
import { logConfigurationsListPath } from "../utils/logConfigurationPaths";
import { ManageProjectDetailsFieldsModal } from "./ManageProjectDetailsFieldsModal";
import { ManageLogDetailsFieldsModal } from "./ManageLogDetailsFieldsModal";
import { ManageModulesModal, type AdoptedModulePayload } from "./ManageModulesModal";
import { ConfigModulesPanel } from "./ConfigModulesPanel";
import { SubsurfacesWorkflowBuilderPanel } from "./configModules/SubsurfacesWorkflowBuilderPanel";
import { SettingsSidebar } from "./SettingsSidebar";
import {
  INSITU_TESTS_USA_MODULE_ID,
  CORE_LOGGING_MODULE_ID,
  LOG_REMARKS_MODULE_ID,
  DRILLING_OBSERVATIONS_MODULE_ID,
  WATER_OBSERVATIONS_MODULE_ID,
  WELL_LOGS_MODULE_ID,
  SAMPLES_MODULE_ID,
  LAB_TESTS_MODULE_ID,
  SUBSURFACES_MODULE_ID,
  cloneModuleSettings,
  ensureModuleSettingsForEnabledModules,
  parseStoredModuleSettings,
  type StoredModuleSettings,
} from "../utils/configModuleSettings";
import { useConfigModuleCatalog } from "../hooks/useConfigModuleCatalog";
import { useUserModuleWorkflow } from "../hooks/useUserModuleWorkflow";
import {
  buildUserModuleSettingsSyncPayload,
  hydrateModuleSettingsFromUserCatalog,
} from "../utils/userModuleSettings";
import {
  applyUserWorkflowsToModuleSettings,
  loadUserWorkflowsForEnabledModules,
  mergeUserWorkflowIntoModuleSettings,
} from "../utils/userModuleWorkflow";
import {
  applyUserOriginsToLogConfigModuleSettings,
  loadUserOriginsForEnabledModules,
} from "../utils/userModuleOrigins";
import {
  applyUserDataTypeOptionsToLogConfigModuleSettings,
  loadUserDataTypeOptionsForEnabledModules,
  USER_DATA_TYPE_OPTION_IDS,
} from "../utils/userModuleDataTypeOptions";
import {
  applyUserInsituTestTypesToLogConfigModuleSettings,
  loadUserInsituTestTypesForEnabledModules,
} from "../utils/userInsituTestTypes";
import {
  applyUserInsituUnitSettingsToLogConfigModuleSettings,
  loadUserInsituUnitSettingsForEnabledModules,
} from "../utils/userInsituUnitSettings";
import {
  applyUserCoreLoggingCollectionsToLogConfigModuleSettings,
  loadUserCoreLoggingCollectionsForEnabledModules,
} from "../utils/userCoreLoggingCollections";
import {
  applyUserLogRemarksCollectionsToLogConfigModuleSettings,
  loadUserLogRemarksCollectionsForEnabledModules,
} from "../utils/userLogRemarksCollections";
import {
  applyUserDrillingObservationsCollectionsToLogConfigModuleSettings,
  loadUserDrillingObservationsCollectionsForEnabledModules,
} from "../utils/userDrillingObservationsCollections";
import {
  applyUserWaterObservationsCollectionsToLogConfigModuleSettings,
  loadUserWaterObservationsCollectionsForEnabledModules,
} from "../utils/userWaterObservationsCollections";
import {
  applyUserWellLogsCollectionsToLogConfigModuleSettings,
  loadUserWellLogsCollectionsForEnabledModules,
} from "../utils/userWellLogsCollections";
import {
  applyUserSamplesCollectionsToLogConfigModuleSettings,
  loadUserSamplesCollectionsForEnabledModules,
} from "../utils/userSamplesCollections";
import {
  applyUserLabTestsCollectionsToLogConfigModuleSettings,
  loadUserLabTestsCollectionsForEnabledModules,
} from "../utils/userLabTestsCollections";
import { syncUserModuleSettings, unadoptConfigModule } from "../services/configModulesApi";

type DetailTabId = "general" | "modules";

const DETAIL_TABS: readonly { id: DetailTabId; label: string }[] = [
  { id: "general", label: "General Configuration Settings" },
  { id: "modules", label: "Modules" },
];

function HamburgerIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function ChevronLeftIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M15 18l-6-6 6-6"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

type SettingsSwitchRowProps = Readonly<{
  id: string;
  label: string;
  hint?: string;
  checked: boolean;
  disabled?: boolean;
  checkedLabel?: string;
  uncheckedLabel?: string;
  showStateLabel?: boolean;
  onChange: (checked: boolean) => void;
}>;

function SettingsSwitchRow({
  id,
  label,
  hint,
  checked,
  disabled,
  checkedLabel = "On",
  uncheckedLabel = "Off",
  showStateLabel = false,
  onChange,
}: SettingsSwitchRowProps) {
  return (
    <div className={`log-config-detail__switch-row${hint ? " has-hint" : ""}`}>
      <label className="log-config-detail__switch-label" htmlFor={id}>
        {label}
      </label>
      {hint ? <p className="log-config-detail__switch-hint">{hint}</p> : null}
      <div className="log-config-detail__switch-control">
        {showStateLabel ? (
          <span
            className={`log-config-detail__switch-state${checked ? " is-on" : " is-off"}`}
            aria-hidden="true"
          >
            {checked ? checkedLabel : uncheckedLabel}
          </span>
        ) : null}
        <Toggle id={id} checked={checked} disabled={disabled} onChange={onChange} />
      </div>
    </div>
  );
}

type LogConfigurationDetailPageProps = Readonly<{
  configurationId: string;
  listBasePath?: string;
  renderSidebar?: (props: {
    mobileOpen: boolean;
    onCloseMobile: () => void;
  }) => ReactNode;
  menuButtonAriaLabel?: string;
}>;

export function LogConfigurationDetailPage({
  configurationId,
  listBasePath = "/dashboard/settings/log-configurations",
  renderSidebar,
  menuButtonAriaLabel = "Open settings menu",
}: LogConfigurationDetailPageProps) {
  const router = useRouter();
  const formId = useId();
  const ownerUserId = useLogConfigurationOwnerUserId();
  const listPath = logConfigurationsListPath(listBasePath, ownerUserId);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<DetailTabId>("general");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState<LogConfigurationFormState | null>(null);
  const [templateSlug, setTemplateSlug] = useState<string | null>(null);
  const [projectDetailFieldsOpen, setProjectDetailFieldsOpen] = useState(false);
  const [logDetailFieldsOpen, setLogDetailFieldsOpen] = useState(false);
  const [modulesModalOpen, setModulesModalOpen] = useState(false);
  const [savingModules, setSavingModules] = useState(false);
  const [editingSubsurfaceWorkflow, setEditingSubsurfaceWorkflow] = useState(false);
  const [userModulesHydrated, setUserModulesHydrated] = useState(false);
  const [userWorkflowsHydrated, setUserWorkflowsHydrated] = useState(false);
  const [userOriginsHydrated, setUserOriginsHydrated] = useState(false);
  const [userDataTypeOptionsHydrated, setUserDataTypeOptionsHydrated] = useState(false);
  const [userInsituTestTypesHydrated, setUserInsituTestTypesHydrated] = useState(false);
  const [userInsituUnitSettingsHydrated, setUserInsituUnitSettingsHydrated] = useState(false);
  const [userCoreLoggingCollectionsHydrated, setUserCoreLoggingCollectionsHydrated] =
    useState(false);
  const [userLogRemarksCollectionsHydrated, setUserLogRemarksCollectionsHydrated] =
    useState(false);
  const [
    userDrillingObservationsCollectionsHydrated,
    setUserDrillingObservationsCollectionsHydrated,
  ] = useState(false);
  const [
    userWaterObservationsCollectionsHydrated,
    setUserWaterObservationsCollectionsHydrated,
  ] = useState(false);
  const [userWellLogsCollectionsHydrated, setUserWellLogsCollectionsHydrated] = useState(false);
  const [userSamplesCollectionsHydrated, setUserSamplesCollectionsHydrated] = useState(false);
  const [userLabTestsCollectionsHydrated, setUserLabTestsCollectionsHydrated] = useState(false);

  const modulesTabActive = !loading && form != null && activeTab === "modules";
  const logConfigurationNumericId = Number.parseInt(configurationId, 10);

  const {
    modules: moduleCatalog,
    loading: moduleCatalogLoading,
    reload: reloadModuleCatalog,
  } = useConfigModuleCatalog({
    enabled: modulesTabActive,
    logConfigurationId: logConfigurationNumericId,
  });

  const subsurfaceUserWorkflow = useUserModuleWorkflow(SUBSURFACES_MODULE_ID, {
    enabled: editingSubsurfaceWorkflow && form != null,
    autoSaveDelayMs: 800,
    logConfigurationId: logConfigurationNumericId,
  });

  const loadConfiguration = useCallback(async () => {
    setLoading(true);
    setUserModulesHydrated(false);
    setUserWorkflowsHydrated(false);
    setUserOriginsHydrated(false);
    setUserDataTypeOptionsHydrated(false);
    setUserInsituTestTypesHydrated(false);
    setUserInsituUnitSettingsHydrated(false);
    setUserCoreLoggingCollectionsHydrated(false);
    setUserLogRemarksCollectionsHydrated(false);
    setUserDrillingObservationsCollectionsHydrated(false);
    setUserWaterObservationsCollectionsHydrated(false);
    setUserWellLogsCollectionsHydrated(false);
    setUserSamplesCollectionsHydrated(false);
    setUserLabTestsCollectionsHydrated(false);
    try {
      const configuration = await getLogConfiguration(configurationId, ownerUserId);
      setForm(toLogConfigurationFormState(configuration));
      setTemplateSlug(configuration.templateSlug ?? null);
    } catch (err) {
      showApiError(err, API_ERROR_MESSAGES.LOAD_LOG_CONFIGURATION);
      router.replace(listPath);
    } finally {
      setLoading(false);
    }
  }, [configurationId, listPath, ownerUserId, router]);

  useEffect(() => {
    void loadConfiguration();
  }, [loadConfiguration]);

  // Re-allow hydration when returning to the Modules tab (catalog refetch is
  // handled by enabling the catalog hook for this tab).
  useEffect(() => {
    if (!modulesTabActive) return;
    setUserModulesHydrated(false);
    setUserWorkflowsHydrated(false);
    setUserOriginsHydrated(false);
    setUserDataTypeOptionsHydrated(false);
    setUserInsituTestTypesHydrated(false);
    setUserInsituUnitSettingsHydrated(false);
    setUserCoreLoggingCollectionsHydrated(false);
    setUserLogRemarksCollectionsHydrated(false);
    setUserDrillingObservationsCollectionsHydrated(false);
    setUserWaterObservationsCollectionsHydrated(false);
    setUserWellLogsCollectionsHydrated(false);
    setUserSamplesCollectionsHydrated(false);
    setUserLabTestsCollectionsHydrated(false);
  }, [modulesTabActive]);

  // Prefer configuration-scoped customizations when the modules catalog is available.
  useEffect(() => {
    if (!form || moduleCatalogLoading || userModulesHydrated) return;
    if (moduleCatalog.length === 0 && form.enabledModules.length === 0) {
      setUserModulesHydrated(true);
      return;
    }

    setForm((current) => {
      if (!current) return current;
      return {
        ...current,
        moduleSettings: hydrateModuleSettingsFromUserCatalog(
          current.enabledModules,
          current.moduleSettings,
          moduleCatalog
        ),
      };
    });
    setUserModulesHydrated(true);
  }, [form, moduleCatalog, moduleCatalogLoading, userModulesHydrated]);

  // Load configuration-scoped workflow + classification codes from dedicated collections.
  useEffect(() => {
    if (!form || !modulesTabActive || userWorkflowsHydrated) return;
    if (!form.enabledModules.includes(SUBSURFACES_MODULE_ID)) {
      setUserWorkflowsHydrated(true);
      return;
    }

    let cancelled = false;

    void (async () => {
      try {
        const workflows = await loadUserWorkflowsForEnabledModules(
          form.enabledModules,
          logConfigurationNumericId
        );
        if (cancelled) return;
        setForm((current) => {
          if (!current) return current;
          return {
            ...current,
            moduleSettings: applyUserWorkflowsToModuleSettings(
              current.moduleSettings,
              workflows
            ),
          };
        });
      } catch (err) {
        if (!cancelled) {
          showApiError(err, API_ERROR_MESSAGES.LOAD_CONFIG_MODULES);
        }
      } finally {
        if (!cancelled) setUserWorkflowsHydrated(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [form, logConfigurationNumericId, modulesTabActive, userWorkflowsHydrated]);

  // Load configuration-scoped origin options from dedicated collections (after catalog hydrate).
  useEffect(() => {
    if (!form || !modulesTabActive || !userModulesHydrated || userOriginsHydrated) return;
    if (!form.enabledModules.includes(SUBSURFACES_MODULE_ID)) {
      setUserOriginsHydrated(true);
      return;
    }

    let cancelled = false;

    void (async () => {
      try {
        const originsByModule = await loadUserOriginsForEnabledModules(
          form.enabledModules,
          logConfigurationNumericId
        );
        if (cancelled) return;
        setForm((current) => {
          if (!current) return current;
          let next = current.moduleSettings;
          for (const moduleSlug of Object.keys(originsByModule) as Array<
            keyof typeof originsByModule
          >) {
            const origins = originsByModule[moduleSlug];
            if (!origins) continue;
            next = applyUserOriginsToLogConfigModuleSettings(next, moduleSlug, origins);
          }
          return { ...current, moduleSettings: next };
        });
      } catch (err) {
        if (!cancelled) {
          showApiError(err, API_ERROR_MESSAGES.LOAD_CONFIG_MODULES);
        }
      } finally {
        if (!cancelled) setUserOriginsHydrated(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [
    form,
    logConfigurationNumericId,
    modulesTabActive,
    userModulesHydrated,
    userOriginsHydrated,
  ]);

  // Load configuration-scoped rock / non-soil options from dedicated collections (after catalog hydrate).
  useEffect(() => {
    if (!form || !modulesTabActive || !userModulesHydrated || userDataTypeOptionsHydrated) return;
    if (!form.enabledModules.includes(SUBSURFACES_MODULE_ID)) {
      setUserDataTypeOptionsHydrated(true);
      return;
    }

    let cancelled = false;

    void (async () => {
      try {
        const loaded = await loadUserDataTypeOptionsForEnabledModules(
          form.enabledModules,
          logConfigurationNumericId
        );
        if (cancelled) return;
        setForm((current) => {
          if (!current) return current;
          let next = current.moduleSettings;
          for (const moduleSlug of Object.keys(loaded) as Array<keyof typeof loaded>) {
            const byType = loaded[moduleSlug];
            if (!byType) continue;
            for (const dataTypeId of USER_DATA_TYPE_OPTION_IDS) {
              const options = byType[dataTypeId];
              if (!options) continue;
              next = applyUserDataTypeOptionsToLogConfigModuleSettings(
                next,
                moduleSlug,
                dataTypeId,
                options
              );
            }
          }
          return { ...current, moduleSettings: next };
        });
      } catch (err) {
        if (!cancelled) {
          showApiError(err, API_ERROR_MESSAGES.LOAD_CONFIG_MODULES);
        }
      } finally {
        if (!cancelled) setUserDataTypeOptionsHydrated(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [
    form,
    logConfigurationNumericId,
    modulesTabActive,
    userModulesHydrated,
    userDataTypeOptionsHydrated,
  ]);

  // Load configuration-scoped insitu testing types from dedicated collections (after catalog hydrate).
  useEffect(() => {
    if (!form || !modulesTabActive || !userModulesHydrated || userInsituTestTypesHydrated) return;
    if (!form.enabledModules.includes(INSITU_TESTS_USA_MODULE_ID)) {
      setUserInsituTestTypesHydrated(true);
      return;
    }

    let cancelled = false;

    void (async () => {
      try {
        const loaded = await loadUserInsituTestTypesForEnabledModules(
          form.enabledModules,
          logConfigurationNumericId
        );
        if (cancelled) return;
        setForm((current) => {
          if (!current) return current;
          let next = current.moduleSettings;
          for (const moduleSlug of Object.keys(loaded) as Array<keyof typeof loaded>) {
            const options = loaded[moduleSlug];
            // Keep frontend-seeded defaults when the collection is still empty.
            if (!options || options.length === 0) continue;
            next = applyUserInsituTestTypesToLogConfigModuleSettings(next, moduleSlug, options);
          }
          return { ...current, moduleSettings: next };
        });
      } catch (err) {
        if (!cancelled) {
          showApiError(err, API_ERROR_MESSAGES.LOAD_CONFIG_MODULES);
        }
      } finally {
        if (!cancelled) setUserInsituTestTypesHydrated(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [
    form,
    logConfigurationNumericId,
    modulesTabActive,
    userModulesHydrated,
    userInsituTestTypesHydrated,
  ]);

  // Load configuration-scoped insitu unit settings from dedicated collections (after catalog hydrate).
  useEffect(() => {
    if (!form || !modulesTabActive || !userModulesHydrated || userInsituUnitSettingsHydrated) {
      return;
    }
    if (!form.enabledModules.includes(INSITU_TESTS_USA_MODULE_ID)) {
      setUserInsituUnitSettingsHydrated(true);
      return;
    }

    let cancelled = false;

    void (async () => {
      try {
        const loaded = await loadUserInsituUnitSettingsForEnabledModules(
          form.enabledModules,
          logConfigurationNumericId
        );
        if (cancelled) return;
        setForm((current) => {
          if (!current) return current;
          let next = current.moduleSettings;
          for (const moduleSlug of Object.keys(loaded) as Array<keyof typeof loaded>) {
            const unitSettings = loaded[moduleSlug];
            if (!unitSettings) continue;
            next = applyUserInsituUnitSettingsToLogConfigModuleSettings(
              next,
              moduleSlug,
              unitSettings
            );
          }
          return { ...current, moduleSettings: next };
        });
      } catch (err) {
        if (!cancelled) {
          showApiError(err, API_ERROR_MESSAGES.LOAD_CONFIG_MODULES);
        }
      } finally {
        if (!cancelled) setUserInsituUnitSettingsHydrated(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [
    form,
    logConfigurationNumericId,
    modulesTabActive,
    userModulesHydrated,
    userInsituUnitSettingsHydrated,
  ]);

  // Load configuration-scoped Core Logging collections (after catalog hydrate).
  useEffect(() => {
    if (!form || !modulesTabActive || !userModulesHydrated || userCoreLoggingCollectionsHydrated) {
      return;
    }
    if (!form.enabledModules.includes(CORE_LOGGING_MODULE_ID)) {
      setUserCoreLoggingCollectionsHydrated(true);
      return;
    }

    let cancelled = false;

    void (async () => {
      try {
        const loaded = await loadUserCoreLoggingCollectionsForEnabledModules(
          form.enabledModules,
          logConfigurationNumericId
        );
        if (cancelled) return;
        setForm((current) => {
          if (!current) return current;
          let next = current.moduleSettings;
          for (const moduleSlug of Object.keys(loaded) as Array<keyof typeof loaded>) {
            const collections = loaded[moduleSlug];
            if (!collections) continue;
            next = applyUserCoreLoggingCollectionsToLogConfigModuleSettings(
              next,
              moduleSlug,
              collections
            );
          }
          return { ...current, moduleSettings: next };
        });
      } catch (err) {
        if (!cancelled) {
          showApiError(err, API_ERROR_MESSAGES.LOAD_CONFIG_MODULES);
        }
      } finally {
        if (!cancelled) setUserCoreLoggingCollectionsHydrated(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [
    form,
    logConfigurationNumericId,
    modulesTabActive,
    userModulesHydrated,
    userCoreLoggingCollectionsHydrated,
  ]);

  // Load configuration-scoped Log Remarks collections (after catalog hydrate).
  useEffect(() => {
    if (
      !form ||
      !modulesTabActive ||
      !userModulesHydrated ||
      userLogRemarksCollectionsHydrated
    ) {
      return;
    }
    if (!form.enabledModules.includes(LOG_REMARKS_MODULE_ID)) {
      setUserLogRemarksCollectionsHydrated(true);
      return;
    }

    let cancelled = false;

    void (async () => {
      try {
        const loaded = await loadUserLogRemarksCollectionsForEnabledModules(
          form.enabledModules,
          logConfigurationNumericId
        );
        if (cancelled) return;
        setForm((current) => {
          if (!current) return current;
          let next = current.moduleSettings;
          for (const moduleSlug of Object.keys(loaded) as Array<keyof typeof loaded>) {
            const collections = loaded[moduleSlug];
            if (!collections) continue;
            next = applyUserLogRemarksCollectionsToLogConfigModuleSettings(
              next,
              moduleSlug,
              collections
            );
          }
          return { ...current, moduleSettings: next };
        });
      } catch (err) {
        if (!cancelled) {
          showApiError(err, API_ERROR_MESSAGES.LOAD_CONFIG_MODULES);
        }
      } finally {
        if (!cancelled) setUserLogRemarksCollectionsHydrated(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [
    form,
    logConfigurationNumericId,
    modulesTabActive,
    userModulesHydrated,
    userLogRemarksCollectionsHydrated,
  ]);

  // Load configuration-scoped Drilling Observations collections (after catalog hydrate).
  useEffect(() => {
    if (
      !form ||
      !modulesTabActive ||
      !userModulesHydrated ||
      userDrillingObservationsCollectionsHydrated
    ) {
      return;
    }
    if (!form.enabledModules.includes(DRILLING_OBSERVATIONS_MODULE_ID)) {
      setUserDrillingObservationsCollectionsHydrated(true);
      return;
    }

    let cancelled = false;

    void (async () => {
      try {
        const loaded = await loadUserDrillingObservationsCollectionsForEnabledModules(
          form.enabledModules,
          logConfigurationNumericId
        );
        if (cancelled) return;
        setForm((current) => {
          if (!current) return current;
          let next = current.moduleSettings;
          for (const moduleSlug of Object.keys(loaded) as Array<keyof typeof loaded>) {
            const collections = loaded[moduleSlug];
            if (!collections) continue;
            next = applyUserDrillingObservationsCollectionsToLogConfigModuleSettings(
              next,
              moduleSlug,
              collections
            );
          }
          return { ...current, moduleSettings: next };
        });
      } catch (err) {
        if (!cancelled) {
          showApiError(err, API_ERROR_MESSAGES.LOAD_CONFIG_MODULES);
        }
      } finally {
        if (!cancelled) setUserDrillingObservationsCollectionsHydrated(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [
    form,
    logConfigurationNumericId,
    modulesTabActive,
    userModulesHydrated,
    userDrillingObservationsCollectionsHydrated,
  ]);

  // Load configuration-scoped Water Observations collections (after catalog hydrate).
  useEffect(() => {
    if (
      !form ||
      !modulesTabActive ||
      !userModulesHydrated ||
      userWaterObservationsCollectionsHydrated
    ) {
      return;
    }
    if (!form.enabledModules.includes(WATER_OBSERVATIONS_MODULE_ID)) {
      setUserWaterObservationsCollectionsHydrated(true);
      return;
    }

    let cancelled = false;

    void (async () => {
      try {
        const loaded = await loadUserWaterObservationsCollectionsForEnabledModules(
          form.enabledModules,
          logConfigurationNumericId
        );
        if (cancelled) return;
        setForm((current) => {
          if (!current) return current;
          let next = current.moduleSettings;
          for (const moduleSlug of Object.keys(loaded) as Array<keyof typeof loaded>) {
            const collections = loaded[moduleSlug];
            if (!collections) continue;
            next = applyUserWaterObservationsCollectionsToLogConfigModuleSettings(
              next,
              moduleSlug,
              collections
            );
          }
          return { ...current, moduleSettings: next };
        });
      } catch (err) {
        if (!cancelled) {
          showApiError(err, API_ERROR_MESSAGES.LOAD_CONFIG_MODULES);
        }
      } finally {
        if (!cancelled) setUserWaterObservationsCollectionsHydrated(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [
    form,
    logConfigurationNumericId,
    modulesTabActive,
    userModulesHydrated,
    userWaterObservationsCollectionsHydrated,
  ]);

  // Load configuration-scoped Well Logs collections (after catalog hydrate).
  useEffect(() => {
    if (
      !form ||
      !modulesTabActive ||
      !userModulesHydrated ||
      userWellLogsCollectionsHydrated
    ) {
      return;
    }
    if (!form.enabledModules.includes(WELL_LOGS_MODULE_ID)) {
      setUserWellLogsCollectionsHydrated(true);
      return;
    }

    let cancelled = false;

    void (async () => {
      try {
        const loaded = await loadUserWellLogsCollectionsForEnabledModules(
          form.enabledModules,
          logConfigurationNumericId
        );
        if (cancelled) return;
        setForm((current) => {
          if (!current) return current;
          let next = current.moduleSettings;
          for (const moduleSlug of Object.keys(loaded) as Array<keyof typeof loaded>) {
            const collections = loaded[moduleSlug];
            if (!collections) continue;
            next = applyUserWellLogsCollectionsToLogConfigModuleSettings(
              next,
              moduleSlug,
              collections
            );
          }
          return { ...current, moduleSettings: next };
        });
      } catch (err) {
        if (!cancelled) {
          showApiError(err, API_ERROR_MESSAGES.LOAD_CONFIG_MODULES);
        }
      } finally {
        if (!cancelled) setUserWellLogsCollectionsHydrated(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [
    form,
    logConfigurationNumericId,
    modulesTabActive,
    userModulesHydrated,
    userWellLogsCollectionsHydrated,
  ]);

  // Load configuration-scoped Samples collections (after catalog hydrate).
  useEffect(() => {
    if (
      !form ||
      !modulesTabActive ||
      !userModulesHydrated ||
      userSamplesCollectionsHydrated
    ) {
      return;
    }
    if (!form.enabledModules.includes(SAMPLES_MODULE_ID)) {
      setUserSamplesCollectionsHydrated(true);
      return;
    }

    let cancelled = false;

    void (async () => {
      try {
        const loaded = await loadUserSamplesCollectionsForEnabledModules(
          form.enabledModules,
          logConfigurationNumericId
        );
        if (cancelled) return;
        setForm((current) => {
          if (!current) return current;
          let next = current.moduleSettings;
          for (const moduleSlug of Object.keys(loaded) as Array<keyof typeof loaded>) {
            const collections = loaded[moduleSlug];
            if (!collections) continue;
            next = applyUserSamplesCollectionsToLogConfigModuleSettings(
              next,
              moduleSlug,
              collections
            );
          }
          return { ...current, moduleSettings: next };
        });
      } catch (err) {
        if (!cancelled) {
          showApiError(err, API_ERROR_MESSAGES.LOAD_CONFIG_MODULES);
        }
      } finally {
        if (!cancelled) setUserSamplesCollectionsHydrated(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [
    form,
    logConfigurationNumericId,
    modulesTabActive,
    userModulesHydrated,
    userSamplesCollectionsHydrated,
  ]);

  // Load configuration-scoped Lab Tests collections (after catalog hydrate).
  useEffect(() => {
    if (
      !form ||
      !modulesTabActive ||
      !userModulesHydrated ||
      userLabTestsCollectionsHydrated
    ) {
      return;
    }
    if (!form.enabledModules.includes(LAB_TESTS_MODULE_ID)) {
      setUserLabTestsCollectionsHydrated(true);
      return;
    }

    let cancelled = false;

    void (async () => {
      try {
        const loaded = await loadUserLabTestsCollectionsForEnabledModules(
          form.enabledModules,
          logConfigurationNumericId
        );
        if (cancelled) return;
        setForm((current) => {
          if (!current) return current;
          let next = current.moduleSettings;
          for (const moduleSlug of Object.keys(loaded) as Array<keyof typeof loaded>) {
            const collections = loaded[moduleSlug];
            if (!collections) continue;
            next = applyUserLabTestsCollectionsToLogConfigModuleSettings(
              next,
              moduleSlug,
              collections
            );
          }
          return { ...current, moduleSettings: next };
        });
      } catch (err) {
        if (!cancelled) {
          showApiError(err, API_ERROR_MESSAGES.LOAD_CONFIG_MODULES);
        }
      } finally {
        if (!cancelled) setUserLabTestsCollectionsHydrated(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [
    form,
    logConfigurationNumericId,
    modulesTabActive,
    userModulesHydrated,
    userLabTestsCollectionsHydrated,
  ]);

  const pageTitle = useMemo(() => {
    if (loading || !form) return "Configuration settings";
    return form.name;
  }, [form, loading]);

  const pageDescription = useMemo(() => {
    if (ownerUserId != null) {
      return templateSlug
        ? "Adjust this configuration for the selected user. Template defaults were copied when it was added — changes stay on this user only."
        : "Define how projects and logs behave for the selected user when this configuration is used.";
    }
    if (templateSlug) {
      return "Adjust this configuration for your account. Template defaults were copied when you added it — your changes stay separate from the library template.";
    }
    return "Define how projects and logs behave when this configuration is selected. These settings apply wherever the configuration is used.";
  }, [ownerUserId, templateSlug]);

  const persistModulesState = useCallback(
    async (
      enabledModules: string[],
      moduleSettings: LogConfigurationFormState["moduleSettings"]
    ) => {
      const normalizedSettings = ensureModuleSettingsForEnabledModules(
        enabledModules,
        moduleSettings
      );

      const userSettingsPayload = buildUserModuleSettingsSyncPayload(
        enabledModules,
        normalizedSettings
      );
      if (Object.keys(userSettingsPayload).length > 0) {
        await syncUserModuleSettings(userSettingsPayload, logConfigurationNumericId);
      }

      const { data } = await updateLogConfiguration(
        configurationId,
        {
          enabledModules,
          moduleSettings: normalizedSettings,
        },
        ownerUserId
      );

      setForm(toLogConfigurationFormState(data));
      setUserModulesHydrated(false);
      setUserWorkflowsHydrated(false);
      setUserOriginsHydrated(false);
      setUserDataTypeOptionsHydrated(false);
      setUserInsituTestTypesHydrated(false);
      setUserInsituUnitSettingsHydrated(false);
      setUserCoreLoggingCollectionsHydrated(false);
      setUserLogRemarksCollectionsHydrated(false);
      setUserDrillingObservationsCollectionsHydrated(false);
      setUserWaterObservationsCollectionsHydrated(false);
      setUserWellLogsCollectionsHydrated(false);
      setUserSamplesCollectionsHydrated(false);
      setUserLabTestsCollectionsHydrated(false);
      await reloadModuleCatalog();
    },
    [configurationId, logConfigurationNumericId, ownerUserId, reloadModuleCatalog]
  );

  const handleAddModule = useCallback(
    async (payload: AdoptedModulePayload) => {
      if (!form || form.enabledModules.includes(payload.moduleId) || savingModules) return;

      const enabledModules = [...form.enabledModules, payload.moduleId];
      const nextSettings = ensureModuleSettingsForEnabledModules(
        enabledModules,
        form.moduleSettings
      );
      if (payload.settings) {
        const adopted = parseStoredModuleSettings(payload.settings, payload.moduleId);
        const seeded = nextSettings.modules[payload.moduleId];
        // Keep frontend-seeded Insitu testing types when adopt settings still have an empty list
        // (dedicated collection is populated separately and hydrated next).
        if (
          payload.moduleId === INSITU_TESTS_USA_MODULE_ID &&
          seeded &&
          (adopted.dataTypeOptions["testing-types"]?.length ?? 0) === 0 &&
          (seeded.dataTypeOptions["testing-types"]?.length ?? 0) > 0
        ) {
          adopted.dataTypeOptions = {
            ...adopted.dataTypeOptions,
            "testing-types": seeded.dataTypeOptions["testing-types"].map((entry) => ({
              ...entry,
            })),
          };
        }
        // Keep frontend-seeded Core Logging catalogs when adopt settings still have empty lists
        // (dedicated collections are populated separately and hydrated next).
        if (payload.moduleId === CORE_LOGGING_MODULE_ID && seeded) {
          const coreLoggingDataTypeIds = [
            "core-defect-types",
            "aperture-colors",
            "aperture-minerals",
            "infill-materials",
            "surface-shapes",
            "surface-roughnesses",
            "defect-opennesses",
            "defect-coatings",
          ] as const;
          let patched = false;
          const nextOptions = { ...adopted.dataTypeOptions };
          for (const dataTypeId of coreLoggingDataTypeIds) {
            if (
              (adopted.dataTypeOptions[dataTypeId]?.length ?? 0) === 0 &&
              (seeded.dataTypeOptions[dataTypeId]?.length ?? 0) > 0
            ) {
              nextOptions[dataTypeId] = seeded.dataTypeOptions[dataTypeId].map((entry) => ({
                ...entry,
              }));
              patched = true;
            }
          }
          if (patched) {
            adopted.dataTypeOptions = nextOptions;
          }
        }
        // Keep frontend-seeded Log Remarks catalogs when adopt settings still have empty lists
        // (dedicated collections are populated separately and hydrated next).
        if (payload.moduleId === LOG_REMARKS_MODULE_ID && seeded) {
          const logRemarksDataTypeIds = ["remark-types", "remarks-quick-notes"] as const;
          let patched = false;
          const nextOptions = { ...adopted.dataTypeOptions };
          for (const dataTypeId of logRemarksDataTypeIds) {
            if (
              (adopted.dataTypeOptions[dataTypeId]?.length ?? 0) === 0 &&
              (seeded.dataTypeOptions[dataTypeId]?.length ?? 0) > 0
            ) {
              nextOptions[dataTypeId] = seeded.dataTypeOptions[dataTypeId].map((entry) => ({
                ...entry,
              }));
              patched = true;
            }
          }
          if (patched) {
            adopted.dataTypeOptions = nextOptions;
          }
        }
        // Keep frontend-seeded Drilling Observations catalogs when adopt settings still have
        // empty lists (dedicated collections are populated separately and hydrated next).
        if (payload.moduleId === DRILLING_OBSERVATIONS_MODULE_ID && seeded) {
          const drillingDataTypeIds = [
            "drilling-types",
            "drilling-resistances",
            "drilling-observations",
            "drilling-casings",
          ] as const;
          let patched = false;
          const nextOptions = { ...adopted.dataTypeOptions };
          for (const dataTypeId of drillingDataTypeIds) {
            if (
              (adopted.dataTypeOptions[dataTypeId]?.length ?? 0) === 0 &&
              (seeded.dataTypeOptions[dataTypeId]?.length ?? 0) > 0
            ) {
              nextOptions[dataTypeId] = seeded.dataTypeOptions[dataTypeId].map((entry) => ({
                ...entry,
              }));
              patched = true;
            }
          }
          if (patched) {
            adopted.dataTypeOptions = nextOptions;
          }
        }
        // Keep frontend-seeded Water Observations catalogs when adopt settings still have
        // empty lists (dedicated collections are populated separately and hydrated next).
        if (payload.moduleId === WATER_OBSERVATIONS_MODULE_ID && seeded) {
          if (
            (adopted.dataTypeOptions["water-observation-types"]?.length ?? 0) === 0 &&
            (seeded.dataTypeOptions["water-observation-types"]?.length ?? 0) > 0
          ) {
            adopted.dataTypeOptions = {
              ...adopted.dataTypeOptions,
              "water-observation-types": seeded.dataTypeOptions[
                "water-observation-types"
              ].map((entry) => ({ ...entry })),
            };
          }
        }
        // Keep frontend-seeded Well Logs catalogs when adopt settings still have
        // empty lists (dedicated collections are populated separately and hydrated next).
        if (payload.moduleId === WELL_LOGS_MODULE_ID && seeded) {
          const wellDataTypeIds = [
            "well-types",
            "well-casing-types",
            "well-casing-tops",
            "well-cover-types",
            "well-probe-types",
            "well-backfill-types",
          ] as const;
          let patched = false;
          const nextOptions = { ...adopted.dataTypeOptions };
          for (const dataTypeId of wellDataTypeIds) {
            if (
              (adopted.dataTypeOptions[dataTypeId]?.length ?? 0) === 0 &&
              (seeded.dataTypeOptions[dataTypeId]?.length ?? 0) > 0
            ) {
              nextOptions[dataTypeId] = seeded.dataTypeOptions[dataTypeId].map((entry) => ({
                ...entry,
              }));
              patched = true;
            }
          }
          if (patched) {
            adopted.dataTypeOptions = nextOptions;
          }
        }
        // Keep frontend-seeded Samples catalogs when adopt settings still have
        // empty lists (dedicated collections are populated separately and hydrated next).
        if (payload.moduleId === SAMPLES_MODULE_ID && seeded) {
          if (
            (adopted.dataTypeOptions["sample-types"]?.length ?? 0) === 0 &&
            (seeded.dataTypeOptions["sample-types"]?.length ?? 0) > 0
          ) {
            adopted.dataTypeOptions = {
              ...adopted.dataTypeOptions,
              "sample-types": seeded.dataTypeOptions["sample-types"].map((entry) => ({
                ...entry,
              })),
            };
          }
        }
        // Keep frontend-seeded Lab Tests catalogs when adopt settings still have
        // empty lists (dedicated collections are populated separately and hydrated next).
        if (payload.moduleId === LAB_TESTS_MODULE_ID && seeded) {
          const labDataTypeIds = ["lab-test-types", "lab-test-presets"] as const;
          let patched = false;
          const nextOptions = { ...adopted.dataTypeOptions };
          for (const dataTypeId of labDataTypeIds) {
            if (
              (adopted.dataTypeOptions[dataTypeId]?.length ?? 0) === 0 &&
              (seeded.dataTypeOptions[dataTypeId]?.length ?? 0) > 0
            ) {
              nextOptions[dataTypeId] = seeded.dataTypeOptions[dataTypeId].map((entry) => ({
                ...entry,
              }));
              patched = true;
            }
          }
          if (patched) {
            adopted.dataTypeOptions = nextOptions;
          }
        }
        nextSettings.modules[payload.moduleId] = adopted;
      }

      const previousForm = form;
      setForm({
        ...form,
        enabledModules,
        moduleSettings: nextSettings,
      });

      setSavingModules(true);
      try {
        await persistModulesState(enabledModules, nextSettings);
        showApiSuccess(undefined, "Module added to Active Modules.");
      } catch (err) {
        setForm(previousForm);
        showApiError(err, API_ERROR_MESSAGES.UPDATE_LOG_CONFIGURATION);
      } finally {
        setSavingModules(false);
      }
    },
    [form, persistModulesState, savingModules]
  );

  const handleRemoveModule = useCallback(
    async (moduleId: string) => {
      if (!form || !form.enabledModules.includes(moduleId) || savingModules) return;

      const enabledModules = form.enabledModules.filter((id) => id !== moduleId);
      const nextSettings = ensureModuleSettingsForEnabledModules(
        enabledModules,
        form.moduleSettings
      );

      const previousForm = form;
      setForm({
        ...form,
        enabledModules,
        moduleSettings: nextSettings,
      });

      setSavingModules(true);
      try {
        await unadoptConfigModule(moduleId, logConfigurationNumericId);
        await persistModulesState(enabledModules, nextSettings);
        showApiSuccess(undefined, "Module removed from Active Modules.");
      } catch (err) {
        setForm(previousForm);
        showApiError(err, API_ERROR_MESSAGES.UNADOPT_CONFIG_MODULE);
      } finally {
        setSavingModules(false);
      }
    },
    [form, logConfigurationNumericId, persistModulesState, savingModules]
  );

  const handleModulesPanelChange = useCallback(
    (next: {
      enabledModules: string[];
      moduleSettings: LogConfigurationFormState["moduleSettings"];
    }) => {
      setForm((current) =>
        current
          ? {
              ...current,
              enabledModules: next.enabledModules,
              moduleSettings: next.moduleSettings,
            }
          : current
      );
    },
    []
  );

  const handleSubsurfaceSettingsChange = useCallback((settings: StoredModuleSettings) => {
    setForm((current) => {
      if (!current) return current;
      const next = cloneModuleSettings(current.moduleSettings);
      next.modules[SUBSURFACES_MODULE_ID] = settings;
      return { ...current, moduleSettings: next };
    });
  }, []);

  const handleSaveModules = async () => {
    if (!form || savingModules) return;

    setSavingModules(true);
    try {
      await persistModulesState(form.enabledModules, form.moduleSettings);
      showApiSuccess(undefined, API_MESSAGES.LOG_CONFIGURATION_UPDATED);
    } catch (err) {
      showApiError(err, API_ERROR_MESSAGES.UPDATE_LOG_CONFIGURATION);
    } finally {
      setSavingModules(false);
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!form || submitting) return;

    setSubmitting(true);
    try {
      const { data, message } = await updateLogConfiguration(
        configurationId,
        {
          name: form.name.trim(),
          status: form.status,
          description: form.description.trim(),
          coordinateSystem: form.coordinateSystem,
          coordinateSystemUnit: form.coordinateSystemUnit,
          allowCoordinateSystemAtLog: form.allowCoordinateSystemAtLog,
          allowCoordinateSystemAtProject: form.allowCoordinateSystemAtProject,
          autoElevation: form.autoElevation,
          coordinateRequirement: form.coordinateRequirement,
          measurementSystem: form.measurementSystem,
          dateFormat: form.dateFormat,
          elevationUnit: form.elevationUnit,
        },
        ownerUserId
      );
      setForm(toLogConfigurationFormState(data));
      showApiSuccess(message, API_MESSAGES.LOG_CONFIGURATION_UPDATED);
    } catch (err) {
      showApiError(err, API_ERROR_MESSAGES.UPDATE_LOG_CONFIGURATION);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className={`settings-page${editingSubsurfaceWorkflow ? " settings-page--workflow-builder" : ""}`}>
      {!editingSubsurfaceWorkflow ? (
        <div
          className={`settings-page__backdrop${mobileSidebarOpen ? " is-open" : ""}`}
          onClick={() => setMobileSidebarOpen(false)}
          aria-hidden="true"
        />
      ) : null}

      <div className="settings-page__layout">
        {!editingSubsurfaceWorkflow ? (
          renderSidebar ? (
            renderSidebar({
              mobileOpen: mobileSidebarOpen,
              onCloseMobile: () => setMobileSidebarOpen(false),
            })
          ) : (
            <SettingsSidebar
              activeSection="log-configurations"
              mobileOpen={mobileSidebarOpen}
              onCloseMobile={() => setMobileSidebarOpen(false)}
            />
          )
        ) : null}

        <div className="settings-page__main">
          {!editingSubsurfaceWorkflow ? (
            <header className="settings-page__header">
              <button
                type="button"
                className="settings-page__menu-btn"
                aria-label={menuButtonAriaLabel}
                onClick={() => setMobileSidebarOpen(true)}
              >
                <HamburgerIcon />
              </button>
              <h1 className="settings-page__title">Configuration settings</h1>
            </header>
          ) : null}

          <div className="settings-page__content">
            {editingSubsurfaceWorkflow && form ? (
              <div className="log-config-wf-builder-page">
                {subsurfaceUserWorkflow.loading || !subsurfaceUserWorkflow.workflow ? (
                  <p className="log-config-detail__loading">Loading workflow…</p>
                ) : (
                  <SubsurfacesWorkflowBuilderPanel
                    configurationName={form.name}
                    logConfigurationId={configurationId}
                    workflow={subsurfaceUserWorkflow.workflow}
                    subsurfaceSettings={form.moduleSettings.modules[SUBSURFACES_MODULE_ID]}
                    disabled={savingModules || subsurfaceUserWorkflow.saving}
                    initialTab="classification"
                    onChange={subsurfaceUserWorkflow.updateWorkflow}
                    onResetToTemplate={subsurfaceUserWorkflow.resetToTemplate}
                    onSubsurfaceSettingsChange={handleSubsurfaceSettingsChange}
                    onBack={() => {
                      void subsurfaceUserWorkflow.flushSave().then((saved) => {
                        if (saved) {
                          setForm((current) => {
                            if (!current) return current;
                            return {
                              ...current,
                              moduleSettings: mergeUserWorkflowIntoModuleSettings(
                                current.moduleSettings,
                                SUBSURFACES_MODULE_ID,
                                saved
                              ),
                            };
                          });
                        }
                        setUserWorkflowsHydrated(false);
                        setEditingSubsurfaceWorkflow(false);
                        setActiveTab("modules");
                      });
                    }}
                  />
                )}
              </div>
            ) : (
            <div className="settings-section log-config-detail">
              <div className="settings-section__card log-config-detail__card">
                <div className="log-config-detail__header">
                  <Link href={listPath} className="log-config-detail__back">
                    <ChevronLeftIcon />
                    Back to log configurations
                  </Link>

                  <h2 className="log-config-detail__title" title={pageTitle}>
                    {pageTitle}
                  </h2>
                  <p className="log-config-detail__description">{pageDescription}</p>
                  {templateSlug ? (
                    <p className="log-config-detail__template-note">
                      Source template: <span>{templateSlug}</span>
                    </p>
                  ) : null}
                </div>

                <div
                  className="log-config-detail__tabs"
                  role="tablist"
                  aria-label="Log configuration sections"
                >
                  {DETAIL_TABS.map((tab) => (
                    <button
                      key={tab.id}
                      type="button"
                      role="tab"
                      aria-selected={activeTab === tab.id}
                      className={`log-config-detail__tab${activeTab === tab.id ? " is-active" : ""}`}
                      onClick={() => setActiveTab(tab.id)}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>

                {loading || !form ? (
                  <p className="log-config-detail__loading">Loading configuration…</p>
                ) : activeTab === "modules" ? (
                  <div className="log-config-detail__form">
                    <ConfigModulesPanel
                      logConfigurationId={configurationId}
                      enabledModuleIds={form.enabledModules}
                      moduleSettings={form.moduleSettings}
                      moduleCatalog={moduleCatalog}
                      catalogLoading={moduleCatalogLoading}
                      disabled={savingModules}
                      onBrowseLibrary={() => setModulesModalOpen(true)}
                      onChange={handleModulesPanelChange}
                      onRemoveModule={handleRemoveModule}
                      onEditSubsurfaceWorkflow={() => setEditingSubsurfaceWorkflow(true)}
                    />

                    <div className="log-config-detail__footer">
                      <UiButton
                        type="button"
                        variant="ghost"
                        disabled={savingModules}
                        onClick={() => router.push(listPath)}
                      >
                        Cancel
                      </UiButton>
                      <UiButton
                        type="button"
                        variant="primary"
                        disabled={savingModules}
                        onClick={() => void handleSaveModules()}
                      >
                        {savingModules ? "Saving…" : "Save"}
                      </UiButton>
                    </div>
                  </div>
                ) : (
                  <form id={formId} className="log-config-detail__form" onSubmit={(event) => void handleSubmit(event)}>
                    <section className="log-config-detail__panel">
                      <div className="log-config-detail__panel-header">
                        <h3 className="log-config-detail__section-title">General information</h3>
                        <p className="log-config-detail__section-description">
                          Update the name, description, and availability of this configuration.
                        </p>
                      </div>

                      <div className="log-config-detail__fields-grid">
                        <FormField label="Log Configuration Name" htmlFor={`${formId}-name`}>
                          <Input
                            id={`${formId}-name`}
                            variant="ui"
                            value={form.name}
                            onChange={(event) =>
                              setForm((current) =>
                                current ? { ...current, name: event.target.value } : current
                              )
                            }
                            disabled={submitting}
                          />
                        </FormField>

                        <FormField label="Description" htmlFor={`${formId}-description`} className="log-config-detail__field--full">
                          <textarea
                            id={`${formId}-description`}
                            className="ui-textarea"
                            rows={3}
                            placeholder="Describe when and where this configuration should be used"
                            value={form.description}
                            onChange={(event) =>
                              setForm((current) =>
                                current ? { ...current, description: event.target.value } : current
                              )
                            }
                            disabled={submitting}
                          />
                        </FormField>
                      </div>

                      <div className="log-config-detail__switch-list">
                        <SettingsSwitchRow
                          id={`${formId}-status`}
                          label="Configuration status"
                          hint="Inactive configurations are hidden when creating or editing projects."
                          checked={form.status === "active"}
                          checkedLabel="Active"
                          uncheckedLabel="Inactive"
                          showStateLabel
                          disabled={submitting}
                          onChange={(checked) =>
                            setForm((current) =>
                              current
                                ? { ...current, status: checked ? "active" : "inactive" }
                                : current
                            )
                          }
                        />
                      </div>
                    </section>

                    <section className="log-config-detail__panel">
                      <div className="log-config-detail__panel-header">
                        <h3 className="log-config-detail__section-title">Data collection settings</h3>
                        <p className="log-config-detail__section-description">
                          Choose units, formats, and coordinate defaults applied when this
                          configuration is in use.
                        </p>
                      </div>

                      <div className="log-config-detail__fields-grid">
                        <FormField label="Coordinate System" htmlFor={`${formId}-coordinate-system`}>
                          <Select
                            id={`${formId}-coordinate-system`}
                            value={form.coordinateSystem}
                            onChange={(value) =>
                              setForm((current) =>
                                current ? { ...current, coordinateSystem: value } : current
                              )
                            }
                            options={LOG_CONFIGURATION_COORDINATE_SYSTEM_OPTIONS}
                            disabled={submitting}
                          />
                        </FormField>

                        <FormField label="Coordinate System Unit" htmlFor={`${formId}-coordinate-unit`}>
                          <Select
                            id={`${formId}-coordinate-unit`}
                            value={form.coordinateSystemUnit}
                            onChange={(value) =>
                              setForm((current) =>
                                current
                                  ? {
                                      ...current,
                                      coordinateSystemUnit:
                                        value as LogConfigurationFormState["coordinateSystemUnit"],
                                    }
                                  : current
                              )
                            }
                            options={LOG_CONFIGURATION_COORDINATE_SYSTEM_UNIT_OPTIONS}
                            disabled={submitting}
                          />
                        </FormField>

                        <FormField label="Coordinate Requirement" htmlFor={`${formId}-coordinate-req`}>
                          <Select
                            id={`${formId}-coordinate-req`}
                            value={form.coordinateRequirement}
                            onChange={(value) =>
                              setForm((current) =>
                                current
                                  ? {
                                      ...current,
                                      coordinateRequirement:
                                        value as LogConfigurationFormState["coordinateRequirement"],
                                    }
                                  : current
                              )
                            }
                            options={LOG_CONFIGURATION_COORDINATE_REQUIREMENT_OPTIONS}
                            disabled={submitting}
                          />
                        </FormField>

                        <FormField label="Measurement System" htmlFor={`${formId}-measurement`}>
                          <Select
                            id={`${formId}-measurement`}
                            value={form.measurementSystem}
                            onChange={(value) =>
                              setForm((current) =>
                                current
                                  ? {
                                      ...current,
                                      measurementSystem:
                                        value as LogConfigurationFormState["measurementSystem"],
                                    }
                                  : current
                              )
                            }
                            options={LOG_CONFIGURATION_MEASUREMENT_SYSTEM_OPTIONS}
                            disabled={submitting}
                          />
                        </FormField>

                        <FormField label="Date Format" htmlFor={`${formId}-date-format`}>
                          <Select
                            id={`${formId}-date-format`}
                            value={form.dateFormat}
                            onChange={(value) =>
                              setForm((current) =>
                                current
                                  ? { ...current, dateFormat: value as LogConfigurationFormState["dateFormat"] }
                                  : current
                              )
                            }
                            options={LOG_CONFIGURATION_DATE_FORMAT_OPTIONS}
                            disabled={submitting}
                          />
                        </FormField>

                        <FormField label="Elevation Unit" htmlFor={`${formId}-elevation-unit`}>
                          <Select
                            id={`${formId}-elevation-unit`}
                            value={form.elevationUnit}
                            onChange={(value) =>
                              setForm((current) =>
                                current
                                  ? {
                                      ...current,
                                      elevationUnit: value as LogConfigurationFormState["elevationUnit"],
                                    }
                                  : current
                              )
                            }
                            options={LOG_CONFIGURATION_ELEVATION_UNIT_OPTIONS}
                            disabled={submitting}
                          />
                        </FormField>
                      </div>

                      <div className="log-config-detail__switch-list log-config-detail__switch-list--grid">
                        <SettingsSwitchRow
                          id={`${formId}-allow-log`}
                          label="Allow coordinate system at log level"
                          checked={form.allowCoordinateSystemAtLog}
                          disabled={submitting}
                          onChange={(checked) =>
                            setForm((current) =>
                              current ? { ...current, allowCoordinateSystemAtLog: checked } : current
                            )
                          }
                        />
                        <SettingsSwitchRow
                          id={`${formId}-allow-project`}
                          label="Allow coordinate system at project level"
                          checked={form.allowCoordinateSystemAtProject}
                          disabled={submitting}
                          onChange={(checked) =>
                            setForm((current) =>
                              current
                                ? { ...current, allowCoordinateSystemAtProject: checked }
                                : current
                            )
                          }
                        />
                        <SettingsSwitchRow
                          id={`${formId}-auto-elevation`}
                          label="Auto elevation"
                          checked={form.autoElevation}
                          disabled={submitting}
                          onChange={(checked) =>
                            setForm((current) =>
                              current ? { ...current, autoElevation: checked } : current
                            )
                          }
                        />
                      </div>
                    </section>

                    <section className="log-config-detail__panel log-config-detail__panel--manage">
                      <div className="log-config-detail__panel-header log-config-detail__panel-header--row">
                        <div>
                          <h3 className="log-config-detail__section-title">Project Details Custom Fields</h3>
                          <p className="settings-section__card-description">
                            Different regions require different fields. Manage project custom fields
                            for this configuration.
                          </p>
                        </div>
                        <UiButton
                          type="button"
                          variant="secondary"
                          size="sm"
                          disabled={submitting}
                          onClick={() => setProjectDetailFieldsOpen(true)}
                        >
                          Manage
                        </UiButton>
                      </div>
                    </section>

                    <section className="log-config-detail__panel log-config-detail__panel--manage">
                      <div className="log-config-detail__panel-header log-config-detail__panel-header--row">
                        <div>
                          <h3 className="log-config-detail__section-title">Log Details Custom Fields</h3>
                          <p className="settings-section__card-description">
                            Different regions and log types require different fields. Manage log custom
                            fields for this configuration.
                          </p>
                        </div>
                        <UiButton
                          type="button"
                          variant="secondary"
                          size="sm"
                          disabled={submitting}
                          onClick={() => setLogDetailFieldsOpen(true)}
                        >
                          Manage
                        </UiButton>
                      </div>
                    </section>

                    <div className="log-config-detail__footer">
                      <UiButton type="button" variant="ghost" disabled={submitting} onClick={() => router.push(listPath)}>
                        Cancel
                      </UiButton>
                      <UiButton type="submit" variant="primary" disabled={submitting}>
                        {submitting ? "Saving…" : "Save changes"}
                      </UiButton>
                    </div>
                  </form>
                )}
              </div>
            </div>
            )}
          </div>
        </div>
      </div>

      {form ? (
        <ManageProjectDetailsFieldsModal
          open={projectDetailFieldsOpen}
          configurationId={configurationId}
          settings={form.projectDetailFields}
          onClose={() => setProjectDetailFieldsOpen(false)}
          onSaved={(projectDetailFields) =>
            setForm((current) => (current ? { ...current, projectDetailFields } : current))
          }
        />
      ) : null}

      {form ? (
        <ManageLogDetailsFieldsModal
          open={logDetailFieldsOpen}
          configurationId={configurationId}
          settings={form.logDetailFields}
          onClose={() => setLogDetailFieldsOpen(false)}
          onSaved={(logDetailFields) =>
            setForm((current) => (current ? { ...current, logDetailFields } : current))
          }
        />
      ) : null}

      {form ? (
        <ManageModulesModal
          open={modulesModalOpen}
          logConfigurationId={configurationId}
          enabledModuleIds={form.enabledModules}
          onClose={() => setModulesModalOpen(false)}
          onAddModule={handleAddModule}
        />
      ) : null}
    </div>
  );
}
