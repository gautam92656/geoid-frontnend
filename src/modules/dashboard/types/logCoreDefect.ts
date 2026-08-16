export type LogCoreDefect = {
  id: string;
  logId: number;
  projectId: number;
  defectTypeId: string;
  defectTypeName: string;
  depthFrom: string;
  depthTo: string;
  defectOrientation: string;
  surfaceShapeIds: string[];
  surfaceRoughnessIds: string[];
  defectCoatingIds: string[];
  defectOpennessIds: string[];
  defectSpacingOverride: string;
  boundsOnDefectMin: string;
  boundsOnDefectMax: string;
  comments: string;
  photoName: string;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
};

export type LogCoreDefectPayload = {
  defectTypeId: string;
  defectTypeName: string;
  depthFrom: string;
  depthTo?: string;
  defectOrientation?: string;
  surfaceShapeIds?: string[];
  surfaceRoughnessIds?: string[];
  defectCoatingIds?: string[];
  defectOpennessIds?: string[];
  defectSpacingOverride?: string;
  boundsOnDefectMin?: string;
  boundsOnDefectMax?: string;
  comments?: string;
  photoName?: string;
  sortOrder?: number;
};

export type PaginatedLogCoreDefects = {
  data: LogCoreDefect[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};
