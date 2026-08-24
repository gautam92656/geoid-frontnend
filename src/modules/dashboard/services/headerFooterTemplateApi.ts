import apiClient from "@/shared/services/apiClient";
import { extractApiMessage } from "@/shared/utils/apiMessage";
import { DEFAULT_TABLE_PAGE_SIZE, MAX_TABLE_PAGE_SIZE } from "@/shared/constants/pagination";
import type { ApiEnvelope, DeleteResult, MutationResult } from "@/shared/types/api";
import type {
  HeaderFooterTemplate,
  HeaderFooterTemplateFormState,
  HeaderFooterTemplatePayload,
  ListHeaderFooterTemplatesParams,
  PaginatedHeaderFooterTemplates,
} from "../types/headerFooterTemplate";

function headerFooterTemplatesBasePath(ownerUserId?: number): string {
  return ownerUserId != null
    ? `/admin/users/${ownerUserId}/header-footer-templates`
    : "/header-footer-templates";
}

export async function listHeaderFooterTemplates(
  page = 1,
  limit = DEFAULT_TABLE_PAGE_SIZE,
  options: ListHeaderFooterTemplatesParams & { ownerUserId?: number } = {}
): Promise<PaginatedHeaderFooterTemplates> {
  const params: Record<string, string | number> = {
    page,
    limit: Math.min(limit, MAX_TABLE_PAGE_SIZE),
    sortBy: options.sortBy ?? "updatedAt",
    sortOrder: options.sortOrder ?? "desc",
  };

  const trimmedSearch = options.search?.trim();
  if (trimmedSearch) params.search = trimmedSearch;
  if (options.kind) params.kind = options.kind;

  const res = await apiClient.get<ApiEnvelope<PaginatedHeaderFooterTemplates>>(
    headerFooterTemplatesBasePath(options.ownerUserId),
    { params }
  );
  return res.data.data;
}

export async function getHeaderFooterTemplate(
  id: number,
  ownerUserId?: number
): Promise<HeaderFooterTemplate> {
  const res = await apiClient.get<ApiEnvelope<HeaderFooterTemplate>>(
    `${headerFooterTemplatesBasePath(ownerUserId)}/${id}`
  );
  return res.data.data;
}

export async function createHeaderFooterTemplate(
  payload: HeaderFooterTemplatePayload,
  ownerUserId?: number
): Promise<MutationResult<HeaderFooterTemplate>> {
  const res = await apiClient.post<ApiEnvelope<HeaderFooterTemplate>>(
    headerFooterTemplatesBasePath(ownerUserId),
    payload
  );
  return { data: res.data.data, message: extractApiMessage(res.data) };
}

export async function updateHeaderFooterTemplate(
  id: number,
  payload: Partial<HeaderFooterTemplatePayload>,
  ownerUserId?: number
): Promise<MutationResult<HeaderFooterTemplate>> {
  const res = await apiClient.patch<ApiEnvelope<HeaderFooterTemplate>>(
    `${headerFooterTemplatesBasePath(ownerUserId)}/${id}`,
    payload
  );
  return { data: res.data.data, message: extractApiMessage(res.data) };
}

export async function deleteHeaderFooterTemplate(
  id: number,
  ownerUserId?: number
): Promise<DeleteResult> {
  const res = await apiClient.delete<ApiEnvelope<unknown>>(
    `${headerFooterTemplatesBasePath(ownerUserId)}/${id}`
  );
  return { message: extractApiMessage(res.data) };
}

export function formToHeaderFooterTemplatePayload(
  form: HeaderFooterTemplateFormState
): HeaderFooterTemplatePayload {
  return {
    name: form.name.trim(),
    kind: form.kind,
    reportType: form.reportType === "" ? null : form.reportType,
  };
}

export function headerFooterTemplateToForm(
  template: HeaderFooterTemplate
): HeaderFooterTemplateFormState {
  return {
    name: template.name,
    kind: template.kind,
    reportType: template.reportType ?? "",
  };
}
