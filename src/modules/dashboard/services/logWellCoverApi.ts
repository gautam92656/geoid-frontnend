import apiClient from "@/shared/services/apiClient";
import { extractApiMessage } from "@/shared/utils/apiMessage";
import { DEFAULT_TABLE_PAGE_SIZE, MAX_TABLE_PAGE_SIZE } from "@/shared/constants/pagination";
import type { ApiEnvelope, DeleteResult, MutationResult } from "@/shared/types/api";
import type {
  LogWellCover,
  LogWellCoverFormPayload,
  PaginatedLogWellCovers,
} from "../types/logWellCover";

type ListLogWellCoverOptions = {
  search?: string;
  includeDeleted?: boolean;
  onlyDeleted?: boolean;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
};

function basePath(projectId: number, logId: number): string {
  return `/projects/${projectId}/logs/${logId}/well-covers`;
}

export async function listLogWellCovers(
  projectId: number,
  logId: number,
  page = 1,
  limit = DEFAULT_TABLE_PAGE_SIZE,
  options: ListLogWellCoverOptions = {}
): Promise<PaginatedLogWellCovers> {
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

  const res = await apiClient.get<ApiEnvelope<PaginatedLogWellCovers>>(
    basePath(projectId, logId),
    { params }
  );
  return res.data.data;
}

export async function createLogWellCover(
  projectId: number,
  logId: number,
  payload: LogWellCoverFormPayload
): Promise<MutationResult<LogWellCover>> {
  const res = await apiClient.post<ApiEnvelope<LogWellCover>>(
    basePath(projectId, logId),
    payload
  );
  return { data: res.data.data, message: extractApiMessage(res.data) };
}

export async function updateLogWellCover(
  projectId: number,
  logId: number,
  id: string,
  payload: Partial<LogWellCoverFormPayload>
): Promise<MutationResult<LogWellCover>> {
  const res = await apiClient.patch<ApiEnvelope<LogWellCover>>(
    `${basePath(projectId, logId)}/${id}`,
    payload
  );
  return { data: res.data.data, message: extractApiMessage(res.data) };
}

export async function deleteLogWellCover(
  projectId: number,
  logId: number,
  id: string
): Promise<DeleteResult> {
  const res = await apiClient.delete<ApiEnvelope<unknown>>(
    `${basePath(projectId, logId)}/${id}`
  );
  return { message: extractApiMessage(res.data) };
}

export async function restoreLogWellCover(
  projectId: number,
  logId: number,
  id: string
): Promise<MutationResult<LogWellCover>> {
  const res = await apiClient.post<ApiEnvelope<LogWellCover>>(
    `${basePath(projectId, logId)}/${id}/restore`
  );
  return { data: res.data.data, message: extractApiMessage(res.data) };
}

export async function copyLogWellCover(
  projectId: number,
  logId: number,
  id: string
): Promise<MutationResult<LogWellCover>> {
  const res = await apiClient.post<ApiEnvelope<LogWellCover>>(
    `${basePath(projectId, logId)}/${id}/copy`
  );
  return { data: res.data.data, message: extractApiMessage(res.data) };
}
