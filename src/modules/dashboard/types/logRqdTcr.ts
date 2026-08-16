export type LogRqdTcr = {
  id: string;
  logId: number;
  projectId: number;
  depthFrom: string;
  depthTo: string;
  startDate: string;
  startTime: string;
  endDate: string;
  endTime: string;
  corePieceLength: string;
  rqdPercent: string;
  coreLossLength: string;
  coreRecoveryLength: string;
  tcrPercent: string;
  photoName: string;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
};

export type LogRqdTcrFormPayload = {
  depthFrom: string;
  depthTo: string;
  startDate: string;
  startTime: string;
  endDate: string;
  endTime: string;
  corePieceLength: string;
  rqdPercent: string;
  coreLossLength: string;
  coreRecoveryLength: string;
  tcrPercent: string;
  photoName: string;
  sortOrder?: number;
};

export type PaginatedLogRqdTcrs = {
  data: LogRqdTcr[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};
