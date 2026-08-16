export type LogWellCasingTop = {
  id: string;
  logId: number;
  projectId: number;
  elevation: string;
  depthFrom: string;
  depthTo: string;
  casingTypeId: string;
  casingTypeName: string;
  notes: string;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
};

export type LogWellCasingTopFormPayload = {
  elevation: string;
  depthFrom: string;
  depthTo: string;
  casingTypeId: string;
  casingTypeName: string;
  notes: string;
  sortOrder?: number;
};

export type PaginatedLogWellCasingTops = {
  data: LogWellCasingTop[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};
