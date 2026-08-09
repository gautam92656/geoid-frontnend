import apiClient from "@/shared/services/apiClient";
import { extractApiMessage } from "@/shared/utils/apiMessage";
import type { ApiEnvelope, DeleteResult, MutationResult } from "@/shared/types/api";
import type {
  EquipmentFieldConfig,
  EquipmentFieldDefinition,
  EquipmentType,
  EquipmentTypePayload,
  PaginatedEquipmentTypes,
} from "../types/equipmentType";

export async function listEquipmentFieldDefinitions(): Promise<EquipmentFieldDefinition[]> {
  const res = await apiClient.get<ApiEnvelope<EquipmentFieldDefinition[]>>("/equipment-types/fields");
  return res.data.data;
}

export async function listEquipmentTypes(page = 1, limit = 100): Promise<PaginatedEquipmentTypes> {
  const res = await apiClient.get<ApiEnvelope<PaginatedEquipmentTypes>>("/equipment-types", {
    params: { page, limit, sortOrder: "asc" },
  });
  return res.data.data;
}

export async function getEquipmentType(id: number): Promise<EquipmentType> {
  const res = await apiClient.get<ApiEnvelope<EquipmentType>>(`/equipment-types/${id}`);
  return res.data.data;
}

export async function createEquipmentType(
  payload: EquipmentTypePayload
): Promise<MutationResult<EquipmentType>> {
  const res = await apiClient.post<ApiEnvelope<EquipmentType>>("/equipment-types", payload);
  return { data: res.data.data, message: extractApiMessage(res.data) };
}

export async function updateEquipmentType(
  id: number,
  payload: Partial<EquipmentTypePayload>
): Promise<MutationResult<EquipmentType>> {
  const res = await apiClient.patch<ApiEnvelope<EquipmentType>>(`/equipment-types/${id}`, payload);
  return { data: res.data.data, message: extractApiMessage(res.data) };
}

export async function deleteEquipmentType(id: number): Promise<DeleteResult> {
  const res = await apiClient.delete<ApiEnvelope<unknown>>(`/equipment-types/${id}`);
  return { message: extractApiMessage(res.data) };
}

export function formToEquipmentTypePayload(form: {
  name: string;
  description: string;
  status: "active" | "inactive";
  fieldConfig: EquipmentFieldConfig;
}): EquipmentTypePayload {
  return {
    name: form.name.trim(),
    description: form.description.trim(),
    status: form.status,
    fieldConfig: { ...form.fieldConfig },
  };
}
