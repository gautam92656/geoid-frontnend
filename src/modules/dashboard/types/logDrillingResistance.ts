export type LogDrillingResistance = {
  id: string;
  logId: number;
  projectId: number;
  depthFrom: string;
  depthTo: string;
  resistanceTypeId: string;
  resistanceTypeName: string;
  comments: string;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
};

export type LogDrillingResistanceFormPayload = {
  depthFrom: string;
  depthTo: string;
  resistanceTypeId: string;
  resistanceTypeName: string;
  comments: string;
  sortOrder?: number;
};

export type PaginatedLogDrillingResistances = {
  data: LogDrillingResistance[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};
