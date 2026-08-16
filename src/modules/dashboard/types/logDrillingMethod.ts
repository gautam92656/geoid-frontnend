export type WindowedWindowlessValue = "windowed" | "windowless" | "";

export type LogDrillingMethod = {
  id: string;
  logId: number;
  projectId: number;
  depthFrom: string;
  depthTo: string;
  drillingMethodId: string;
  drillingMethodName: string;
  windowedWindowless: WindowedWindowlessValue;
  diameter: string;
  recovery: string;
  waterAdded: string;
  comments: string;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
};

export type LogDrillingMethodFormPayload = {
  depthFrom: string;
  depthTo: string;
  drillingMethodId: string;
  drillingMethodName: string;
  windowedWindowless: WindowedWindowlessValue;
  diameter: string;
  recovery: string;
  waterAdded: string;
  comments: string;
  sortOrder?: number;
};

export type PaginatedLogDrillingMethods = {
  data: LogDrillingMethod[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};
