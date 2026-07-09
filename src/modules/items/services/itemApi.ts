import apiClient from "@/shared/services/apiClient";
import type { Item, ItemPayload, PaginatedItems } from "../types";

export async function listItems(page = 1, limit = 10): Promise<PaginatedItems> {
  const res = await apiClient.get<{ data: PaginatedItems }>("/items", {
    params: { page, limit },
  });
  return res.data.data;
}

export async function createItem(payload: ItemPayload): Promise<Item> {
  const res = await apiClient.post<{ data: Item }>("/items", payload);
  return res.data.data;
}

export async function updateItem(id: number, payload: Partial<ItemPayload>): Promise<Item> {
  const res = await apiClient.patch<{ data: Item }>(`/items/${id}`, payload);
  return res.data.data;
}

export async function deleteItem(id: number): Promise<void> {
  await apiClient.delete(`/items/${id}`);
}
