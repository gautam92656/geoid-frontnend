import apiClient from "@/shared/services/apiClient";
import { extractApiMessage } from "@/shared/utils/apiMessage";
import { DEFAULT_TABLE_PAGE_SIZE, MAX_TABLE_PAGE_SIZE } from "@/shared/constants/pagination";
import type { ApiEnvelope, DeleteResult, MutationResult } from "@/shared/types/api";
import type { Equipment, EquipmentPayload, PaginatedEquipment } from "../types/equipment";
import type { EquipmentFormState } from "../types/equipment";

export async function listEquipment(
  page = 1,
  limit = DEFAULT_TABLE_PAGE_SIZE,
  search?: string
): Promise<PaginatedEquipment> {
  const params: Record<string, string | number> = {
    page,
    limit: Math.min(limit, MAX_TABLE_PAGE_SIZE),
    sortOrder: "desc",
  };
  const trimmedSearch = search?.trim();
  if (trimmedSearch) params.search = trimmedSearch;

  const res = await apiClient.get<ApiEnvelope<PaginatedEquipment>>("/equipment", { params });
  return res.data.data;
}

export async function getEquipment(id: number): Promise<Equipment> {
  const res = await apiClient.get<ApiEnvelope<Equipment>>(`/equipment/${id}`);
  return res.data.data;
}

export async function createEquipment(payload: EquipmentPayload): Promise<MutationResult<Equipment>> {
  const res = await apiClient.post<ApiEnvelope<Equipment>>("/equipment", payload);
  return { data: res.data.data, message: extractApiMessage(res.data) };
}

export async function updateEquipment(
  id: number,
  payload: Partial<EquipmentPayload>
): Promise<MutationResult<Equipment>> {
  const res = await apiClient.patch<ApiEnvelope<Equipment>>(`/equipment/${id}`, payload);
  return { data: res.data.data, message: extractApiMessage(res.data) };
}

export async function deleteEquipment(id: number): Promise<DeleteResult> {
  const res = await apiClient.delete<ApiEnvelope<unknown>>(`/equipment/${id}`);
  return { message: extractApiMessage(res.data) };
}

export function formToEquipmentPayload(form: EquipmentFormState): EquipmentPayload {
  const equipmentTypeId = Number.parseInt(form.equipmentTypeId, 10);

  return {
    equipmentTypeId,
    equipmentNo: form.equipmentNo.trim() || undefined,
    equipmentName: form.equipmentName.trim() || undefined,
    suppliers: [...form.suppliers],
    mounting: form.mounting.trim() || undefined,
    driveWeight: form.driveWeight.trim() || undefined,
    drop: form.drop.trim() || undefined,
    manufacturer: form.manufacturer.trim() || undefined,
    model: form.model.trim() || undefined,
    energyTransferRatio: form.energyTransferRatio.trim() || undefined,
    hammerEfficiencyCorrection: form.hammerEfficiencyCorrection.trim() || undefined,
    netAreaRatio: form.netAreaRatio.trim() || undefined,
    tipArea: form.tipArea.trim() || undefined,
    frictionRatio: form.frictionRatio.trim() || undefined,
    porePressureTransducerLocation: form.porePressureTransducerLocation.trim() || undefined,
    frictionReducerType: form.frictionReducerType.trim() || undefined,
    frictionReducer: form.frictionReducer.trim() || undefined,
    calibratedBy: form.calibratedBy.trim() || undefined,
    dateOfCalibration: form.dateOfCalibration || undefined,
    bucketWidth: form.bucketWidth.trim() || undefined,
  };
}
