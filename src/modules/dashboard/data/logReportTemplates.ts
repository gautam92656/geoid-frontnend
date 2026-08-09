export type LogReportTemplateLogType = "borelog" | "corelog";

export type LogReportTemplateRecord = {
  id: string;
  name: string;
  logType: LogReportTemplateLogType;
  isDefault: boolean;
  createdAt: string;
  logConfigurationIds: string[];
};

export type LogReportHeaderFooterRecord = {
  id: string;
  name: string;
};

export const LOG_REPORT_TEMPLATE_LOG_CONFIG_OPTIONS = [
  {
    value: "as1726-2017-rev2",
    label: "AS1726-2017 - Australian Standard for Geotechnical Investigations - Revision 2",
  },
  {
    value: "as1726-2017-rev1",
    label: "AS1726-2017 - Australian Standard for Geotechnical Investigations - Revision 1",
  },
] as const;

export const DEFAULT_LOG_REPORT_TEMPLATES: LogReportTemplateRecord[] = [
  {
    id: "marsh-gen-2",
    name: "Marsh Template Gen 2",
    logType: "borelog",
    isDefault: true,
    createdAt: "2024-12-19",
    logConfigurationIds: ["as1726-2017-rev2"],
  },
  {
    id: "rock-logging",
    name: "Rock Logging",
    logType: "corelog",
    isDefault: true,
    createdAt: "2024-03-24",
    logConfigurationIds: ["as1726-2017-rev2", "as1726-2017-rev1"],
  },
  {
    id: "marsh-gen-2-pp",
    name: "Marsh Template Gen 2 PP",
    logType: "borelog",
    isDefault: false,
    createdAt: "2026-07-02",
    logConfigurationIds: ["as1726-2017-rev2"],
  },
  {
    id: "marsh-spt",
    name: "Marsh Template SPT",
    logType: "borelog",
    isDefault: false,
    createdAt: "2026-03-25",
    logConfigurationIds: ["as1726-2017-rev2", "as1726-2017-rev1"],
  },
  {
    id: "new-template",
    name: "New Template",
    logType: "borelog",
    isDefault: false,
    createdAt: "2026-07-17",
    logConfigurationIds: ["as1726-2017-rev2"],
  },
  {
    id: "trial-new-template",
    name: "Trial New Template",
    logType: "borelog",
    isDefault: false,
    createdAt: "2026-06-14",
    logConfigurationIds: ["as1726-2017-rev2"],
  },
  {
    id: "dcp-log-only",
    name: "DCP Log Only",
    logType: "borelog",
    isDefault: false,
    createdAt: "2023-01-06",
    logConfigurationIds: [],
  },
  {
    id: "marsh",
    name: "Marsh",
    logType: "borelog",
    isDefault: false,
    createdAt: "2022-06-25",
    logConfigurationIds: [],
  },
  {
    id: "test-pit",
    name: "Test Pit",
    logType: "borelog",
    isDefault: false,
    createdAt: "2023-12-01",
    logConfigurationIds: [],
  },
];

export const DEFAULT_LOG_REPORT_HEADERS: LogReportHeaderFooterRecord[] = [
  { id: "header-template-00", name: "header template 00" },
  { id: "header-template-01", name: "header template 01" },
  { id: "core-header-00", name: "core header 00" },
  { id: "core-header-01", name: "core header 01" },
];

export const DEFAULT_LOG_REPORT_FOOTERS: LogReportHeaderFooterRecord[] = [
  { id: "site-plan-template-1", name: "Site Plan Template 1" },
  { id: "footer-template-00", name: "footer template 00" },
  { id: "footer-template-01", name: "footer template 01" },
  { id: "core-footer-00", name: "core footer 00" },
  { id: "core-footer-01", name: "core footer 01" },
];

export function formatLogReportTemplateDate(isoDate: string): string {
  const date = new Date(`${isoDate}T00:00:00`);
  if (Number.isNaN(date.getTime())) return isoDate;
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
  });
}

export function getLogConfigurationSummary(
  ids: readonly string[],
  options: readonly { value: string; label: string }[] = LOG_REPORT_TEMPLATE_LOG_CONFIG_OPTIONS
): string {
  if (ids.length === 0) return "Select Log Configuration/s";
  if (ids.length === options.length && options.length > 1) return `All (${ids.length})`;
  if (ids.length === 1) {
    return options.find((option) => option.value === ids[0])?.label ?? ids[0] ?? "";
  }
  return `${ids.length} selected`;
}
