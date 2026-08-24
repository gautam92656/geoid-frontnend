export type LogFinishLog = {
  id: string;
  logId: number;
  projectId: number;
  userId: number;
  finishTypeId: string;
  finishTypeName: string;
  completedDate: string;
  endDepth: string;
  comments: string;
  scaleLogReport: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
};

export type LogFinishLogFormPayload = {
  finishTypeId: string;
  finishTypeName: string;
  completedDate: string;
  endDepth: string;
  comments: string;
  scaleLogReport: boolean;
  sortOrder?: number;
};

export type PaginatedLogFinishLogs = {
  data: LogFinishLog[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};
