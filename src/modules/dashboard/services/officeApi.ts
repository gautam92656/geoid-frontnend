import apiClient from "@/shared/services/apiClient";
import { extractApiMessage } from "@/shared/utils/apiMessage";
import { DEFAULT_TABLE_PAGE_SIZE, MAX_TABLE_PAGE_SIZE } from "@/shared/constants/pagination";
import type { ApiEnvelope, DeleteResult, MutationResult } from "@/shared/types/api";
import type { Office, OfficeFormState, OfficePayload, PaginatedOffices } from "../types/office";

export async function listOffices(
  page = 1,
  limit = DEFAULT_TABLE_PAGE_SIZE,
  search?: string
): Promise<PaginatedOffices> {
  const params: Record<string, string | number> = {
    page,
    limit: Math.min(limit, MAX_TABLE_PAGE_SIZE),
    sortOrder: "desc",
  };
  const trimmedSearch = search?.trim();
  if (trimmedSearch) params.search = trimmedSearch;

  const res = await apiClient.get<ApiEnvelope<PaginatedOffices>>("/offices", { params });
  return res.data.data;
}

export async function getOffice(id: number): Promise<Office> {
  const res = await apiClient.get<ApiEnvelope<Office>>(`/offices/${id}`);
  return res.data.data;
}

export async function createOffice(payload: OfficePayload): Promise<MutationResult<Office>> {
  const res = await apiClient.post<ApiEnvelope<Office>>("/offices", payload);
  return { data: res.data.data, message: extractApiMessage(res.data) };
}

export async function updateOffice(
  id: number,
  payload: Partial<OfficePayload>
): Promise<MutationResult<Office>> {
  const res = await apiClient.patch<ApiEnvelope<Office>>(`/offices/${id}`, payload);
  return { data: res.data.data, message: extractApiMessage(res.data) };
}

export async function deleteOffice(id: number): Promise<DeleteResult> {
  const res = await apiClient.delete<ApiEnvelope<unknown>>(`/offices/${id}`);
  return { message: extractApiMessage(res.data) };
}

export function formToOfficePayload(form: OfficeFormState): OfficePayload {
  return {
    name: form.name.trim(),
    address: form.address.trim() || undefined,
    phone: form.phoneNumber.trim() || undefined,
    externalId: form.officeExternalId.trim() || undefined,
    officeNumber: form.officeNumber.trim() || undefined,
    state: form.state.trim() || undefined,
    laboratory: form.laboratory.trim() || undefined,
  };
}
