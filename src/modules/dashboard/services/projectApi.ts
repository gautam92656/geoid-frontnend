import apiClient, { ApiError } from "@/shared/services/apiClient";
import { extractApiMessage } from "@/shared/utils/apiMessage";
import { DEFAULT_TABLE_PAGE_SIZE, MAX_TABLE_PAGE_SIZE } from "@/shared/constants/pagination";
import type { ApiEnvelope, DeleteResult, MutationResult } from "@/shared/types/api";
import type { PaginatedProjects, Project, ProjectFormState, ProjectPayload } from "../types/project";
import { projectStatusToApiValue } from "../utils/projectFormUtils";
import type { ProjectListScope } from "../data/projectOptions";

export async function listProjects(
  page = 1,
  limit = DEFAULT_TABLE_PAGE_SIZE,
  search?: string,
  status?: string,
  sortBy?: string,
  sortOrder: "asc" | "desc" = "desc",
  listScope: ProjectListScope = "active"
): Promise<PaginatedProjects> {
  const params: Record<string, string | number> = {
    page,
    limit: Math.min(limit, MAX_TABLE_PAGE_SIZE),
    sortOrder,
    listScope,
  };
  const trimmedSearch = search?.trim();
  if (trimmedSearch) params.search = trimmedSearch;
  if (status?.trim()) params.status = status.trim();
  if (sortBy?.trim()) params.sortBy = sortBy.trim();

  const res = await apiClient.get<ApiEnvelope<PaginatedProjects>>("/projects", { params });
  return res.data.data;
}

export async function getProject(id: number): Promise<Project> {
  const res = await apiClient.get<ApiEnvelope<Project>>(`/projects/${id}`);
  return res.data.data;
}

export async function getProjectByProjectNo(projectNo: string): Promise<Project> {
  const trimmed = projectNo.trim();
  if (!trimmed) {
    throw new ApiError("Project not found", 404);
  }

  const res = await apiClient.get<ApiEnvelope<Project>>(
    `/projects/by-number/${encodeURIComponent(trimmed)}`
  );
  return res.data.data;
}

export async function resolveProject(projectIdParam: string): Promise<Project> {
  const trimmed = decodeURIComponent(projectIdParam).trim();
  if (!trimmed) {
    throw new ApiError("Project not found", 404);
  }

  const numericId = Number(trimmed);
  const isNumericId =
    Number.isInteger(numericId) && numericId >= 1 && String(numericId) === trimmed;

  if (isNumericId) {
    try {
      return await getProject(numericId);
    } catch (err) {
      // Numeric path may be a project number rather than a DB id (legacy links).
      if (!(err instanceof ApiError && err.status === 404)) {
        throw err;
      }
    }
  }

  try {
    return await getProjectByProjectNo(trimmed);
  } catch (err) {
    if (isNumericId && err instanceof ApiError && err.status === 404) {
      throw new ApiError("Project not found", 404);
    }
    throw err;
  }
}

export async function createProject(payload: ProjectPayload): Promise<MutationResult<Project>> {
  const res = await apiClient.post<ApiEnvelope<Project>>("/projects", payload);
  return { data: res.data.data, message: extractApiMessage(res.data) };
}

export async function copyProject(id: number): Promise<MutationResult<Project>> {
  const res = await apiClient.post<ApiEnvelope<Project>>(`/projects/${id}/copy`);
  return { data: res.data.data, message: extractApiMessage(res.data) };
}

export async function updateProject(
  id: number,
  payload: Partial<ProjectPayload>
): Promise<MutationResult<Project>> {
  const res = await apiClient.patch<ApiEnvelope<Project>>(`/projects/${id}`, payload);
  return { data: res.data.data, message: extractApiMessage(res.data) };
}

export async function deleteProject(id: number): Promise<DeleteResult> {
  const res = await apiClient.delete<ApiEnvelope<unknown>>(`/projects/${id}`);
  return { message: extractApiMessage(res.data) };
}

export async function archiveProject(id: number): Promise<DeleteResult> {
  const res = await apiClient.post<ApiEnvelope<unknown>>(`/projects/${id}/archive`);
  return { message: extractApiMessage(res.data) };
}

export async function unarchiveProject(id: number): Promise<DeleteResult> {
  const res = await apiClient.post<ApiEnvelope<unknown>>(`/projects/${id}/unarchive`);
  return { message: extractApiMessage(res.data) };
}

export function formToProjectPayload(form: ProjectFormState): ProjectPayload {
  const clientId = Number(form.client.trim());

  return {
    projectNo: form.projectNo.trim(),
    name: form.projectName.trim(),
    address: form.projectAddress.trim(),
    status: projectStatusToApiValue(form.projectStatus),
    logConfigId: form.logConfigId.trim(),
    clientId,
    office: form.office.trim() || undefined,
    startDate: form.startDate || undefined,
    endDate: form.endDate || undefined,
    coordinateSystem: form.coordinateSystem.trim() || undefined,
    latitude: form.latitude.trim(),
    longitude: form.longitude.trim(),
    easting: form.easting.trim() || undefined,
    northing: form.northing.trim() || undefined,
    utmZone: form.utmZone.trim() || undefined,
  };
}
