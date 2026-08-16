import apiClient from "@/shared/services/apiClient";
import { extractApiMessage } from "@/shared/utils/apiMessage";
import { DEFAULT_TABLE_PAGE_SIZE, MAX_TABLE_PAGE_SIZE } from "@/shared/constants/pagination";
import type { ApiEnvelope, DeleteResult, MutationResult } from "@/shared/types/api";
import type {
  LogWellBackfill,
  LogWellBackfillFormPayload,
  PaginatedLogWellBackfills,
} from "../types/logWellBackfill";

type ListLogWellBackfillOptions = {
  search?: string;
  includeDeleted?: boolean;
  onlyDeleted?: boolean;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
};

function basePath(projectId: number, logId: number): string {
  return `/projects/${projectId}/logs/${logId}/well-backfills`;
}

export async function listLogWellBackfills(
  projectId: number,
  logId: number,
  page = 1,
  limit = DEFAULT_TABLE_PAGE_SIZE,
  options: ListLogWellBackfillOptions = {}
): Promise<PaginatedLogWellBackfills> {
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

  const res = await apiClient.get<ApiEnvelope<PaginatedLogWellBackfills>>(
    basePath(projectId, logId),
    { params }
  );
  return res.data.data;
}

export async function createLogWellBackfill(
  projectId: number,
  logId: number,
  payload: LogWellBackfillFormPayload
): Promise<MutationResult<LogWellBackfill>> {
  const res = await apiClient.post<ApiEnvelope<LogWellBackfill>>(
    basePath(projectId, logId),
    payload
  );
  return { data: res.data.data, message: extractApiMessage(res.data) };
}

export async function updateLogWellBackfill(
  projectId: number,
  logId: number,
  id: string,
  payload: Partial<LogWellBackfillFormPayload>
): Promise<MutationResult<LogWellBackfill>> {
  const res = await apiClient.patch<ApiEnvelope<LogWellBackfill>>(
    `${basePath(projectId, logId)}/${id}`,
    payload
  );
  return { data: res.data.data, message: extractApiMessage(res.data) };
}

export async function deleteLogWellBackfill(
  projectId: number,
  logId: number,
  id: string
): Promise<DeleteResult> {
  const res = await apiClient.delete<ApiEnvelope<unknown>>(
    `${basePath(projectId, logId)}/${id}`
  );
  return { message: extractApiMessage(res.data) };
}

export async function restoreLogWellBackfill(
  projectId: number,
  logId: number,
  id: string
): Promise<MutationResult<LogWellBackfill>> {
  const res = await apiClient.post<ApiEnvelope<LogWellBackfill>>(
    `${basePath(projectId, logId)}/${id}/restore`
  );
  return { data: res.data.data, message: extractApiMessage(res.data) };
}

export async function copyLogWellBackfill(
  projectId: number,
  logId: number,
  id: string
): Promise<MutationResult<LogWellBackfill>> {
  const res = await apiClient.post<ApiEnvelope<LogWellBackfill>>(
    `${basePath(projectId, logId)}/${id}/copy`
  );
  return { data: res.data.data, message: extractApiMessage(res.data) };
}
