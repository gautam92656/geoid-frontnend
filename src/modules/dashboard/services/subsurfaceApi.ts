import apiClient from "@/shared/services/apiClient";
import { extractApiMessage } from "@/shared/utils/apiMessage";
import { DEFAULT_TABLE_PAGE_SIZE, MAX_TABLE_PAGE_SIZE } from "@/shared/constants/pagination";
import type { ApiEnvelope, DeleteResult, MutationResult } from "@/shared/types/api";
import type {
  PaginatedSubsurfaceLayers,
  SubsurfaceLayer,
  SubsurfaceLayerPayload,
} from "../types/subsurfaceLayer";

type ListSubsurfaceOptions = {
  search?: string;
  includeDeleted?: boolean;
  onlyDeleted?: boolean;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
};

function basePath(projectId: number, logId: number): string {
  return `/projects/${projectId}/logs/${logId}/subsurfaces`;
}

export async function listLogSubsurfaces(
  projectId: number,
  logId: number,
  page = 1,
  limit = DEFAULT_TABLE_PAGE_SIZE,
  options: ListSubsurfaceOptions = {}
): Promise<PaginatedSubsurfaceLayers> {
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

  const res = await apiClient.get<ApiEnvelope<PaginatedSubsurfaceLayers>>(
    basePath(projectId, logId),
    { params }
  );
  return res.data.data;
}

export async function createLogSubsurface(
  projectId: number,
  logId: number,
  payload: SubsurfaceLayerPayload
): Promise<MutationResult<SubsurfaceLayer>> {
  const res = await apiClient.post<ApiEnvelope<SubsurfaceLayer>>(
    basePath(projectId, logId),
    payload
  );
  return { data: res.data.data, message: extractApiMessage(res.data) };
}

export async function updateLogSubsurface(
  projectId: number,
  logId: number,
  id: string,
  payload: Partial<SubsurfaceLayerPayload>
): Promise<MutationResult<SubsurfaceLayer>> {
  const res = await apiClient.patch<ApiEnvelope<SubsurfaceLayer>>(
    `${basePath(projectId, logId)}/${id}`,
    payload
  );
  return { data: res.data.data, message: extractApiMessage(res.data) };
}

export async function deleteLogSubsurface(
  projectId: number,
  logId: number,
  id: string
): Promise<DeleteResult> {
  const res = await apiClient.delete<ApiEnvelope<unknown>>(
    `${basePath(projectId, logId)}/${id}`
  );
  return { message: extractApiMessage(res.data) };
}

export async function restoreLogSubsurface(
  projectId: number,
  logId: number,
  id: string
): Promise<MutationResult<SubsurfaceLayer>> {
  const res = await apiClient.post<ApiEnvelope<SubsurfaceLayer>>(
    `${basePath(projectId, logId)}/${id}/restore`
  );
  return { data: res.data.data, message: extractApiMessage(res.data) };
}

export async function copyLogSubsurface(
  projectId: number,
  logId: number,
  id: string
): Promise<MutationResult<SubsurfaceLayer>> {
  const res = await apiClient.post<ApiEnvelope<SubsurfaceLayer>>(
    `${basePath(projectId, logId)}/${id}/copy`
  );
  return { data: res.data.data, message: extractApiMessage(res.data) };
}
