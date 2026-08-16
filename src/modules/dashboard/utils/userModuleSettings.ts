import type {
  ConfigModuleDefinition,
} from "../data/configModules";
import { resolveConfigModule } from "../data/configModules";
import type {
  ConfigModuleSettings,
  StoredModuleSettings,
} from "../utils/configModules";
import {
  cloneModuleSettings,
  ensureModuleSettingsForEnabledModules,
  parseStoredModuleSettings,
} from "../utils/configModules";

/**
 * Overlay configuration-scoped module customizations onto log-configuration module settings.
 * Catalog (user-scope) settings for this log configuration win when present;
 * config settings fill gaps for legacy data.
 */
export function hydrateModuleSettingsFromUserCatalog(
  enabledModuleIds: readonly string[],
  current: ConfigModuleSettings,
  catalog: readonly ConfigModuleDefinition[]
): ConfigModuleSettings {
  const next = cloneModuleSettings(
    ensureModuleSettingsForEnabledModules(enabledModuleIds, current)
  );

  for (const moduleId of enabledModuleIds) {
    const definition = resolveConfigModule(moduleId, catalog);
    if (definition.scope !== "user" || !definition.settings) continue;
    const parsed = parseStoredModuleSettings(definition.settings, moduleId);
    // Origin / rock / non-soil / texture / finish-reasons / core-logging catalogs
    // come from dedicated APIs — don't let stale module-settings JSON win.
    next.modules[moduleId] = {
      ...parsed,
      dataTypeOptions: {
        ...parsed.dataTypeOptions,
        origin: next.modules[moduleId]?.dataTypeOptions.origin ?? [],
        rock_type: next.modules[moduleId]?.dataTypeOptions.rock_type ?? [],
        non_soil_type: next.modules[moduleId]?.dataTypeOptions.non_soil_type ?? [],
        rock_texture: next.modules[moduleId]?.dataTypeOptions.rock_texture ?? [],
        "finish-reasons": next.modules[moduleId]?.dataTypeOptions["finish-reasons"] ?? [],
        "finish-texts": next.modules[moduleId]?.dataTypeOptions["finish-texts"] ?? [],
        colors: next.modules[moduleId]?.dataTypeOptions.colors ?? [],
        geomodal_layer: next.modules[moduleId]?.dataTypeOptions.geomodal_layer ?? [],
        "core-defect-types":
          next.modules[moduleId]?.dataTypeOptions["core-defect-types"] ?? [],
        "aperture-colors": next.modules[moduleId]?.dataTypeOptions["aperture-colors"] ?? [],
        "aperture-minerals":
          next.modules[moduleId]?.dataTypeOptions["aperture-minerals"] ?? [],
        "infill-materials":
          next.modules[moduleId]?.dataTypeOptions["infill-materials"] ?? [],
        "surface-shapes":
          next.modules[moduleId]?.dataTypeOptions["surface-shapes"] ?? [],
        "surface-roughnesses":
          next.modules[moduleId]?.dataTypeOptions["surface-roughnesses"] ?? [],
        "defect-opennesses":
          next.modules[moduleId]?.dataTypeOptions["defect-opennesses"] ?? [],
        "defect-coatings":
          next.modules[moduleId]?.dataTypeOptions["defect-coatings"] ?? [],
        "remark-types": next.modules[moduleId]?.dataTypeOptions["remark-types"] ?? [],
        "remarks-quick-notes":
          next.modules[moduleId]?.dataTypeOptions["remarks-quick-notes"] ?? [],
        "drilling-types": next.modules[moduleId]?.dataTypeOptions["drilling-types"] ?? [],
        "drilling-resistances":
          next.modules[moduleId]?.dataTypeOptions["drilling-resistances"] ?? [],
        "drilling-observations":
          next.modules[moduleId]?.dataTypeOptions["drilling-observations"] ?? [],
        "drilling-casings": next.modules[moduleId]?.dataTypeOptions["drilling-casings"] ?? [],
        "water-observation-types":
          next.modules[moduleId]?.dataTypeOptions["water-observation-types"] ?? [],
      },
    };
  }

  return next;
}

/** Build the payload used to persist customizations for a specific log configuration. */
export function buildUserModuleSettingsSyncPayload(
  enabledModuleIds: readonly string[],
  moduleSettings: ConfigModuleSettings
): Record<string, StoredModuleSettings> {
  const payload: Record<string, StoredModuleSettings> = {};
  for (const moduleId of enabledModuleIds) {
    const settings = moduleSettings.modules[moduleId];
    if (!settings) continue;
    payload[moduleId] = settings;
  }
  return payload;
}
