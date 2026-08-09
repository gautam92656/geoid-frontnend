import apiClient from "@/shared/services/apiClient";
import { extractApiMessage } from "@/shared/utils/apiMessage";
import type { ApiEnvelope, DeleteResult, MutationResult } from "@/shared/types/api";
import type { Item, ItemPayload, PaginatedItems } from "../types";

export async function listItems(page = 1, limit = 10): Promise<PaginatedItems> {
  const res = await apiClient.get<ApiEnvelope<PaginatedItems>>("/items", {
    params: { page, limit },
  });
  return res.data.data;
}

export async function createItem(payload: ItemPayload): Promise<MutationResult<Item>> {
  const res = await apiClient.post<ApiEnvelope<Item>>("/items", payload);
  return { data: res.data.data, message: extractApiMessage(res.data) };
}

export async function updateItem(
  id: number,
  payload: Partial<ItemPayload>
): Promise<MutationResult<Item>> {
  const res = await apiClient.patch<ApiEnvelope<Item>>(`/items/${id}`, payload);
  return { data: res.data.data, message: extractApiMessage(res.data) };
}

export async function deleteItem(id: number): Promise<DeleteResult> {
  const res = await apiClient.delete<ApiEnvelope<unknown>>(`/items/${id}`);
  return { message: extractApiMessage(res.data) };
}
