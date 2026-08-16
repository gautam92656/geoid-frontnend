export type LogSample = {
  id: string;
  logId: number;
  projectId: number;
  depthFrom: string;
  depthTo: string;
  sampleTypeId: string;
  sampleTypeName: string;
  sampleNo: string;
  qcSampleId: string;
  sampleDate: string;
  sampleTime: string;
  recovery: string;
  comments: string;
  labTestRequestId: string;
  labTestRequestName: string;
  labTestTypeIds: string[];
  subsurfaceClassification: string;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
};

export type LogSamplePayload = {
  depthFrom: string;
  depthTo?: string;
  sampleTypeId: string;
  sampleTypeName: string;
  sampleNo?: string;
  qcSampleId?: string;
  sampleDate?: string;
  sampleTime?: string;
  recovery?: string;
  comments?: string;
  labTestRequestId?: string;
  labTestRequestName?: string;
  labTestTypeIds?: string[];
  subsurfaceClassification?: string;
  sortOrder?: number;
};

export type PaginatedLogSamples = {
  data: LogSample[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};
