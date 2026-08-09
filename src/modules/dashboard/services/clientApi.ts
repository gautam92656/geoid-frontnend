import apiClient from "@/shared/services/apiClient";
import { extractApiMessage } from "@/shared/utils/apiMessage";
import { DEFAULT_TABLE_PAGE_SIZE, MAX_TABLE_PAGE_SIZE } from "@/shared/constants/pagination";
import type { ApiEnvelope, DeleteResult, MutationResult } from "@/shared/types/api";
import type { Client, ClientPayload, PaginatedClients } from "../types/client";

export async function listClients(
  page = 1,
  limit = DEFAULT_TABLE_PAGE_SIZE,
  search?: string
): Promise<PaginatedClients> {
  const params: Record<string, string | number> = {
    page,
    limit: Math.min(limit, MAX_TABLE_PAGE_SIZE),
    sortOrder: "desc",
  };
  const trimmedSearch = search?.trim();
  if (trimmedSearch) params.search = trimmedSearch;

  const res = await apiClient.get<ApiEnvelope<PaginatedClients>>("/clients", { params });
  return res.data.data;
}

export async function getClient(id: number): Promise<Client> {
  const res = await apiClient.get<ApiEnvelope<Client>>(`/clients/${id}`);
  return res.data.data;
}

export async function createClient(payload: ClientPayload): Promise<MutationResult<Client>> {
  const res = await apiClient.post<ApiEnvelope<Client>>("/clients", payload);
  return { data: res.data.data, message: extractApiMessage(res.data) };
}

export async function updateClient(
  id: number,
  payload: Partial<ClientPayload>
): Promise<MutationResult<Client>> {
  const res = await apiClient.patch<ApiEnvelope<Client>>(`/clients/${id}`, payload);
  return { data: res.data.data, message: extractApiMessage(res.data) };
}

export async function deleteClient(id: number): Promise<DeleteResult> {
  const res = await apiClient.delete<ApiEnvelope<unknown>>(`/clients/${id}`);
  return { message: extractApiMessage(res.data) };
}

export function formToClientPayload(form: {
  companyName: string;
  companyContact: string;
  email: string;
  phone: string;
  externalId: string;
  status: ClientPayload["status"];
}): ClientPayload {
  return {
    companyName: form.companyName.trim(),
    companyContact: form.companyContact.trim() || undefined,
    email: form.email.trim() || undefined,
    phone: form.phone.trim() || undefined,
    externalId: form.externalId.trim() || undefined,
    status: form.status,
  };
}
