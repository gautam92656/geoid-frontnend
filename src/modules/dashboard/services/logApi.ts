import apiClient from "@/shared/services/apiClient";
import { extractApiMessage } from "@/shared/utils/apiMessage";
import { DEFAULT_TABLE_PAGE_SIZE, MAX_TABLE_PAGE_SIZE } from "@/shared/constants/pagination";
import type { ApiEnvelope, DeleteResult, MutationResult } from "@/shared/types/api";
import type { Log, LogFormState, LogPayload, PaginatedLogs } from "../types/log";
import { logStatusToApiValue, logTypeToApiValue } from "../utils/logFormUtils";

type ListLogsOptions = {
  search?: string;
  status?: string;
  includeDeleted?: boolean;
};

export async function listProjectLogs(
  projectId: number,
  page = 1,
  limit = DEFAULT_TABLE_PAGE_SIZE,
  options: ListLogsOptions = {}
): Promise<PaginatedLogs> {
  const params: Record<string, string | number> = {
    page,
    limit: Math.min(limit, MAX_TABLE_PAGE_SIZE),
    sortOrder: "desc",
  };
  const trimmedSearch = options.search?.trim();
  if (trimmedSearch) params.search = trimmedSearch;
  if (options.status?.trim()) params.status = logStatusToApiValue(options.status.trim());
  if (options.includeDeleted) params.includeDeleted = "true";

  const res = await apiClient.get<ApiEnvelope<PaginatedLogs>>(`/projects/${projectId}/logs`, {
    params,
  });
  return res.data.data;
}

export async function getLog(projectId: number, id: number): Promise<Log> {
  const res = await apiClient.get<ApiEnvelope<Log>>(`/projects/${projectId}/logs/${id}`);
  return res.data.data;
}

export async function createLog(
  projectId: number,
  payload: LogPayload
): Promise<MutationResult<Log>> {
  const res = await apiClient.post<ApiEnvelope<Log>>(`/projects/${projectId}/logs`, payload);
  return { data: res.data.data, message: extractApiMessage(res.data) };
}

export async function updateLog(
  projectId: number,
  id: number,
  payload: Partial<LogPayload>
): Promise<MutationResult<Log>> {
  const res = await apiClient.patch<ApiEnvelope<Log>>(`/projects/${projectId}/logs/${id}`, payload);
  return { data: res.data.data, message: extractApiMessage(res.data) };
}

export async function deleteLog(projectId: number, id: number): Promise<DeleteResult> {
  const res = await apiClient.delete<ApiEnvelope<unknown>>(`/projects/${projectId}/logs/${id}`);
  return { message: extractApiMessage(res.data) };
}

function buildCopyLogNumber(logNumber: string, existingNumbers: Set<string>): string {
  const base = `${logNumber} (Copy)`;
  if (!existingNumbers.has(base)) return base;

  let index = 2;
  while (existingNumbers.has(`${logNumber} (Copy ${index})`)) {
    index += 1;
  }

  return `${logNumber} (Copy ${index})`;
}

export function logToCopyPayload(log: Log, logNumber: string): LogPayload {
  const proposedBorelogId = log.proposedBorelogId.trim();
  const supplierId = log.supplierId.trim();
  const equipmentId = log.equipmentId.trim();

  return {
    proposedBorelogId: proposedBorelogId ? Number(proposedBorelogId) : null,
    logNumber,
    logConfigId: log.logConfigId,
    logType: log.logType,
    logStatus: logStatusToApiValue(log.logStatus),
    drillingDate: log.drillingDate || undefined,
    drillingTime: log.drillingTime.trim() || undefined,
    finishLogDate: log.finishLogDate || undefined,
    finishLogTime: log.finishLogTime.trim() || undefined,
    endDepth: log.endDepth.trim() || undefined,
    finishingReason: log.finishingReason.trim() || undefined,
    finishingComment: log.finishingComment.trim() || undefined,
    coordinateSystem: log.coordinateSystem.trim() || undefined,
    latitude: log.latitude.trim() || undefined,
    longitude: log.longitude.trim() || undefined,
    easting: log.easting.trim() || undefined,
    northing: log.northing.trim() || undefined,
    utmZone: log.utmZone.trim() || undefined,
    elevation: log.elevation.trim() || undefined,
    station: log.station.trim() || undefined,
    locationComment: log.locationComment.trim() || undefined,
    supplierId: supplierId ? Number(supplierId) : null,
    equipmentId: equipmentId ? Number(equipmentId) : null,
    loggedBy: log.loggedBy.trim() || undefined,
    reviewedBy: log.reviewedBy.trim() || undefined,
    inclination: log.inclination.trim() || undefined,
    azimuth: log.azimuth.trim() || undefined,
    generalComments: log.generalComments.trim() || undefined,
  };
}

export function createCopyLogPayload(log: Log, existingLogNumbers: string[]): LogPayload {
  const existingNumbers = new Set(existingLogNumbers);
  const logNumber = buildCopyLogNumber(log.logNumber, existingNumbers);
  return logToCopyPayload(log, logNumber);
}

export function formToLogPayload(form: LogFormState): LogPayload {
  const proposedBorelogId = form.proposedBorelogId.trim();
  const supplierId = form.supplierId.trim();
  const equipmentId = form.equipmentId.trim();

  return {
    proposedBorelogId: proposedBorelogId ? Number(proposedBorelogId) : null,
    logNumber: form.logNumber.trim(),
    logConfigId: form.logConfigId.trim(),
    logType: logTypeToApiValue(form.logType),
    logStatus: logStatusToApiValue(form.logStatus),
    drillingDate: form.drillingDate || undefined,
    drillingTime: form.drillingTime.trim() || undefined,
    finishLogDate: form.finishLogDate || undefined,
    finishLogTime: form.finishLogTime.trim() || undefined,
    endDepth: form.endDepth.trim() || undefined,
    finishingReason: form.finishingReason.trim() || undefined,
    finishingComment: form.finishingComment.trim() || undefined,
    coordinateSystem: form.coordinateSystem.trim() || undefined,
    latitude: form.latitude.trim() || undefined,
    longitude: form.longitude.trim() || undefined,
    easting: form.easting.trim() || undefined,
    northing: form.northing.trim() || undefined,
    utmZone: form.utmZone.trim() || undefined,
    elevation: form.elevation.trim() || undefined,
    station: form.station.trim() || undefined,
    locationComment: form.locationComment.trim() || undefined,
    supplierId: supplierId ? Number(supplierId) : null,
    equipmentId: equipmentId ? Number(equipmentId) : null,
    loggedBy: form.loggedBy.trim() || undefined,
    reviewedBy: form.reviewedBy.trim() || undefined,
    inclination: form.inclination.trim() || undefined,
    azimuth: form.azimuth.trim() || undefined,
    generalComments: form.generalComments.trim() || undefined,
  };
}
