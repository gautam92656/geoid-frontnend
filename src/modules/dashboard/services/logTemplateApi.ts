import apiClient from "@/shared/services/apiClient";
import { extractApiMessage } from "@/shared/utils/apiMessage";
import type { ApiEnvelope } from "@/shared/types/api";
import {
  createDefaultLogTemplateConfig,
  normalizeLogTemplateConfig,
} from "../components/logTemplateBuilder/contentSchema";
import selectionGroups from "../data/logTemplateSelectionGroups.json";
import soilGraphics from "../data/logTemplateSoilGraphics.json";
import type {
  LogTemplateConfig,
  LogTemplateListPayload,
  LogTemplateLogType,
  LogTemplateRecord,
  LogTemplateSelectionGroup,
  LogTemplateSoilGraphic,
} from "../types/logTemplate";

const BASE = "/log-report-templates";

function logReportTemplatesBasePath(ownerUserId?: number): string {
  return ownerUserId != null
    ? `/admin/users/${ownerUserId}/log-report-templates`
    : BASE;
}

export type LogTemplateBuilderConfiguration = {
  columns: Array<Record<string, unknown>>;
  corelogColumns: Array<Record<string, unknown>>;
  defaultCopyColumns: Array<Record<string, unknown>>;
  defaultCopyCorelogColumns: Array<Record<string, unknown>>;
  [key: string]: unknown;
};

export type LogReportFieldCodeRow = {
  group: "density" | "consistency" | "moisture";
  code: string;
  name: string;
  aliases: string[];
};

export type LogReportChartDefaultRow = {
  chartKey: string;
  columnCode: string;
  columnText: string;
  dataSourceGroup: string;
  dataSourceValue: string;
  config: Record<string, unknown>;
};

export type LogReportCatalog = {
  fieldCodes: LogReportFieldCodeRow[];
  chartDefaults: LogReportChartDefaultRow[];
};

export type LogTemplateBuilderBootstrap = {
  template: LogTemplateRecord;
  list: LogTemplateListPayload;
  builderConfiguration: LogTemplateBuilderConfiguration;
};

type ApiTemplate = {
  id: string | number;
  name: string;
  logType: LogTemplateLogType;
  isDefault: boolean;
  createdAt: string;
  updatedAt?: string;
  logConfigurationIds?: Array<string | number>;
  config: unknown;
  templateVersion?: number;
  sortOrder?: number;
};

function toRecord(raw: ApiTemplate): LogTemplateRecord {
  return {
    id: String(raw.id),
    name: raw.name,
    logType: raw.logType === "corelog" ? "corelog" : "borelog",
    isDefault: Boolean(raw.isDefault),
    createdAt: String(raw.createdAt ?? "").slice(0, 10),
    updatedAt: raw.updatedAt ? String(raw.updatedAt) : undefined,
    logConfigurationIds: Array.isArray(raw.logConfigurationIds)
      ? raw.logConfigurationIds.map(String)
      : [],
    templateVersion: raw.templateVersion ?? 2,
    config: normalizeLogTemplateConfig(raw.config),
  };
}

function toGroupedList(payload: unknown): LogTemplateListPayload {
  const root = (payload ?? {}) as Record<string, unknown>;
  const borelog = Array.isArray(root.borelog) ? root.borelog : [];
  const corelog = Array.isArray(root.corelog) ? root.corelog : [];
  return {
    borelog: borelog.map((entry) => toRecord(entry as ApiTemplate)),
    corelog: corelog.map((entry) => toRecord(entry as ApiTemplate)),
  };
}

/** Tablogs: GET /log-template/list — user-scoped templates. */
export async function listLogTemplates(
  ownerUserId?: number
): Promise<LogTemplateListPayload> {
  const res = await apiClient.get<ApiEnvelope<LogTemplateListPayload | { data?: unknown }>>(
    logReportTemplatesBasePath(ownerUserId),
    { params: { grouped: "true" } }
  );
  return toGroupedList(res.data.data);
}

/** Tablogs: GET /log-template/edit/:id */
export async function getLogTemplate(
  id: string,
  ownerUserId?: number
): Promise<LogTemplateRecord> {
  const res = await apiClient.get<ApiEnvelope<ApiTemplate>>(
    `${logReportTemplatesBasePath(ownerUserId)}/${encodeURIComponent(id)}`
  );
  return toRecord(res.data.data);
}

/** Tablogs: GET /log-template/builder-configuration */
export async function getBuilderConfiguration(): Promise<LogTemplateBuilderConfiguration> {
  const res = await apiClient.get<
    ApiEnvelope<{ data: LogTemplateBuilderConfiguration } | LogTemplateBuilderConfiguration>
  >(`${BASE}/builder-configuration`);
  const payload = res.data.data;
  if (payload && typeof payload === "object" && "data" in payload && payload.data) {
    return payload.data as LogTemplateBuilderConfiguration;
  }
  return payload as LogTemplateBuilderConfiguration;
}

