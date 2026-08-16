export type LogWellCasing = {
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

export type LogWellCasingFormPayload = {
  depthFrom: string;
  depthTo: string;
  casingTypeId: string;
  casingTypeName: string;
  comments: string;
  sortOrder?: number;
};

export type PaginatedLogWellCasings = {
  data: LogWellCasing[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};
