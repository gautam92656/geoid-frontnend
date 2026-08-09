import type { SelectOption } from "@/shared/components/ui";

export type ReportPreviewTypeId = "borelog" | "corelog";

export type ReportPreviewType = Readonly<{
  id: ReportPreviewTypeId;
  label: string;
}>;

export const REPORT_PREVIEW_TYPES: readonly ReportPreviewType[] = [
  { id: "borelog", label: "Borelog" },
  { id: "corelog", label: "Corelog" },
] as const;

export type ReportConfig = Readonly<{
  template: string;
  orientation: string;
  pageSize: string;
  header: string;
  footer: string;
  metresPerPage: string;
  builderVersion: string;
}>;

export const BORELOG_TEMPLATE_OPTIONS: readonly SelectOption[] = [
  { value: "marsh-gen-2", label: "Marsh Template Gen 2" },
  { value: "standard", label: "Standard Template" },
];

export const CORELOG_TEMPLATE_OPTIONS: readonly SelectOption[] = [
  { value: "rock-logging", label: "Rock Logging" },
  { value: "core-logging-standard", label: "Core Logging Standard" },
  { value: "geotech-core", label: "Geotech Core Template" },
];

export const REPORT_ORIENTATION_OPTIONS: readonly SelectOption[] = [
  { value: "portrait", label: "Portrait" },
  { value: "landscape", label: "Landscape" },
];

export const REPORT_PAGE_SIZE_OPTIONS: readonly SelectOption[] = [
  { value: "a4", label: "A4" },
  { value: "a3", label: "A3" },
  { value: "letter", label: "Letter" },
];

export const BORELOG_HEADER_OPTIONS: readonly SelectOption[] = [
  { value: "header-template-00", label: "header template 00" },
  { value: "header-template-01", label: "header template 01" },
];

export const BORELOG_FOOTER_OPTIONS: readonly SelectOption[] = [
  { value: "footer-template-00", label: "footer template 00" },
  { value: "footer-template-01", label: "footer template 01" },
];

export const LOG_CONFIG_HEADER_OPTIONS: readonly SelectOption[] = [
  { value: "header-template-00", label: "header template 00" },
  { value: "header-template-01", label: "header template 01" },
  { value: "core-header-00", label: "core header 00" },
  { value: "core-header-01", label: "core header 01" },
];

export const LOG_CONFIG_FOOTER_OPTIONS: readonly SelectOption[] = [
  { value: "footer-template-00", label: "footer template 00" },
  { value: "footer-template-01", label: "footer template 01" },
  { value: "core-footer-00", label: "core footer 00" },
  { value: "core-footer-01", label: "core footer 01" },
];

export const CORELOG_HEADER_OPTIONS: readonly SelectOption[] = [
  { value: "core-header-00", label: "core header 00" },
  { value: "core-header-01", label: "core header 01" },
];

export const CORELOG_FOOTER_OPTIONS: readonly SelectOption[] = [
  { value: "core-footer-00", label: "core footer 00" },
  { value: "core-footer-01", label: "core footer 01" },
];

export const LOG_BUILDER_VERSION_OPTIONS: readonly SelectOption[] = [
  { value: "latest", label: "Latest" },
  { value: "v2.1", label: "v2.1" },
  { value: "v2.0", label: "v2.0" },
];

export const DEFAULT_BORELOG_TEMPLATE = "marsh-gen-2";
export const DEFAULT_CORELOG_TEMPLATE = "rock-logging";
export const DEFAULT_REPORT_ORIENTATION = "portrait";
export const DEFAULT_REPORT_PAGE_SIZE = "a4";
export const DEFAULT_BORELOG_HEADER = "header-template-00";
export const DEFAULT_BORELOG_FOOTER = "footer-template-00";
export const DEFAULT_LOG_BUILDER_VERSION = "latest";

export const DEFAULT_REPORT_CONFIG: Record<ReportPreviewTypeId, ReportConfig> = {
  borelog: {
    template: DEFAULT_BORELOG_TEMPLATE,
    orientation: DEFAULT_REPORT_ORIENTATION,
    pageSize: DEFAULT_REPORT_PAGE_SIZE,
    header: DEFAULT_BORELOG_HEADER,
    footer: DEFAULT_BORELOG_FOOTER,
    metresPerPage: "2",
    builderVersion: DEFAULT_LOG_BUILDER_VERSION,
  },
  corelog: {
    template: DEFAULT_CORELOG_TEMPLATE,
    orientation: DEFAULT_REPORT_ORIENTATION,
    pageSize: DEFAULT_REPORT_PAGE_SIZE,
    header: "",
    footer: "",
    metresPerPage: "",
    builderVersion: DEFAULT_LOG_BUILDER_VERSION,
  },
};

export const REPORT_PREVIEW_ZOOM = {
  min: 60,
  max: 140,
  step: 5,
  default: 100,
} as const;

export function getReportTemplateLabel(
  previewType: ReportPreviewTypeId,
  template: string
): string {
  const options =
    previewType === "borelog" ? BORELOG_TEMPLATE_OPTIONS : CORELOG_TEMPLATE_OPTIONS;
  return options.find((option) => option.value === template)?.label ?? template;
}
