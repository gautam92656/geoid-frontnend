import type { StoredModuleSettings } from "../utils/configModules/types";

export type ConfigModuleTagTone = "geotechnical" | "category" | "region";

export type ConfigModuleTag = {
  label: string;
  tone: ConfigModuleTagTone;
};

export type ConfigModuleScope = "common" | "user";

export type ConfigModuleDefinition = {
  /** Template / enablement id (sourceSlug for user modules). */
  id: string;
  recordId?: number;
  slug: string;
  sourceSlug?: string | null;
  title: string;
  description: string;
  tags: readonly ConfigModuleTag[];
  filterCategories: readonly string[];
  scope: ConfigModuleScope;
  /** Log configuration this user module belongs to (null for common templates). */
  logConfigurationId?: number | null;
  /** Configuration-scoped customization when scope is user. */
  settings?: StoredModuleSettings | null;
  available?: boolean;
  sortOrder?: number;
};

export type PaginatedConfigModules = {
  data: ConfigModuleDefinition[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

export const CONFIG_MODULE_FILTER_OPTIONS = [
  { value: "all", label: "All" },
  { value: "Geotechnical", label: "Geotechnical" },
  { value: "Borelogging", label: "Borelogging" },
  { value: "Logs", label: "Logs" },
  { value: "Reporting", label: "Reporting" },
  { value: "USA", label: "USA" },
  { value: "Core logging", label: "Core logging" },
] as const;

export type ConfigModuleFilter =
  (typeof CONFIG_MODULE_FILTER_OPTIONS)[number]["value"];

export const CONFIG_MODULE_SCOPE_FILTER_OPTIONS = [
  { value: "all", label: "All modules" },
  { value: "common", label: "Common modules" },
  { value: "user", label: "My modules" },
] as const;

export type ConfigModuleScopeFilter =
  (typeof CONFIG_MODULE_SCOPE_FILTER_OPTIONS)[number]["value"];

/** Fallback metadata when the API catalog is unavailable (e.g. offline panel labels). */
export const CONFIG_MODULES: readonly ConfigModuleDefinition[] = [
  {
    id: "insitu-tests-usa",
    slug: "insitu-tests-usa",
    title: "Insitu-Tests (USA)",
    description: "Geotechnical field tests for USA",
    tags: [
      { label: "Geotechnical", tone: "geotechnical" },
      { label: "Borelogging", tone: "category" },
      { label: "USA", tone: "region" },
    ],
    filterCategories: ["Geotechnical", "Borelogging", "USA"],
    scope: "common",
  },
  {
    id: "core-logging",
    slug: "core-logging",
    title: "Core Logging",
    description: "Capture core defects and RQD / TCR data",
    tags: [
      { label: "Geotechnical", tone: "geotechnical" },
      { label: "Borelogging", tone: "category" },
      { label: "Core logging", tone: "category" },
    ],
    filterCategories: ["Geotechnical", "Borelogging", "Core logging"],
    scope: "common",
  },
  {
    id: "log-report",
    slug: "log-report",
    title: "Log Report",
    description: "Manages log reports and their templates.",
    tags: [
      { label: "Logs", tone: "category" },
      { label: "Reporting", tone: "category" },
    ],
    filterCategories: ["Logs", "Reporting"],
    scope: "common",
  },
  {
    id: "log-remarks",
    slug: "log-remarks",
    title: "Log Remarks",
    description: "A module to capture additional log remarks",
    tags: [
      { label: "Geotechnical", tone: "geotechnical" },
      { label: "Borelogging", tone: "category" },
      { label: "USA", tone: "region" },
    ],
    filterCategories: ["Geotechnical", "Borelogging", "USA"],
    scope: "common",
  },
  {
    id: "subsurfaces",
    slug: "subsurfaces",
    title: "Subsurfaces",
    description: "Log borelog subsurface profiles",
    tags: [
      { label: "Geotechnical", tone: "geotechnical" },
      { label: "Borelogging", tone: "category" },
    ],
    filterCategories: ["Geotechnical", "Borelogging"],
    scope: "common",
  },
  {
    id: "drilling-observations",
    slug: "drilling-observations",
    title: "Drilling Observations",
    description: "Capture drilling methods, resistance, casing, and observations",
    tags: [
      { label: "Geotechnical", tone: "geotechnical" },
      { label: "Borelogging", tone: "category" },
    ],
    filterCategories: ["Geotechnical", "Borelogging"],
    scope: "common",
  },
  {
    id: "water-observations",
    slug: "water-observations",
    title: "Water Observations",
    description: "Record groundwater and water observation entries",
    tags: [
      { label: "Geotechnical", tone: "geotechnical" },
      { label: "Borelogging", tone: "category" },
    ],
    filterCategories: ["Geotechnical", "Borelogging"],
    scope: "common",
  },
  {
    id: "well-logs",
    slug: "well-logs",
    title: "Well Logs",
    description: "Configure well construction details for logs",
    tags: [
      { label: "Geotechnical", tone: "geotechnical" },
      { label: "Borelogging", tone: "category" },
    ],
    filterCategories: ["Geotechnical", "Borelogging"],
    scope: "common",
  },
  {
    id: "samples",
    slug: "samples",
    title: "Samples",
    description: "Configure sample collection settings and sample data types for logs",
    tags: [
      { label: "Geotechnical", tone: "geotechnical" },
      { label: "Borelogging", tone: "category" },
    ],
    filterCategories: ["Geotechnical", "Borelogging"],
    scope: "common",
  },
  {
    id: "lab-tests",
    slug: "lab-tests",
    title: "Lab Tests",
    description: "Configure lab test types and presets available for log configurations",
    tags: [
      { label: "Geotechnical", tone: "geotechnical" },
      { label: "Borelogging", tone: "category" },
    ],
    filterCategories: ["Geotechnical", "Borelogging"],
    scope: "common",
  },
];

const REMOVED_MODULE_IDS = new Set(["cpt", "mwd", "ground-water-monitoring"]);

const MODULE_BY_ID = new Map(CONFIG_MODULES.map((module) => [module.id, module]));

export function getConfigModule(
  id: string
): ConfigModuleDefinition | undefined {
  return MODULE_BY_ID.get(id);
}

/** Template id used for settings panels / defaults. */
export function getModuleTemplateId(
  module: Pick<ConfigModuleDefinition, "id" | "sourceSlug" | "slug">
): string {
  return module.sourceSlug?.trim() || module.id || module.slug;
}

/**
 * Resolve a module definition for an enabled template id.
 * Prefers the user's adopted copy when present in the catalog.
 */
export function resolveConfigModule(
  id: string,
  catalog: readonly ConfigModuleDefinition[] = CONFIG_MODULES
): ConfigModuleDefinition {
  const userCopy = catalog.find(
    (module) => module.scope === "user" && (module.sourceSlug === id || module.id === id)
  );
  if (userCopy) {
    return {
      ...userCopy,
      id, // keep enablement key as template id
    };
  }

  const common = catalog.find(
    (module) => module.scope === "common" && (module.id === id || module.slug === id)
  );
  if (common) return common;

  const fallback = getConfigModule(id);
  if (fallback) return fallback;

  return {
    id,
    slug: id,
    title: id,
    description: "",
    tags: [{ label: "Custom", tone: "category" }],
    filterCategories: [],
    scope: "user",
  };
}

export function parseEnabledModuleIds(value: unknown): string[] {
  if (!Array.isArray(value)) return [];

  const seen = new Set<string>();

  return value.filter((entry): entry is string => {
    if (typeof entry !== "string") return false;
    const slug = entry.trim();
    if (!slug || seen.has(slug) || REMOVED_MODULE_IDS.has(slug)) return false;
    seen.add(slug);
    return true;
  });
}
