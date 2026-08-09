import apiClient from "@/shared/services/apiClient";
import { extractApiMessage } from "@/shared/utils/apiMessage";
import type { ApiEnvelope, MutationResult } from "@/shared/types/api";
import type {
  ProjectStatusHistoryEntry,
  ProjectStatusUpdateResult,
} from "../types/projectStatusHistory";
import { projectStatusToApiValue } from "../utils/projectFormUtils";

export async function listProjectStatusHistory(
  projectId: number
): Promise<ProjectStatusHistoryEntry[]> {
  const res = await apiClient.get<ApiEnvelope<ProjectStatusHistoryEntry[]>>(
    `/projects/${projectId}/status-history`
  );
  return res.data.data;
}

export async function updateProjectStatus(
  projectId: number,
  status: string
): Promise<MutationResult<ProjectStatusUpdateResult>> {
  const res = await apiClient.post<ApiEnvelope<ProjectStatusUpdateResult>>(
    `/projects/${projectId}/status-history`,
    { status: projectStatusToApiValue(status) }
  );
  return { data: res.data.data, message: extractApiMessage(res.data) };
}
