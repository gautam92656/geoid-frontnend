import apiClient from "@/shared/services/apiClient";
import { extractApiMessage } from "@/shared/utils/apiMessage";
import { DEFAULT_TABLE_PAGE_SIZE, MAX_TABLE_PAGE_SIZE } from "@/shared/constants/pagination";
import type { ApiEnvelope, DeleteResult, MutationResult } from "@/shared/types/api";
import type {
  LogWellProbe,
  LogWellProbeFormPayload,
  PaginatedLogWellProbes,
} from "../types/logWellProbe";

type ListLogWellProbeOptions = {
  search?: string;
  includeDeleted?: boolean;
  onlyDeleted?: boolean;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
};

function basePath(projectId: number, logId: number): string {
  return `/projects/${projectId}/logs/${logId}/well-probes`;
}

export async function listLogWellProbes(
  projectId: number,
  logId: number,
  page = 1,
  limit = DEFAULT_TABLE_PAGE_SIZE,
  options: ListLogWellProbeOptions = {}
): Promise<PaginatedLogWellProbes> {
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

  const res = await apiClient.get<ApiEnvelope<PaginatedLogWellProbes>>(
    basePath(projectId, logId),
    { params }
  );
  return res.data.data;
}

export async function createLogWellProbe(
  projectId: number,
  logId: number,
  payload: LogWellProbeFormPayload
): Promise<MutationResult<LogWellProbe>> {
  const res = await apiClient.post<ApiEnvelope<LogWellProbe>>(
    basePath(projectId, logId),
    payload
  );
  return { data: res.data.data, message: extractApiMessage(res.data) };
}

export async function updateLogWellProbe(
  projectId: number,
  logId: number,
  id: string,
  payload: Partial<LogWellProbeFormPayload>
): Promise<MutationResult<LogWellProbe>> {
  const res = await apiClient.patch<ApiEnvelope<LogWellProbe>>(
    `${basePath(projectId, logId)}/${id}`,
    payload
  );
  return { data: res.data.data, message: extractApiMessage(res.data) };
}

export async function deleteLogWellProbe(
  projectId: number,
  logId: number,
  id: string
): Promise<DeleteResult> {
  const res = await apiClient.delete<ApiEnvelope<unknown>>(
    `${basePath(projectId, logId)}/${id}`
  );
  return { message: extractApiMessage(res.data) };
}

export async function restoreLogWellProbe(
  projectId: number,
  logId: number,
  id: string
): Promise<MutationResult<LogWellProbe>> {
  const res = await apiClient.post<ApiEnvelope<LogWellProbe>>(
    `${basePath(projectId, logId)}/${id}/restore`
  );
  return { data: res.data.data, message: extractApiMessage(res.data) };
}

export async function copyLogWellProbe(
  projectId: number,
  logId: number,
  id: string
): Promise<MutationResult<LogWellProbe>> {
  const res = await apiClient.post<ApiEnvelope<LogWellProbe>>(
    `${basePath(projectId, logId)}/${id}/copy`
  );
  return { data: res.data.data, message: extractApiMessage(res.data) };
}
