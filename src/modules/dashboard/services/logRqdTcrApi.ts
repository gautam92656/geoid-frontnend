import apiClient from "@/shared/services/apiClient";
import { extractApiMessage } from "@/shared/utils/apiMessage";
import { DEFAULT_TABLE_PAGE_SIZE, MAX_TABLE_PAGE_SIZE } from "@/shared/constants/pagination";
import type { ApiEnvelope, DeleteResult, MutationResult } from "@/shared/types/api";
import type {
  LogRqdTcr,
  LogRqdTcrFormPayload,
  PaginatedLogRqdTcrs,
} from "../types/logRqdTcr";

type ListLogRqdTcrOptions = {
  search?: string;
  includeDeleted?: boolean;
  onlyDeleted?: boolean;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
};

function basePath(projectId: number, logId: number): string {
  return `/projects/${projectId}/logs/${logId}/rqd-tcrs`;
}

export async function listLogRqdTcrs(
  projectId: number,
  logId: number,
  page = 1,
  limit = DEFAULT_TABLE_PAGE_SIZE,
  options: ListLogRqdTcrOptions = {}
): Promise<PaginatedLogRqdTcrs> {
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

  const res = await apiClient.get<ApiEnvelope<PaginatedLogRqdTcrs>>(
    basePath(projectId, logId),
    { params }
  );
  return res.data.data;
}

export async function createLogRqdTcr(
  projectId: number,
  logId: number,
  payload: LogRqdTcrFormPayload
): Promise<MutationResult<LogRqdTcr>> {
  const res = await apiClient.post<ApiEnvelope<LogRqdTcr>>(
    basePath(projectId, logId),
    payload
  );
  return { data: res.data.data, message: extractApiMessage(res.data) };
}

export async function updateLogRqdTcr(
  projectId: number,
  logId: number,
  id: string,
  payload: Partial<LogRqdTcrFormPayload>
): Promise<MutationResult<LogRqdTcr>> {
  const res = await apiClient.patch<ApiEnvelope<LogRqdTcr>>(
    `${basePath(projectId, logId)}/${id}`,
    payload
  );
  return { data: res.data.data, message: extractApiMessage(res.data) };
}

export async function deleteLogRqdTcr(
  projectId: number,
  logId: number,
  id: string
): Promise<DeleteResult> {
  const res = await apiClient.delete<ApiEnvelope<unknown>>(
    `${basePath(projectId, logId)}/${id}`
  );
  return { message: extractApiMessage(res.data) };
}

export async function restoreLogRqdTcr(
  projectId: number,
  logId: number,
  id: string
): Promise<MutationResult<LogRqdTcr>> {
  const res = await apiClient.post<ApiEnvelope<LogRqdTcr>>(
    `${basePath(projectId, logId)}/${id}/restore`
  );
  return { data: res.data.data, message: extractApiMessage(res.data) };
}

export async function copyLogRqdTcr(
  projectId: number,
  logId: number,
  id: string
): Promise<MutationResult<LogRqdTcr>> {
  const res = await apiClient.post<ApiEnvelope<LogRqdTcr>>(
    `${basePath(projectId, logId)}/${id}/copy`
  );
  return { data: res.data.data, message: extractApiMessage(res.data) };
}
