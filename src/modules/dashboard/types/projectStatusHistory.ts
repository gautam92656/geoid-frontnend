import type { Project } from "./project";

export type ProjectStatusHistoryEntry = {
  id: number;
  status: string;
  createdAt: string;
  user: string;
};

export type ProjectStatusUpdateResult = {
  project: Project;
  entry: ProjectStatusHistoryEntry;
};
