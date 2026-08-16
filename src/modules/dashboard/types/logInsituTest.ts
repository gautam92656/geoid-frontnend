export type InsituTestResultValues = Record<string, unknown>;

export type LogInsituTest = {
  id: string;
  logId: number;
  projectId: number;
  sampleId: string | null;
  depthFrom: string;
  depthTo: string;
  testTypeId: string;
  testTypeName: string;
  results: string;
  comments: string;
  resultValues: InsituTestResultValues;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
};

export type LogInsituTestPayload = {
  depthFrom: string;
  depthTo?: string;
  testTypeId: string;
  testTypeName: string;
  results?: string;
  comments?: string;
  resultValues?: InsituTestResultValues;
  sampleId?: string | number | null;
  sortOrder?: number;
};

export type PaginatedLogInsituTests = {
  data: LogInsituTest[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};
