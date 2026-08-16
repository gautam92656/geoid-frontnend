export type LabTestResultValues = Record<string, unknown>;

export type LogLabTest = {
  id: string;
  logId: number;
  projectId: number;
  sampleId: string | null;
  sampleNo: string;
  depthFrom: string;
  depthTo: string;
  testTypeId: string;
  testTypeName: string;
  results: string;
  comments: string;
  resultValues: LabTestResultValues;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
};

export type LogLabTestPayload = {
  depthFrom: string;
  depthTo?: string;
  testTypeId: string;
  testTypeName: string;
  results?: string;
  comments?: string;
  resultValues?: LabTestResultValues;
  sampleId?: string | number | null;
  sampleNo?: string;
  sortOrder?: number;
};

export type LogLabTestTypeGroup = {
  testTypeId: string;
  testTypeName: string;
  count: number;
};

export type PaginatedLogLabTests = {
  data: LogLabTest[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};
