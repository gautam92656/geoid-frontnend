export type Office = {
  id: number;
  name: string;
  address: string;
  phone: string;
  externalId: string;
  officeNumber: string;
  state: string;
  laboratory: string;
  createdAt: string;
  updatedAt: string;
};

export type OfficeFormState = {
  name: string;
  address: string;
  phoneNumber: string;
  officeExternalId: string;
  officeNumber: string;
  state: string;
  laboratory: string;
  logoFile: File | null;
};

export type OfficePayload = {
  name: string;
  address?: string;
  phone?: string;
  externalId?: string;
  officeNumber?: string;
  state?: string;
  laboratory?: string;
};

export type PaginatedOffices = {
  data: Office[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};
