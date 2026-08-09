import apiClient from "@/shared/services/apiClient";
import { extractApiMessage } from "@/shared/utils/apiMessage";
import { DEFAULT_TABLE_PAGE_SIZE, MAX_TABLE_PAGE_SIZE } from "@/shared/constants/pagination";
import type { ApiEnvelope, DeleteResult, MutationResult } from "@/shared/types/api";
import type {
  PaginatedSuppliers,
  Supplier,
  SupplierPayload,
  SupplierRelationship,
  SupplierStatus,
  SupplierType,
} from "../types/supplier";

type ListSuppliersOptions = {
  search?: string;
  supplierType?: SupplierType;
  status?: SupplierStatus;
};

export async function listSuppliers(
  page = 1,
  limit = DEFAULT_TABLE_PAGE_SIZE,
  options: ListSuppliersOptions = {}
): Promise<PaginatedSuppliers> {
  const params: Record<string, string | number> = {
    page,
    limit: Math.min(limit, MAX_TABLE_PAGE_SIZE),
    sortOrder: "desc",
  };
  const trimmedSearch = options.search?.trim();
  if (trimmedSearch) params.search = trimmedSearch;
  if (options.supplierType) params.supplierType = options.supplierType;
  if (options.status) params.status = options.status;

  const res = await apiClient.get<ApiEnvelope<PaginatedSuppliers>>("/suppliers", { params });
  return res.data.data;
}

export async function getSupplier(id: number): Promise<Supplier> {
  const res = await apiClient.get<ApiEnvelope<Supplier>>(`/suppliers/${id}`);
  return res.data.data;
}

export async function createSupplier(payload: SupplierPayload): Promise<MutationResult<Supplier>> {
  const res = await apiClient.post<ApiEnvelope<Supplier>>("/suppliers", payload);
  return { data: res.data.data, message: extractApiMessage(res.data) };
}

export async function updateSupplier(
  id: number,
  payload: Partial<SupplierPayload>
): Promise<MutationResult<Supplier>> {
  const res = await apiClient.patch<ApiEnvelope<Supplier>>(`/suppliers/${id}`, payload);
  return { data: res.data.data, message: extractApiMessage(res.data) };
}

export async function deleteSupplier(id: number): Promise<DeleteResult> {
  const res = await apiClient.delete<ApiEnvelope<unknown>>(`/suppliers/${id}`);
  return { message: extractApiMessage(res.data) };
}

export function formToSupplierPayload(form: {
  businessName: string;
  supplierType: string;
  supplierRelationship: string;
  supplierExternalId: string;
  labTestTypes: string[];
  firstName: string;
  lastName: string;
  address: string;
  email: string;
  phone: string;
  abn: string;
  status: "active" | "inactive";
}): SupplierPayload {
  return {
    businessName: form.businessName.trim(),
    supplierType: form.supplierType as SupplierPayload["supplierType"],
    supplierRelationship: (form.supplierRelationship.trim() ||
      undefined) as SupplierRelationship | undefined,
    supplierExternalId: form.supplierExternalId.trim() || undefined,
    labTestTypes: [...form.labTestTypes],
    firstName: form.firstName.trim() || undefined,
    lastName: form.lastName.trim() || undefined,
    address: form.address.trim() || undefined,
    email: form.email.trim() || undefined,
    phone: form.phone.trim() || undefined,
    abn: form.abn.trim() || undefined,
    status: form.status,
  };
}
