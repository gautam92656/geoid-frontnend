export type LogDrillingCasing = {
  id: string;
  logId: number;
  projectId: number;
  depthFrom: string;
  depthTo: string;
  casingTypeId: string;
  casingTypeName: string;
  comments: string;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
};

export type LogDrillingCasingFormPayload = {
  depthFrom: string;
  depthTo: string;
  casingTypeId: string;
  casingTypeName: string;
  comments: string;
  sortOrder?: number;
};

export type PaginatedLogDrillingCasings = {
  data: LogDrillingCasing[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};
