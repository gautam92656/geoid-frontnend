export interface Item {
  id: number;
  name: string;
  description: string;
  createdAt: string;
  updatedAt: string;
}

export interface ItemPayload {
  name: string;
  description: string;
}

export interface PaginatedItems {
  data: Item[];
  total: number;
  page: number;
  limit: number;
}
