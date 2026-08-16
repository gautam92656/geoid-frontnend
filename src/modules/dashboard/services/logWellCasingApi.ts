import apiClient from "@/shared/services/apiClient";
import { extractApiMessage } from "@/shared/utils/apiMessage";
import { DEFAULT_TABLE_PAGE_SIZE, MAX_TABLE_PAGE_SIZE } from "@/shared/constants/pagination";
import type { ApiEnvelope, DeleteResult, MutationResult } from "@/shared/types/api";
import type {
  LogWellCasing,
  LogWellCasingFormPayload,
  PaginatedLogWellCasings,
} from "../types/logWellCasing";

type ListLogWellCasingOptions = {
  search?: string;
  includeDeleted?: boolean;
  onlyDeleted?: boolean;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
};

function basePath(projectId: number, logId: number): string {
  return `/projects/${projectId}/logs/${logId}/well-casings`;
}

export async function listLogWellCasings(
  projectId: number,
  logId: number,
  page = 1,
  limit = DEFAULT_TABLE_PAGE_SIZE,
  options: ListLogWellCasingOptions = {}
): Promise<PaginatedLogWellCasings> {
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

  const res = await apiClient.get<ApiEnvelope<PaginatedLogWellCasings>>(
    basePath(projectId, logId),
    { params }
  );
  return res.data.data;
}

export async function createLogWellCasing(
  projectId: number,
  logId: number,
  payload: LogWellCasingFormPayload
): Promise<MutationResult<LogWellCasing>> {
  const res = await apiClient.post<ApiEnvelope<LogWellCasing>>(
    basePath(projectId, logId),
    payload
  );
  return { data: res.data.data, message: extractApiMessage(res.data) };
}

export async function updateLogWellCasing(
  projectId: number,
  logId: number,
  id: string,
  payload: Partial<LogWellCasingFormPayload>
): Promise<MutationResult<LogWellCasing>> {
  const res = await apiClient.patch<ApiEnvelope<LogWellCasing>>(
    `${basePath(projectId, logId)}/${id}`,
    payload
  );
  return { data: res.data.data, message: extractApiMessage(res.data) };
}

export async function deleteLogWellCasing(
  projectId: number,
  logId: number,
  id: string
): Promise<DeleteResult> {
  const res = await apiClient.delete<ApiEnvelope<unknown>>(
    `${basePath(projectId, logId)}/${id}`
  );
  return { message: extractApiMessage(res.data) };
}

export async function restoreLogWellCasing(
  projectId: number,
  logId: number,
  id: string
): Promise<MutationResult<LogWellCasing>> {
  const res = await apiClient.post<ApiEnvelope<LogWellCasing>>(
    `${basePath(projectId, logId)}/${id}/restore`
  );
  return { data: res.data.data, message: extractApiMessage(res.data) };
}

export async function copyLogWellCasing(
  projectId: number,
  logId: number,
  id: string
): Promise<MutationResult<LogWellCasing>> {
  const res = await apiClient.post<ApiEnvelope<LogWellCasing>>(
    `${basePath(projectId, logId)}/${id}/copy`
  );
  return { data: res.data.data, message: extractApiMessage(res.data) };
}
