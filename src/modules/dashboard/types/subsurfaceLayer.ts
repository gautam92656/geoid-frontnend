import type { WorkflowPreviewValues } from "../utils/configModuleSettings";

export type SubsurfaceHatch = "concrete" | "fill" | "clay" | "silt" | "sand" | "empty";

export type SubsurfaceLayer = {
  id: string;
  logId: number;
  projectId: number;
  depth: string;
  classification: string;
  origin: string;
  description: string;
  consistency: string;
  moisture: string;
  remarks: string;
  hatch: SubsurfaceHatch;
  values: WorkflowPreviewValues;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
};

export type SubsurfaceLayerPayload = {
  depth: string;
  classification?: string;
  origin?: string;
  description?: string;
  consistency?: string;
  moisture?: string;
  remarks?: string;
  hatch?: SubsurfaceHatch;
  values?: WorkflowPreviewValues;
  sortOrder?: number;
};

export type PaginatedSubsurfaceLayers = {
  data: SubsurfaceLayer[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};
