import type { LogFormState } from "../types/log";
import { DEFAULT_LOG_COORDINATE_SYSTEM } from "../utils/logFormUtils";

export type ProjectLog = {
  id: string;
  name: string;
  type: string;
  endDepth: string;
  status: string;
  logConfigId: string;
  latitude: string;
  longitude: string;
  easting: string;
  northing: string;
  utmZone: string;
  elevation: string;
  station: string;
  coordinateSystem: string;
  finishingReason: string;
  supplierId: string;
  equipmentId: string;
  drillingDate: string;
  drillingTime: string;
  finishLogDate: string;
  finishLogTime: string;
  finishingComment: string;
  locationComment: string;
  generalComments: string;
  loggedBy: string;
  reviewedBy: string;
  inclination: string;
  azimuth: string;
};

export const INITIAL_PROJECT_LOGS: ProjectLog[] = [
  {
    id: "bh01",
    name: "BH01",
    type: "Borelog",
    endDepth: "1.6",
    status: "Field",
    logConfigId: "as1726-2017-rev2",
    latitude: "-28.539268",
    longitude: "153.554631",
    easting: "554259.294",
    northing: "6842932.325",
    utmZone: "56J",
    elevation: "",
    station: "",
    coordinateSystem: DEFAULT_LOG_COORDINATE_SYSTEM,
    finishingReason: "Refusal",
    supplierId: "2",
    equipmentId: "3",
    drillingDate: "",
    drillingTime: "",
    finishLogDate: "",
    finishLogTime: "",
    finishingComment: "",
    locationComment: "",
    generalComments: "",
    loggedBy: "",
    reviewedBy: "",
    inclination: "",
    azimuth: "",
  },
  {
    id: "bh02",
    name: "BH02",
    type: "Borelog",
    endDepth: "1.2",
    status: "Field",
    logConfigId: "as1726-2017-rev2",
    latitude: "-28.539400",
    longitude: "153.554800",
    easting: "",
    northing: "",
    utmZone: "56J",
    elevation: "",
    station: "",
    coordinateSystem: DEFAULT_LOG_COORDINATE_SYSTEM,
    finishingReason: "",
    supplierId: "",
    equipmentId: "",
    drillingDate: "",
    drillingTime: "",
    finishLogDate: "",
    finishLogTime: "",
    finishingComment: "",
    locationComment: "",
    generalComments: "",
    loggedBy: "",
    reviewedBy: "",
    inclination: "",
    azimuth: "",
  },
  {
    id: "bh03",
    name: "BH03",
    type: "Borelog",
    endDepth: "1.4",
    status: "Field",
    logConfigId: "as1726-2017-rev2",
    latitude: "-28.539100",
    longitude: "153.554400",
    easting: "",
    northing: "",
    utmZone: "56J",
    elevation: "",
    station: "",
    coordinateSystem: DEFAULT_LOG_COORDINATE_SYSTEM,
    finishingReason: "",
    supplierId: "",
    equipmentId: "",
    drillingDate: "",
    drillingTime: "",
    finishLogDate: "",
    finishLogTime: "",
    finishingComment: "",
    locationComment: "",
    generalComments: "",
    loggedBy: "",
    reviewedBy: "",
    inclination: "",
    azimuth: "",
  },
];

export function getProjectLogById(logId: string): ProjectLog | undefined {
  return INITIAL_PROJECT_LOGS.find((log) => log.id === logId);
}

export function resolveProjectLog(logId: string): ProjectLog {
  const existing = getProjectLogById(logId);
  if (existing) return existing;

  const name = logId.replace(/-/g, " ").replace(/\b\w/g, (char) => char.toUpperCase()) || "Log";

  return {
    id: logId,
    name,
    type: "Borelog",
    endDepth: "",
    status: "To do",
    logConfigId: "",
    latitude: "",
    longitude: "",
    easting: "",
    northing: "",
    utmZone: "",
    elevation: "",
    station: "",
    coordinateSystem: DEFAULT_LOG_COORDINATE_SYSTEM,
    finishingReason: "",
    supplierId: "",
    equipmentId: "",
    drillingDate: "",
    drillingTime: "",
    finishLogDate: "",
    finishLogTime: "",
    finishingComment: "",
    locationComment: "",
    generalComments: "",
    loggedBy: "",
    reviewedBy: "",
    inclination: "",
    azimuth: "",
  };
}

export function projectLogToFormState(log: ProjectLog, logTypeId: string): LogFormState {
  return {
    proposedBorelogId: "",
    logNumber: log.name,
    logConfigId: log.logConfigId,
    logType: logTypeId,
    logStatus: log.status,
    drillingDate: log.drillingDate,
    drillingTime: log.drillingTime,
    finishLogDate: log.finishLogDate,
    finishLogTime: log.finishLogTime,
    endDepth: log.endDepth === "—" ? "" : log.endDepth,
    finishingReason: log.finishingReason,
    finishingComment: log.finishingComment,
    coordinateSystem: log.coordinateSystem || DEFAULT_LOG_COORDINATE_SYSTEM,
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
