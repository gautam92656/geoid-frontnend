export type LogFormState = {
  proposedBorelogId: string;
  logNumber: string;
  logConfigId: string;
  logType: string;
  logStatus: string;
  drillingDate: string;
  drillingTime: string;
  finishLogDate: string;
  finishLogTime: string;
  endDepth: string;
  finishingReason: string;
  finishingComment: string;
  coordinateSystem: string;
  latitude: string;
  longitude: string;
  easting: string;
  northing: string;
  utmZone: string;
  elevation: string;
  station: string;
  locationComment: string;
  supplierId: string;
  equipmentId: string;
  loggedBy: string;
  reviewedBy: string;
  inclination: string;
  azimuth: string;
  generalComments: string;
};

export type Log = {
  id: number;
  projectId: number;
  proposedBorelogId: string;
  logNumber: string;
  logConfigId: string;
  logType: string;
  logTypeLabel: string;
  logStatus: string;
  drillingDate: string;
  drillingTime: string;
  finishLogDate: string;
  finishLogTime: string;
  endDepth: string;
  finishingReason: string;
  finishingComment: string;
  coordinateSystem: string;
  latitude: string;
  longitude: string;
  easting: string;
  northing: string;
  utmZone: string;
  elevation: string;
  station: string;
  locationComment: string;
  supplierId: string;
  equipmentId: string;
  loggedBy: string;
  reviewedBy: string;
  inclination: string;
  azimuth: string;
  generalComments: string;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
};

export type LogPayload = {
  proposedBorelogId?: number | null;
  logNumber: string;
  logConfigId: string;
  logType: string;
  logStatus?: string;
  drillingDate?: string;
  drillingTime?: string;
  finishLogDate?: string;
  finishLogTime?: string;
  endDepth?: string;
  finishingReason?: string;
  finishingComment?: string;
  coordinateSystem?: string;
  latitude?: string;
  longitude?: string;
  easting?: string;
  northing?: string;
  utmZone?: string;
  elevation?: string;
  station?: string;
  locationComment?: string;
  supplierId?: number | null;
  equipmentId?: number | null;
  loggedBy?: string;
  reviewedBy?: string;
  inclination?: string;
  azimuth?: string;
  generalComments?: string;
};

export type PaginatedLogs = {
  data: Log[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

export type ProposedBorelogOption = Readonly<{
  id: string;
  displayName: string;
  logNumber: string;
  latitude: string;
  longitude: string;
}>;

export type LogTypeOption = Readonly<{
  id: string;
  name: string;
  supportsInclination: boolean;
}>;

import { logTypeFromApiValue } from "../utils/logFormUtils";

export function logToFormState(log: Log): LogFormState {
  return {
    proposedBorelogId: log.proposedBorelogId,
    logNumber: log.logNumber,
    logConfigId: log.logConfigId,
    logType: logTypeFromApiValue(log.logType),
    logStatus: log.logStatus,
    drillingDate: log.drillingDate,
    drillingTime: log.drillingTime,
    finishLogDate: log.finishLogDate,
    finishLogTime: log.finishLogTime,
    endDepth: log.endDepth,
    finishingReason: log.finishingReason,
    finishingComment: log.finishingComment,
    coordinateSystem: log.coordinateSystem,
    latitude: log.latitude,
    longitude: log.longitude,
    easting: log.easting,
    northing: log.northing,
    utmZone: log.utmZone,
    elevation: log.elevation,
    station: log.station,
    locationComment: log.locationComment,
    supplierId: log.supplierId,
    equipmentId: log.equipmentId,
    loggedBy: log.loggedBy,
    reviewedBy: log.reviewedBy,
    inclination: log.inclination,
    azimuth: log.azimuth,
    generalComments: log.generalComments,
  };
}
