import apiClient from "@/shared/services/apiClient";
import { extractApiMessage } from "@/shared/utils/apiMessage";
import { DEFAULT_TABLE_PAGE_SIZE, MAX_TABLE_PAGE_SIZE } from "@/shared/constants/pagination";
import type { ApiEnvelope, DeleteResult, MutationResult } from "@/shared/types/api";
import type {
  LogInsituTest,
  LogInsituTestPayload,
  PaginatedLogInsituTests,
} from "../types/logInsituTest";

type ListInsituTestOptions = {
  search?: string;
  includeDeleted?: boolean;
  onlyDeleted?: boolean;
  sampleId?: string | number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
};

function basePath(projectId: number, logId: number): string {
  return `/projects/${projectId}/logs/${logId}/insitu-tests`;
}

export async function listLogInsituTests(
  projectId: number,
  logId: number,
  page = 1,
  limit = DEFAULT_TABLE_PAGE_SIZE,
  options: ListInsituTestOptions = {}
): Promise<PaginatedLogInsituTests> {
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
  if (options.sampleId != null && String(options.sampleId).trim()) {
    params.sampleId = String(options.sampleId).trim();
  }

  const res = await apiClient.get<ApiEnvelope<PaginatedLogInsituTests>>(
    basePath(projectId, logId),
    { params }
  );
  return res.data.data;
}

export async function createLogInsituTest(
  projectId: number,
  logId: number,
  payload: LogInsituTestPayload
): Promise<MutationResult<LogInsituTest>> {
  const res = await apiClient.post<ApiEnvelope<LogInsituTest>>(
    basePath(projectId, logId),
    payload
  );
  return { data: res.data.data, message: extractApiMessage(res.data) };
}

export async function updateLogInsituTest(
  projectId: number,
  logId: number,
  id: string,
  payload: Partial<LogInsituTestPayload>
): Promise<MutationResult<LogInsituTest>> {
  const res = await apiClient.patch<ApiEnvelope<LogInsituTest>>(
    `${basePath(projectId, logId)}/${id}`,
    payload
  );
  return { data: res.data.data, message: extractApiMessage(res.data) };
}

export async function deleteLogInsituTest(
  projectId: number,
  logId: number,
  id: string
): Promise<DeleteResult> {
  const res = await apiClient.delete<ApiEnvelope<unknown>>(
    `${basePath(projectId, logId)}/${id}`
  );
  return { message: extractApiMessage(res.data) };
}

export async function restoreLogInsituTest(
  projectId: number,
  logId: number,
  id: string
): Promise<MutationResult<LogInsituTest>> {
  const res = await apiClient.post<ApiEnvelope<LogInsituTest>>(
    `${basePath(projectId, logId)}/${id}/restore`
  );
  return { data: res.data.data, message: extractApiMessage(res.data) };
}

export async function copyLogInsituTest(
  projectId: number,
  logId: number,
  id: string
): Promise<MutationResult<LogInsituTest>> {
  const res = await apiClient.post<ApiEnvelope<LogInsituTest>>(
    `${basePath(projectId, logId)}/${id}/copy`
  );
  return { data: res.data.data, message: extractApiMessage(res.data) };
}
