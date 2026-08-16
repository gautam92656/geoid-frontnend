export type LogWellCover = {
  id: string;
  logId: number;
  projectId: number;
  wellId: string;
  wellIdLabel: string;
  wellCoverTypeId: string;
  wellCoverTypeName: string;
  depth: string;
  comments: string;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
};

export type LogWellCoverFormPayload = {
  wellId: string;
  wellIdLabel: string;
  wellCoverTypeId: string;
  wellCoverTypeName: string;
  depth: string;
  comments: string;
  sortOrder?: number;
};

export type PaginatedLogWellCovers = {
  data: LogWellCover[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};
