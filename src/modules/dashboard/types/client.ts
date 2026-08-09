export type ClientStatus = "active" | "inactive";

export type Client = {
  id: number;
  companyName: string;
  companyContact: string;
  email: string;
  phone: string;
  externalId: string;
  status: ClientStatus;
  createdAt: string;
  updatedAt: string;
};

export type ClientFormState = {
  companyName: string;
  companyContact: string;
  email: string;
  phone: string;
  externalId: string;
  status: ClientStatus;
};

export type ClientPayload = {
  companyName: string;
  companyContact?: string;
  email?: string;
  phone?: string;
  externalId?: string;
  status?: ClientStatus;
};

export type PaginatedClients = {
  data: Client[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};
