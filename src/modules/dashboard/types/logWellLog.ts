export type LogWellLog = {
  id: string;
  logId: number;
  projectId: number;
  wellId: string;
  depthFrom: string;
  depthTo: string;
  wellTypeId: string;
  wellTypeName: string;
  comments: string;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
};

export type LogWellLogFormPayload = {
  wellId: string;
  depthFrom: string;
  depthTo: string;
  wellTypeId: string;
  wellTypeName: string;
  comments: string;
  sortOrder?: number;
};

export type PaginatedLogWellLogs = {
  data: LogWellLog[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};
