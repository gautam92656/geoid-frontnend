export type SupplierStatus = "active" | "inactive";

export type SupplierType = "Laboratory" | "Equipment";

export type SupplierRelationship = "Internal supplier" | "External supplier";

export type Supplier = {
  id: number;
  businessName: string;
  supplierType: SupplierType;
  supplierRelationship: string;
  supplierExternalId: string;
  labTestTypes: string[];
  firstName: string;
  lastName: string;
  address: string;
  email: string;
  phone: string;
  abn: string;
  status: SupplierStatus;
  createdAt: string;
  updatedAt: string;
};

export type SupplierFormState = {
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
  status: SupplierStatus;
};

export type SupplierPayload = {
  businessName: string;
  supplierType: SupplierType;
  supplierRelationship?: SupplierRelationship;
  supplierExternalId?: string;
  labTestTypes?: string[];
  firstName?: string;
  lastName?: string;
  address?: string;
  email?: string;
  phone?: string;
  abn?: string;
  status?: SupplierStatus;
};

export type PaginatedSuppliers = {
  data: Supplier[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};
