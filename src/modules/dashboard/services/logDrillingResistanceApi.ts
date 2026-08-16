import apiClient from "@/shared/services/apiClient";
import { extractApiMessage } from "@/shared/utils/apiMessage";
import { DEFAULT_TABLE_PAGE_SIZE, MAX_TABLE_PAGE_SIZE } from "@/shared/constants/pagination";
import type { ApiEnvelope, DeleteResult, MutationResult } from "@/shared/types/api";
import type {
  LogDrillingResistance,
  LogDrillingResistanceFormPayload,
  PaginatedLogDrillingResistances,
} from "../types/logDrillingResistance";

type ListLogDrillingResistanceOptions = {
  search?: string;
  includeDeleted?: boolean;
  onlyDeleted?: boolean;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
};

function basePath(projectId: number, logId: number): string {
  return `/projects/${projectId}/logs/${logId}/drilling-resistances`;
}

export async function listLogDrillingResistances(
  projectId: number,
  logId: number,
  page = 1,
  limit = DEFAULT_TABLE_PAGE_SIZE,
  options: ListLogDrillingResistanceOptions = {}
): Promise<PaginatedLogDrillingResistances> {
  const params: Record<string, string | number> = {
    page,
    limit: Math.min(limit, MAX_TABLE_PAGE_SIZE),
    sortBy: options.sortBy ?? "sortOrder",
    sortOrder: options.sortOrder ?? "asc",
  };
  const trimmedSearch = options.search?.trim();
  if (trimmedSearch) params.search = trimmedSearch;
  if (options.includeDeleted) params.includeDeleted = "true";
  if (options.onlyDeleted) params.onlyDeleted = "true";

  const res = await apiClient.get<ApiEnvelope<PaginatedLogDrillingResistances>>(
    basePath(projectId, logId),
    { params }
  );
  return res.data.data;
}

export async function createLogDrillingResistance(
  projectId: number,
  logId: number,
  payload: LogDrillingResistanceFormPayload
): Promise<MutationResult<LogDrillingResistance>> {
  const res = await apiClient.post<ApiEnvelope<LogDrillingResistance>>(
    basePath(projectId, logId),
    payload
  );
  return { data: res.data.data, message: extractApiMessage(res.data) };
}

export async function updateLogDrillingResistance(
  projectId: number,
  logId: number,
  id: string,
  payload: Partial<LogDrillingResistanceFormPayload>
): Promise<MutationResult<LogDrillingResistance>> {
  const res = await apiClient.patch<ApiEnvelope<LogDrillingResistance>>(
    `${basePath(projectId, logId)}/${id}`,
    payload
  );
  return { data: res.data.data, message: extractApiMessage(res.data) };
}

export async function deleteLogDrillingResistance(
  projectId: number,
  logId: number,
  id: string
): Promise<DeleteResult> {
  const res = await apiClient.delete<ApiEnvelope<unknown>>(
    `${basePath(projectId, logId)}/${id}`
  );
  return { message: extractApiMessage(res.data) };
}

export async function restoreLogDrillingResistance(
  projectId: number,
  logId: number,
  id: string
): Promise<MutationResult<LogDrillingResistance>> {
  const res = await apiClient.post<ApiEnvelope<LogDrillingResistance>>(
    `${basePath(projectId, logId)}/${id}/restore`
  );
  return { data: res.data.data, message: extractApiMessage(res.data) };
}

export async function copyLogDrillingResistance(
  projectId: number,
  logId: number,
  id: string
): Promise<MutationResult<LogDrillingResistance>> {
  const res = await apiClient.post<ApiEnvelope<LogDrillingResistance>>(
    `${basePath(projectId, logId)}/${id}/copy`
  );
  return { data: res.data.data, message: extractApiMessage(res.data) };
}
