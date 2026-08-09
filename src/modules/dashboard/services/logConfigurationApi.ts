import apiClient from "@/shared/services/apiClient";
import { extractApiMessage } from "@/shared/utils/apiMessage";
import { DEFAULT_TABLE_PAGE_SIZE, MAX_TABLE_PAGE_SIZE } from "@/shared/constants/pagination";
import type { ApiEnvelope, MutationResult } from "@/shared/types/api";
import type {
  LogConfiguration,
  LogConfigurationFormState,
  LogConfigurationStatus,
  PaginatedLogConfigurations,
} from "../types/logConfiguration";
import type {
  LogConfigurationTemplateDiscipline,
  LogConfigurationTemplateRegion,
  PaginatedLogConfigurationTemplates,
} from "../data/logConfigurationTemplates";

type ListLogConfigurationsOptions = {
  search?: string;
  status?: LogConfigurationStatus;
  includeDeleted?: boolean;
  ownerUserId?: number;
};

type CreateLogConfigurationPayload = {
  name: string;
  status?: LogConfigurationStatus;
  templateSlug?: string;
};

type UpdateLogConfigurationPayload = Partial<
  Pick<LogConfigurationFormState, "name" | "status" | "enabledModules" | "moduleSettings"> &
    Omit<
      LogConfigurationFormState,
      | "name"
      | "status"
      | "projectDetailFields"
      | "logDetailFields"
      | "enabledModules"
      | "moduleSettings"
    >
> & {
  projectDetailFields?: Pick<LogConfigurationFormState["projectDetailFields"], "enabled">;
  logDetailFields?: Pick<LogConfigurationFormState["logDetailFields"], "enabled">;
};

export type LogConfigurationFieldOptionsGroup = "project-detail" | "log-detail";

function logConfigurationsBasePath(ownerUserId?: number): string {
  return ownerUserId != null
    ? `/admin/users/${ownerUserId}/log-configurations`
    : "/log-configurations";
}

export async function replaceLogConfigurationFieldOptions(
  configurationId: string,
  fieldGroup: LogConfigurationFieldOptionsGroup,
  fieldKey: string,
  options: string[],
  ownerUserId?: number
): Promise<MutationResult<{ options: string[] }>> {
  const res = await apiClient.put<ApiEnvelope<{ options: string[] }>>(
    `${logConfigurationsBasePath(ownerUserId)}/${configurationId}/field-options/${fieldGroup}/${fieldKey}`,
    { options }
  );
  return { data: res.data.data, message: extractApiMessage(res.data) };
}

export async function listLogConfigurations(
  page = 1,
  limit = DEFAULT_TABLE_PAGE_SIZE,
  options: ListLogConfigurationsOptions = {}
): Promise<PaginatedLogConfigurations> {
  const params: Record<string, string | number> = {
    page,
    limit: Math.min(limit, MAX_TABLE_PAGE_SIZE),
    sortOrder: "asc",
  };
  const trimmedSearch = options.search?.trim();
  if (trimmedSearch) params.search = trimmedSearch;
  if (options.status) params.status = options.status;
  if (options.includeDeleted) params.includeDeleted = "true";

  const res = await apiClient.get<ApiEnvelope<PaginatedLogConfigurations>>(
    logConfigurationsBasePath(options.ownerUserId),
    { params }
  );
  return res.data.data;
}

export async function createLogConfiguration(
  payload: CreateLogConfigurationPayload,
  ownerUserId?: number
): Promise<MutationResult<LogConfiguration>> {
  const res = await apiClient.post<ApiEnvelope<LogConfiguration>>(
    logConfigurationsBasePath(ownerUserId),
    {
      name: payload.name.trim(),
      ...(payload.status ? { status: payload.status } : {}),
      ...(payload.templateSlug ? { templateSlug: payload.templateSlug } : {}),
    }
  );
  return { data: res.data.data, message: extractApiMessage(res.data) };
}

export async function updateLogConfiguration(
  id: string,
  payload: UpdateLogConfigurationPayload,
  ownerUserId?: number
): Promise<MutationResult<LogConfiguration>> {
  const res = await apiClient.patch<ApiEnvelope<LogConfiguration>>(
    `${logConfigurationsBasePath(ownerUserId)}/${id}`,
    payload
  );
  return { data: res.data.data, message: extractApiMessage(res.data) };
}

export async function deleteLogConfiguration(
  id: string,
  ownerUserId?: number
): Promise<{ message: string }> {
  const res = await apiClient.delete<ApiEnvelope<unknown>>(
    `${logConfigurationsBasePath(ownerUserId)}/${id}`
  );
  return { message: extractApiMessage(res.data) ?? "Log configuration removed." };
}

export async function getLogConfiguration(
  id: string,
  ownerUserId?: number
): Promise<LogConfiguration> {
  const res = await apiClient.get<ApiEnvelope<LogConfiguration>>(
    `${logConfigurationsBasePath(ownerUserId)}/${id}`
  );
  return res.data.data;
}

type ListLogConfigurationTemplatesOptions = {
  search?: string;
  region?: LogConfigurationTemplateRegion;
  discipline?: LogConfigurationTemplateDiscipline;
  availableOnly?: boolean;
};

export async function listLogConfigurationTemplates(
  page = 1,
  limit = MAX_TABLE_PAGE_SIZE,
  options: ListLogConfigurationTemplatesOptions = {}
): Promise<PaginatedLogConfigurationTemplates> {
  const params: Record<string, string | number> = {
    page,
    limit: Math.min(limit, MAX_TABLE_PAGE_SIZE),
    sortOrder: "asc",
    availableOnly: options.availableOnly === false ? "false" : "true",
  };
  const trimmedSearch = options.search?.trim();
  if (trimmedSearch) params.search = trimmedSearch;
  if (options.region) params.region = options.region;
  if (options.discipline) params.discipline = options.discipline;

  const res = await apiClient.get<ApiEnvelope<PaginatedLogConfigurationTemplates>>(
    "/log-configuration-templates",
    { params }
  );
  return res.data.data;
}
