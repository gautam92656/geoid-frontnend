import { isRecord } from "../helpers";
import type {
  LogReportModuleConfig,
  LogReportWatermarkStatusId,
  ModuleSettingsSpec,
} from "../types";
import { LOG_REPORT_WATERMARK_STATUSES } from "../types";

export const LOG_REPORT_MODULE_ID = "log-report" as const;

export type { LogReportModuleConfig, LogReportWatermarkStatusId };
export { LOG_REPORT_WATERMARK_STATUSES };

export function createDefaultLogReportConfig(): LogReportModuleConfig {
  const watermarkTexts = {} as Record<LogReportWatermarkStatusId, string>;
  for (const status of LOG_REPORT_WATERMARK_STATUSES) {
    watermarkTexts[status.id] = "";
  }

  return {
    borelogTemplate: "marsh-gen-2",
    corelogTemplate: "rock-logging",
    adjustChartsFocusedView: false,
    logHeader: "",
    logFooter: "",
    watermarksEnabled: false,
    watermarkFontSize: 48,
    watermarkTexts,
  };
}

export function parseLogReportConfig(value: unknown): LogReportModuleConfig {
  const defaults = createDefaultLogReportConfig();
  if (!isRecord(value)) return defaults;

  const watermarkTexts = { ...defaults.watermarkTexts };
  const textsSource = isRecord(value.watermarkTexts) ? value.watermarkTexts : {};
  for (const status of LOG_REPORT_WATERMARK_STATUSES) {
    const text = textsSource[status.id];
    if (typeof text === "string") watermarkTexts[status.id] = text;
  }

  const fontSize =
    typeof value.watermarkFontSize === "number" && Number.isFinite(value.watermarkFontSize)
      ? Math.max(1, Math.min(200, Math.round(value.watermarkFontSize)))
      : defaults.watermarkFontSize;

  return {
    borelogTemplate:
      typeof value.borelogTemplate === "string" ? value.borelogTemplate : defaults.borelogTemplate,
    corelogTemplate:
      typeof value.corelogTemplate === "string" ? value.corelogTemplate : defaults.corelogTemplate,
    adjustChartsFocusedView:
      typeof value.adjustChartsFocusedView === "boolean"
        ? value.adjustChartsFocusedView
        : defaults.adjustChartsFocusedView,
    logHeader: typeof value.logHeader === "string" ? value.logHeader : defaults.logHeader,
    logFooter: typeof value.logFooter === "string" ? value.logFooter : defaults.logFooter,
    watermarksEnabled:
      typeof value.watermarksEnabled === "boolean"
        ? value.watermarksEnabled
        : defaults.watermarksEnabled,
    watermarkFontSize: fontSize,
    watermarkTexts,
  };
}

export const logReportModule: ModuleSettingsSpec = {
  id: LOG_REPORT_MODULE_ID,
  displayName: "Log Report",
  dataTypes: [],
  defaultOptions: {},
  defaultShowOnMobile: false,
  enrichDefaults: (settings) => ({
    ...settings,
    report: createDefaultLogReportConfig(),
  }),
  enrichParsed: (value, settings) => {
    const reportSource = isRecord(value) && isRecord(value.report) ? value.report : value;
    return {
      ...settings,
      report: parseLogReportConfig(reportSource),
    };
  },
  cloneExtra: (entry) =>
    entry.report
      ? {
          report: {
            ...entry.report,
            watermarkTexts: { ...entry.report.watermarkTexts },
          },
        }
      : {},
};
