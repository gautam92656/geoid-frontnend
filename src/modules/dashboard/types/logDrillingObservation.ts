export type LogDrillingObservation = {
  id: string;
  logId: number;
  projectId: number;
  depth: string;
  depthOfCasing: string;
  depthToWater: string;
  observationTypeId: string;
  observationTypeName: string;
  observationDate: string;
  observationTime: string;
  comments: string;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
};

export type LogDrillingObservationPayload = {
  depth?: string;
  depthOfCasing?: string;
  depthToWater?: string;
  observationTypeId: string;
  observationTypeName: string;
  observationDate?: string;
  observationTime?: string;
  comments?: string;
  sortOrder?: number;
};

export type PaginatedLogDrillingObservations = {
  data: LogDrillingObservation[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};
