import type { ModuleDataTypeDefinition, ModuleNamedOption, ModuleSettingsSpec } from "./types";
import { coreLoggingModule } from "./modules/core-logging";
import { drillingObservationsModule } from "./modules/drilling-observations";
import { insituTestsUsaModule } from "./modules/insitu-tests-usa";
import { logRemarksModule } from "./modules/log-remarks";
import { logReportModule } from "./modules/log-report";
import { subsurfacesModule } from "./modules/subsurfaces";
import { waterObservationsModule } from "./modules/water-observations";
import { wellLogsModule } from "./modules/well-logs";
import { samplesModule } from "./modules/samples";
import { labTestsModule } from "./modules/lab-tests";

export const MODULE_SETTINGS_SPECS: readonly ModuleSettingsSpec[] = [
  subsurfacesModule,
  insituTestsUsaModule,
  logRemarksModule,
  drillingObservationsModule,
  waterObservationsModule,
  wellLogsModule,
  samplesModule,
  labTestsModule,
  coreLoggingModule,
  logReportModule,
];

const SPECS_BY_ID = new Map(MODULE_SETTINGS_SPECS.map((spec) => [spec.id, spec]));

export function getModuleSettingsSpec(moduleId: string): ModuleSettingsSpec | undefined {
  return SPECS_BY_ID.get(moduleId);
}

/** Tablogs-aligned data types shown under Manage Data Types. */
export const MODULE_DATA_TYPES: Record<string, readonly ModuleDataTypeDefinition[]> =
  Object.fromEntries(MODULE_SETTINGS_SPECS.map((spec) => [spec.id, spec.dataTypes]));

export const DEFAULT_MODULE_DISPLAY_NAMES: Record<string, string> = Object.fromEntries(
  MODULE_SETTINGS_SPECS.map((spec) => [spec.id, spec.displayName])
);

/** Default option lists seeded from Tablogs HAR samples. */
export const DEFAULT_DATA_TYPE_OPTIONS: Record<string, ModuleNamedOption[]> = (() => {
  const options: Record<string, ModuleNamedOption[]> = {};
  for (const spec of MODULE_SETTINGS_SPECS) {
    for (const [dataTypeId, entries] of Object.entries(spec.defaultOptions)) {
      options[dataTypeId] = entries;
    }
  }
  return options;
})();
