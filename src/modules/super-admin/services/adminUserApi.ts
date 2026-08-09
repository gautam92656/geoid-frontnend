import apiClient from "@/shared/services/apiClient";
import { extractApiMessage } from "@/shared/utils/apiMessage";
import { DEFAULT_TABLE_PAGE_SIZE, MAX_TABLE_PAGE_SIZE } from "@/shared/constants/pagination";
import type { ApiEnvelope, MutationResult } from "@/shared/types/api";
import type {
  AdminUser,
  AdminUserFormState,
  CreateAdminUserPayload,
  PaginatedAdminUsers,
  UpdateAdminUserPayload,
  UserRole,
} from "../types/user";
import { fileToCompanyLogoDataUrl } from "../utils/userFormUtils";

type ListAdminUsersOptions = {
  search?: string;
  role?: UserRole;
  isEmailVerified?: boolean;
};

async function resolveCompanyLogoUrl(form: AdminUserFormState): Promise<string | null> {
  if (form.companyLogoFile) {
    return fileToCompanyLogoDataUrl(form.companyLogoFile);
  }
  return form.companyLogoUrl.trim() || null;
}

export async function formToCreateUserPayload(
  form: AdminUserFormState
): Promise<CreateAdminUserPayload> {
  return {
    firstName: form.firstName.trim(),
    lastName: form.lastName.trim(),
    email: form.email.trim(),
    phoneCode: form.phoneCode.trim() || null,
    phoneNumber: form.phoneNumber.trim() || null,
    password: form.password,
    role: form.role,
    isEmailVerified: form.isEmailVerified,
    termsAndConditions: true,
    companyName: form.companyName.trim() || null,
    companyLogoUrl: await resolveCompanyLogoUrl(form),
  };
}

export async function formToUpdateUserPayload(
  form: AdminUserFormState
): Promise<UpdateAdminUserPayload> {
  const payload: UpdateAdminUserPayload = {
    firstName: form.firstName.trim(),
    lastName: form.lastName.trim(),
    email: form.email.trim(),
    phoneCode: form.phoneCode.trim() || null,
    phoneNumber: form.phoneNumber.trim() || null,
    role: form.role,
    isEmailVerified: form.isEmailVerified,
    companyName: form.companyName.trim() || null,
    companyLogoUrl: await resolveCompanyLogoUrl(form),
  };

  if (form.password.trim()) {
    payload.password = form.password;
  }

  return payload;
}

export async function listAdminUsers(
  page = 1,
  limit = DEFAULT_TABLE_PAGE_SIZE,
  options: ListAdminUsersOptions = {}
): Promise<PaginatedAdminUsers> {
  const params: Record<string, string | number | boolean> = {
    page,
    limit: Math.min(limit, MAX_TABLE_PAGE_SIZE),
    sortOrder: "desc",
  };
  const trimmedSearch = options.search?.trim();
  if (trimmedSearch) params.search = trimmedSearch;
  if (options.role) params.role = options.role;
  if (options.isEmailVerified !== undefined) {
    params.isEmailVerified = options.isEmailVerified ? "true" : "false";
  }

  const res = await apiClient.get<ApiEnvelope<PaginatedAdminUsers>>("/admin/users", { params });
  return res.data.data;
}

export async function getAdminUser(id: number): Promise<AdminUser> {
  const res = await apiClient.get<ApiEnvelope<AdminUser>>(`/admin/users/${id}`);
  return res.data.data;
}

export async function createAdminUser(
  payload: CreateAdminUserPayload
): Promise<MutationResult<AdminUser>> {
  const res = await apiClient.post<ApiEnvelope<AdminUser>>("/admin/users", payload);
  return { data: res.data.data, message: extractApiMessage(res.data) };
}

export async function updateAdminUser(
  id: number,
  payload: UpdateAdminUserPayload
): Promise<MutationResult<AdminUser>> {
  const res = await apiClient.patch<ApiEnvelope<AdminUser>>(`/admin/users/${id}`, payload);
  return { data: res.data.data, message: extractApiMessage(res.data) };
}

export async function deleteAdminUser(id: number): Promise<MutationResult<{ message: string }>> {
  const res = await apiClient.delete<ApiEnvelope<{ message: string }>>(`/admin/users/${id}`);
  return { data: res.data.data, message: extractApiMessage(res.data) };
}
