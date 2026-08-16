export type LogWellProbe = {
  id: string;
  logId: number;
  projectId: number;
  wellId: string;
  wellIdLabel: string;
  probeTypeId: string;
  probeTypeName: string;
  depthFrom: string;
  depthTo: string;
  comments: string;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
};

export type LogWellProbeFormPayload = {
  wellId: string;
  wellIdLabel: string;
  probeTypeId: string;
  probeTypeName: string;
  depthFrom: string;
  depthTo: string;
  comments: string;
  sortOrder?: number;
};

export type PaginatedLogWellProbes = {
  data: LogWellProbe[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};
