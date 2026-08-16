import apiClient from "@/shared/services/apiClient";
import { extractApiMessage } from "@/shared/utils/apiMessage";
import { DEFAULT_TABLE_PAGE_SIZE, MAX_TABLE_PAGE_SIZE } from "@/shared/constants/pagination";
import type { ApiEnvelope, DeleteResult, MutationResult } from "@/shared/types/api";
import type {
  LogWaterObservation,
  LogWaterObservationPayload,
  PaginatedLogWaterObservations,
} from "../types/logWaterObservation";

type ListLogWaterObservationOptions = {
  search?: string;
  includeDeleted?: boolean;
  onlyDeleted?: boolean;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
};

function basePath(projectId: number, logId: number): string {
  return `/projects/${projectId}/logs/${logId}/water-observations`;
}

export async function listLogWaterObservations(
  projectId: number,
  logId: number,
  page = 1,
  limit = DEFAULT_TABLE_PAGE_SIZE,
  options: ListLogWaterObservationOptions = {}
): Promise<PaginatedLogWaterObservations> {
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

  const res = await apiClient.get<ApiEnvelope<PaginatedLogWaterObservations>>(
    basePath(projectId, logId),
    { params }
  );
  return res.data.data;
}

export async function createLogWaterObservation(
  projectId: number,
  logId: number,
  payload: LogWaterObservationPayload
): Promise<MutationResult<LogWaterObservation>> {
  const res = await apiClient.post<ApiEnvelope<LogWaterObservation>>(
    basePath(projectId, logId),
    payload
  );
  return { data: res.data.data, message: extractApiMessage(res.data) };
}

export async function updateLogWaterObservation(
  projectId: number,
  logId: number,
  id: string,
  payload: Partial<LogWaterObservationPayload>
): Promise<MutationResult<LogWaterObservation>> {
  const res = await apiClient.patch<ApiEnvelope<LogWaterObservation>>(
    `${basePath(projectId, logId)}/${id}`,
    payload
  );
  return { data: res.data.data, message: extractApiMessage(res.data) };
}

export async function deleteLogWaterObservation(
  projectId: number,
  logId: number,
  id: string
): Promise<DeleteResult> {
  const res = await apiClient.delete<ApiEnvelope<unknown>>(
    `${basePath(projectId, logId)}/${id}`
  );
  return { message: extractApiMessage(res.data) };
}

export async function restoreLogWaterObservation(
  projectId: number,
  logId: number,
  id: string
): Promise<MutationResult<LogWaterObservation>> {
  const res = await apiClient.post<ApiEnvelope<LogWaterObservation>>(
    `${basePath(projectId, logId)}/${id}/restore`
  );
  return { data: res.data.data, message: extractApiMessage(res.data) };
}

export async function copyLogWaterObservation(
  projectId: number,
  logId: number,
  id: string
): Promise<MutationResult<LogWaterObservation>> {
  const res = await apiClient.post<ApiEnvelope<LogWaterObservation>>(
    `${basePath(projectId, logId)}/${id}/copy`
  );
  return { data: res.data.data, message: extractApiMessage(res.data) };
}
