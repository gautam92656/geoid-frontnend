export type LogRemark = {
  id: string;
  logId: number;
  projectId: number;
  depthFrom: string;
  depthTo: string;
  remarkTypeId: string;
  remarkTypeName: string;
  remarks: string;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
};

export type LogRemarkPayload = {
  depthFrom: string;
  depthTo?: string;
  remarkTypeId: string;
  remarkTypeName: string;
  remarks?: string;
  sortOrder?: number;
};

export type PaginatedLogRemarks = {
  data: LogRemark[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};
