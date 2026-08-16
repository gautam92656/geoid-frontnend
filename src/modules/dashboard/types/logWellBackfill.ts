export type LogWellBackfill = {
  id: string;
  logId: number;
  projectId: number;
  depthFrom: string;
  depthTo: string;
  backfillTypeId: string;
  backfillTypeName: string;
  comments: string;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
};

export type LogWellBackfillFormPayload = {
  depthFrom: string;
  depthTo: string;
  backfillTypeId: string;
  backfillTypeName: string;
  comments: string;
  sortOrder?: number;
};

export type PaginatedLogWellBackfills = {
  data: LogWellBackfill[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};
