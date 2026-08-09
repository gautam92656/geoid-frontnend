export type LogConfigurationTemplateRegion = "AU";

export type LogConfigurationTemplateDiscipline = "Geotechnical" | "Environmental";

export type LogConfigurationTemplate = {
  id: string;
  slug: string;
  name: string;
  description: string;
  region: LogConfigurationTemplateRegion;
  disciplines: LogConfigurationTemplateDiscipline[];
  available: boolean;
  sortOrder?: number;
};

export type PaginatedLogConfigurationTemplates = {
  data: LogConfigurationTemplate[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

/** Active regions in the template library. Add more regions here when ready. */
export const ENABLED_LOG_CONFIGURATION_TEMPLATE_REGIONS: readonly LogConfigurationTemplateRegion[] =
  ["AU"];

export const LOG_CONFIGURATION_TEMPLATE_REGIONS: readonly {
  id: LogConfigurationTemplateRegion;
  label: string;
}[] = [{ id: "AU", label: "Australia" }];

export const LOG_CONFIGURATION_TEMPLATE_DISCIPLINES: readonly LogConfigurationTemplateDiscipline[] =
  ["Geotechnical", "Environmental"];
