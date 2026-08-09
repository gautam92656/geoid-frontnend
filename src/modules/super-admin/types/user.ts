export type UserRole = "user" | "super_admin";

export type AdminUser = {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  phoneCode: string | null;
  phoneNumber: string | null;
  termsAndConditions: boolean;
  isEmailVerified: boolean;
  role: UserRole;
  companyName: string | null;
  companyLogoUrl: string | null;
  createdAt: string;
  updatedAt: string;
};

export type AdminUserFormState = {
  firstName: string;
  lastName: string;
  email: string;
  phoneCode: string;
  phoneNumber: string;
  password: string;
  role: UserRole;
  isEmailVerified: boolean;
  companyName: string;
  companyLogoUrl: string;
  companyLogoFile: File | null;
};

export type PaginatedAdminUsers = {
  data: AdminUser[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

export type CreateAdminUserPayload = {
  firstName: string;
  lastName: string;
  email: string;
  phoneCode?: string | null;
  phoneNumber?: string | null;
  password: string;
  role: UserRole;
  isEmailVerified: boolean;
  termsAndConditions: boolean;
  companyName?: string | null;
  companyLogoUrl?: string | null;
};

export type UpdateAdminUserPayload = {
  firstName?: string;
  lastName?: string;
  email?: string;
  phoneCode?: string | null;
  phoneNumber?: string | null;
  password?: string;
  role?: UserRole;
  isEmailVerified?: boolean;
  companyName?: string | null;
  companyLogoUrl?: string | null;
};
