export type LogWaterObservation = {
  id: string;
  logId: number;
  projectId: number;
  depth: string;
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

export type LogWaterObservationPayload = {
  depth?: string;
  observationTypeId: string;
  observationTypeName: string;
  observationDate?: string;
  observationTime?: string;
  comments?: string;
  sortOrder?: number;
};

export type PaginatedLogWaterObservations = {
  data: LogWaterObservation[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};
