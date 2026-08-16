import apiClient from "@/shared/services/apiClient";
import { extractApiMessage } from "@/shared/utils/apiMessage";
import { DEFAULT_TABLE_PAGE_SIZE, MAX_TABLE_PAGE_SIZE } from "@/shared/constants/pagination";
import type { ApiEnvelope, DeleteResult, MutationResult } from "@/shared/types/api";
import type {
  LogWellCasingTop,
  LogWellCasingTopFormPayload,
  PaginatedLogWellCasingTops,
} from "../types/logWellCasingTop";

type ListLogWellCasingTopOptions = {
  search?: string;
  includeDeleted?: boolean;
  onlyDeleted?: boolean;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
};

function basePath(projectId: number, logId: number): string {
  return `/projects/${projectId}/logs/${logId}/well-casing-tops`;
}

export async function listLogWellCasingTops(
  projectId: number,
  logId: number,
  page = 1,
  limit = DEFAULT_TABLE_PAGE_SIZE,
  options: ListLogWellCasingTopOptions = {}
): Promise<PaginatedLogWellCasingTops> {
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

  const res = await apiClient.get<ApiEnvelope<PaginatedLogWellCasingTops>>(
    basePath(projectId, logId),
    { params }
  );
  return res.data.data;
}

export async function createLogWellCasingTop(
  projectId: number,
  logId: number,
  payload: LogWellCasingTopFormPayload
): Promise<MutationResult<LogWellCasingTop>> {
  const res = await apiClient.post<ApiEnvelope<LogWellCasingTop>>(
    basePath(projectId, logId),
    payload
  );
  return { data: res.data.data, message: extractApiMessage(res.data) };
}

export async function updateLogWellCasingTop(
  projectId: number,
  logId: number,
  id: string,
  payload: Partial<LogWellCasingTopFormPayload>
): Promise<MutationResult<LogWellCasingTop>> {
  const res = await apiClient.patch<ApiEnvelope<LogWellCasingTop>>(
    `${basePath(projectId, logId)}/${id}`,
    payload
  );
  return { data: res.data.data, message: extractApiMessage(res.data) };
}

export async function deleteLogWellCasingTop(
  projectId: number,
  logId: number,
  id: string
): Promise<DeleteResult> {
  const res = await apiClient.delete<ApiEnvelope<unknown>>(
    `${basePath(projectId, logId)}/${id}`
  );
  return { message: extractApiMessage(res.data) };
}

export async function restoreLogWellCasingTop(
  projectId: number,
  logId: number,
  id: string
): Promise<MutationResult<LogWellCasingTop>> {
  const res = await apiClient.post<ApiEnvelope<LogWellCasingTop>>(
    `${basePath(projectId, logId)}/${id}/restore`
  );
  return { data: res.data.data, message: extractApiMessage(res.data) };
}

export async function copyLogWellCasingTop(
  projectId: number,
  logId: number,
  id: string
): Promise<MutationResult<LogWellCasingTop>> {
  const res = await apiClient.post<ApiEnvelope<LogWellCasingTop>>(
    `${basePath(projectId, logId)}/${id}/copy`
  );
  return { data: res.data.data, message: extractApiMessage(res.data) };
}
