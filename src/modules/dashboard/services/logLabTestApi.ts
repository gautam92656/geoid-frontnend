import apiClient from "@/shared/services/apiClient";
import { extractApiMessage } from "@/shared/utils/apiMessage";
import { DEFAULT_TABLE_PAGE_SIZE, MAX_TABLE_PAGE_SIZE } from "@/shared/constants/pagination";
import type { ApiEnvelope, DeleteResult, MutationResult } from "@/shared/types/api";
import type {
  LogLabTest,
  LogLabTestPayload,
  LogLabTestTypeGroup,
  PaginatedLogLabTests,
} from "../types/logLabTest";

type ListLabTestOptions = {
  search?: string;
  includeDeleted?: boolean;
  onlyDeleted?: boolean;
  sampleId?: string | number;
  testTypeId?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
};

function basePath(projectId: number, logId: number): string {
  return `/projects/${projectId}/logs/${logId}/lab-tests`;
}

export async function listLogLabTests(
  projectId: number,
  logId: number,
  page = 1,
  limit = DEFAULT_TABLE_PAGE_SIZE,
  options: ListLabTestOptions = {}
): Promise<PaginatedLogLabTests> {
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
  if (options.testTypeId?.trim()) params.testTypeId = options.testTypeId.trim();

  const res = await apiClient.get<ApiEnvelope<PaginatedLogLabTests>>(basePath(projectId, logId), {
    params,
  });
  return res.data.data;
}

export async function listLogLabTestTypeGroups(
  projectId: number,
  logId: number,
  options: Pick<ListLabTestOptions, "includeDeleted" | "onlyDeleted"> = {}
): Promise<LogLabTestTypeGroup[]> {
  const params: Record<string, string> = {};
  if (options.includeDeleted) params.includeDeleted = "true";
  if (options.onlyDeleted) params.onlyDeleted = "true";

  const res = await apiClient.get<ApiEnvelope<LogLabTestTypeGroup[]>>(
    `${basePath(projectId, logId)}/type-groups`,
    { params }
  );
  return res.data.data;
}

export async function createLogLabTest(
  projectId: number,
  logId: number,
  payload: LogLabTestPayload
): Promise<MutationResult<LogLabTest>> {
  const res = await apiClient.post<ApiEnvelope<LogLabTest>>(basePath(projectId, logId), payload);
  return { data: res.data.data, message: extractApiMessage(res.data) };
}

export async function updateLogLabTest(
  projectId: number,
  logId: number,
  id: string,
  payload: Partial<LogLabTestPayload>
): Promise<MutationResult<LogLabTest>> {
  const res = await apiClient.patch<ApiEnvelope<LogLabTest>>(
    `${basePath(projectId, logId)}/${id}`,
    payload
  );
  return { data: res.data.data, message: extractApiMessage(res.data) };
}

export async function deleteLogLabTest(
  projectId: number,
  logId: number,
  id: string
): Promise<DeleteResult> {
  const res = await apiClient.delete<ApiEnvelope<unknown>>(`${basePath(projectId, logId)}/${id}`);
  return { message: extractApiMessage(res.data) };
}

export async function restoreLogLabTest(
  projectId: number,
  logId: number,
  id: string
): Promise<MutationResult<LogLabTest>> {
  const res = await apiClient.post<ApiEnvelope<LogLabTest>>(
    `${basePath(projectId, logId)}/${id}/restore`
  );
  return { data: res.data.data, message: extractApiMessage(res.data) };
}

export async function copyLogLabTest(
  projectId: number,
  logId: number,
  id: string
): Promise<MutationResult<LogLabTest>> {
  const res = await apiClient.post<ApiEnvelope<LogLabTest>>(
    `${basePath(projectId, logId)}/${id}/copy`
  );
  return { data: res.data.data, message: extractApiMessage(res.data) };
}
