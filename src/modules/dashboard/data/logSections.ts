import {
  CORE_LOGGING_MODULE_ID,
  DRILLING_OBSERVATIONS_MODULE_ID,
  INSITU_TESTS_USA_MODULE_ID,
  LAB_TESTS_MODULE_ID,
  LOG_REMARKS_MODULE_ID,
  LOG_REPORT_MODULE_ID,
  SAMPLES_MODULE_ID,
  SUBSURFACES_MODULE_ID,
  WATER_OBSERVATIONS_MODULE_ID,
  WELL_LOGS_MODULE_ID,
} from "../utils/configModules";

export const LOG_SECTIONS = [
  { id: "details", label: "Log Details" },
  { id: "report", label: "Log Report" },
  { id: "subsurface", label: "Subsurface" },
  { id: "insitu-tests", label: "Insitu Tests" },
  { id: "remarks", label: "Remarks" },
  { id: "drilling-observations", label: "Drilling Observations" },
  { id: "water-observations", label: "Water Observations" },
  { id: "well-logs", label: "Well Logs" },
  // { id: "photos", label: "Log Photos" },
  { id: "samples", label: "Samples" },
  { id: "lab-tests", label: "Lab Tests" },
  { id: "core-logging", label: "Core Logging" },
] as const;

export type LogSectionId = (typeof LOG_SECTIONS)[number]["id"];

/** Maps Update Log tabs to log-configuration module template slugs. */
export const LOG_SECTION_MODULE_ID: Partial<Record<LogSectionId, string>> = {
  report: LOG_REPORT_MODULE_ID,
  subsurface: SUBSURFACES_MODULE_ID,
  "insitu-tests": INSITU_TESTS_USA_MODULE_ID,
  remarks: LOG_REMARKS_MODULE_ID,
  "drilling-observations": DRILLING_OBSERVATIONS_MODULE_ID,
  "water-observations": WATER_OBSERVATIONS_MODULE_ID,
  "well-logs": WELL_LOGS_MODULE_ID,
  samples: SAMPLES_MODULE_ID,
  "lab-tests": LAB_TESTS_MODULE_ID,
  "core-logging": CORE_LOGGING_MODULE_ID,
};

/**
 * Sections visible for a log based on the selected log configuration's enabled modules.
 * `details` is always shown; other tabs require their module to be in `enabledModules`.
 */
export function getVisibleLogSections(
  enabledModules: readonly string[] | null | undefined
): (typeof LOG_SECTIONS)[number][] {
  const enabled = new Set(enabledModules ?? []);

  return LOG_SECTIONS.filter((section) => {
    const moduleId = LOG_SECTION_MODULE_ID[section.id];
    return !moduleId || enabled.has(moduleId);
  });
}

export function isLogSectionVisible(
  sectionId: LogSectionId,
  enabledModules: readonly string[] | null | undefined
): boolean {
  return getVisibleLogSections(enabledModules).some((section) => section.id === sectionId);
}