/** Seeded consistency / moisture codes and DCP graph defaults. */
export async function getLogReportCatalog(): Promise<LogReportCatalog> {
  const res = await apiClient.get<ApiEnvelope<LogReportCatalog>>(`${BASE}/catalog`);
  const payload = res.data.data;
  return {
    fieldCodes: Array.isArray(payload?.fieldCodes) ? payload.fieldCodes : [],
    chartDefaults: Array.isArray(payload?.chartDefaults) ? payload.chartDefaults : [],
  };
}

/**
 * Open-builder bootstrap — mirrors Tablogs' three parallel calls:
 * list + builder-configuration + edit/:id
 */
export async function loadBuilderBootstrap(
  templateId: string,
  ownerUserId?: number
): Promise<LogTemplateBuilderBootstrap> {
  const [template, list, builderConfiguration] = await Promise.all([
    getLogTemplate(templateId, ownerUserId),
    listLogTemplates(ownerUserId),
    getBuilderConfiguration(),
  ]);
  return { template, list, builderConfiguration };
}

export async function updateLogTemplate(
  id: string,
  patch: Partial<
    Pick<LogTemplateRecord, "name" | "logType" | "isDefault" | "logConfigurationIds" | "config">
  >,
  ownerUserId?: number
): Promise<{ data: LogTemplateRecord; message: string }> {
  const res = await apiClient.patch<ApiEnvelope<ApiTemplate>>(
    `${logReportTemplatesBasePath(ownerUserId)}/${encodeURIComponent(id)}`,
    {
      ...(patch.name !== undefined ? { name: patch.name } : {}),
      ...(patch.logType !== undefined ? { logType: patch.logType } : {}),
      ...(patch.isDefault !== undefined ? { isDefault: patch.isDefault } : {}),
      ...(patch.logConfigurationIds !== undefined
        ? { logConfigurationIds: patch.logConfigurationIds }
        : {}),
      ...(patch.config !== undefined ? { config: patch.config } : {}),
    }
  );
  return {
    data: toRecord(res.data.data),
    message: extractApiMessage(res.data) || "Log template updated",
  };
}

export async function createLogTemplate(
  input: {
    name: string;
    logType: LogTemplateLogType;
    config?: LogTemplateConfig;
    isDefault?: boolean;
  },
  ownerUserId?: number
): Promise<{ data: LogTemplateRecord; message: string }> {
  const res = await apiClient.post<ApiEnvelope<ApiTemplate>>(
    logReportTemplatesBasePath(ownerUserId),
    {
      name: input.name.trim() || "New Template",
      logType: input.logType,
      isDefault: Boolean(input.isDefault),
      ...(input.config ? { config: input.config } : {}),
    }
  );
  return {
    data: toRecord(res.data.data),
    message: extractApiMessage(res.data) || "Log template created",
  };
}

export async function deleteLogTemplate(
  id: string,
  ownerUserId?: number
): Promise<{ message: string }> {
  const res = await apiClient.delete<ApiEnvelope<unknown>>(
    `${logReportTemplatesBasePath(ownerUserId)}/${encodeURIComponent(id)}`
  );
  return { message: extractApiMessage(res.data) || "Log template deleted" };
}

export async function reorderLogTemplates(
  orderedIds: string[],
  ownerUserId?: number
): Promise<void> {
  const numericIds = orderedIds
    .map((id) => Number(id))
    .filter((id) => Number.isInteger(id) && id > 0);
  if (numericIds.length === 0) return;
  await apiClient.post(`${logReportTemplatesBasePath(ownerUserId)}/reorder`, {
    orderedIds: numericIds,
  });
}

/** Local selection-list stand-in until a GeoLog selection-list endpoint exists. */
export function getBuilderSelectionGroups(): LogTemplateSelectionGroup[] {
  const seen = new Set<string>();
  const groups = selectionGroups as LogTemplateSelectionGroup[];
  return groups.filter((group) => {
    const code = String(group.code ?? "");
    if (!code || seen.has(code)) return false;
    seen.add(code);
    return true;
  });
}

export function getBuilderSoilGraphics(): LogTemplateSoilGraphic[] {
  return soilGraphics as LogTemplateSoilGraphic[];
}

export function getBuilderColumnCatalog(
  logType: LogTemplateLogType,
  builderConfiguration?: LogTemplateBuilderConfiguration | null
) {
  if (!builderConfiguration) return [];
  return logType === "corelog"
    ? builderConfiguration.corelogColumns ?? []
    : builderConfiguration.columns ?? [];
}

export function getDefaultCopyColumns(
  logType: LogTemplateLogType,
  builderConfiguration?: LogTemplateBuilderConfiguration | null
) {
  if (!builderConfiguration) return [];
  return logType === "corelog"
    ? builderConfiguration.defaultCopyCorelogColumns ?? []
    : builderConfiguration.defaultCopyColumns ?? [];
}

export function createBlankTemplateConfig(
  logType: LogTemplateLogType,
  builderConfiguration?: LogTemplateBuilderConfiguration | null
): LogTemplateConfig {
  const columns = getBuilderColumnCatalog(logType, builderConfiguration);
  if (!columns.length) return createDefaultLogTemplateConfig();
  return normalizeLogTemplateConfig({
    ...createDefaultLogTemplateConfig(),
    columnData: structuredClone(columns),
  });
}
