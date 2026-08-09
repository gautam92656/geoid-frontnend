import {
  DEFAULT_LOG_STATUS,
  FINISHING_REASONS,
  LOG_CREATION_STATUSES,
  LOG_TYPES,
  LOG_WORKFLOW_STATUSES,
} from "../data/logOptions";
import type { LogFormState } from "../types/log";

const ALLOWED_LOG_STATUSES = new Set<string>([
  ...LOG_CREATION_STATUSES,
  ...LOG_WORKFLOW_STATUSES,
]);

export const LOG_NUMBER_MAX_LENGTH = 50;
export const LOG_CONFIG_ID_MAX_LENGTH = 100;
export const LOG_COORDINATE_VALUE_MAX_LENGTH = 50;
export const LOG_END_DEPTH_MAX_LENGTH = 50;
export const LOG_ELEVATION_MAX_LENGTH = 50;
export const LOG_STATION_MAX_LENGTH = 100;
export const LOG_PERSON_NAME_MAX_LENGTH = 200;
export const LOG_ANGLE_MAX_LENGTH = 50;
export const LOG_TIME_MAX_LENGTH = 10;

export type LogFormErrors = Partial<Record<keyof LogFormState, string>>;

export const DEFAULT_LOG_COORDINATE_SYSTEM = "easting-northing";

const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

const LOG_TYPE_ID_TO_API: Record<string, string> = {
  borelog: "borelog",
  "test-pit": "test_pit",
  probe: "probe",
  "monitoring-well": "monitoring_well",
  "inclined-borehole": "inclined_borehole",
};

const LOG_TYPE_API_TO_ID: Record<string, string> = {
  borelog: "borelog",
  test_pit: "test-pit",
  probe: "probe",
  monitoring_well: "monitoring-well",
  inclined_borehole: "inclined-borehole",
};

const LOG_STATUS_LABEL_TO_API: Record<string, string> = {
  "To do": "to_do",
  "In progress": "in_progress",
  Field: "field",
  Lab: "lab",
  Completed: "completed",
  Preliminary: "preliminary",
  Draft: "draft",
  Final: "final",
  "In Active": "in_active",
};

function isValidCoordinateNumber(value: string): boolean {
  const parsed = Number(value);
  return Number.isFinite(parsed);
}

export function logTypeToApiValue(logType: string): string {
  return LOG_TYPE_ID_TO_API[logType] ?? logType;
}

export function logTypeFromApiValue(logType: string): string {
  return LOG_TYPE_API_TO_ID[logType] ?? logType;
}

export function logStatusToApiValue(status: string): string {
  return LOG_STATUS_LABEL_TO_API[status] ?? status;
}

export function getSelectedLogType(logTypeId: string) {
  return LOG_TYPES.find((type) => type.id === logTypeId) ?? null;
}

export function showEastingNorthingFields(coordinateSystem: string) {
  return coordinateSystem !== "latlong";
}

export function showStationField(coordinateSystem: string) {
  return coordinateSystem !== "latlong";
}

export function showLogNumberField(_proposedBorelogId?: string) {
  return true;
}

export function showInclinationFields(logTypeId: string) {
  return getSelectedLogType(logTypeId)?.supportsInclination ?? false;
}

export function validateLogForm(
  form: LogFormState,
  existingLogNumbers: readonly string[] = [],
  options: {
    coordinatesRequired?: boolean;
  } = {}
): LogFormErrors {
  const errors: LogFormErrors = {};
  const coordinatesRequired = options.coordinatesRequired ?? false;

  const trimmedLogNumber = form.logNumber.trim();
  const trimmedLogConfigId = form.logConfigId.trim();
  const trimmedLogType = form.logType.trim();
  const trimmedLogStatus = form.logStatus.trim();
  const trimmedLatitude = form.latitude.trim();
  const trimmedLongitude = form.longitude.trim();
  const trimmedSupplierId = form.supplierId.trim();
  const trimmedEquipmentId = form.equipmentId.trim();
  const trimmedFinishingReason = form.finishingReason.trim();

  if (!trimmedLogNumber) {
    errors.logNumber = "Log number is required.";
  } else if (trimmedLogNumber.length > LOG_NUMBER_MAX_LENGTH) {
    errors.logNumber = `Log number must be ${LOG_NUMBER_MAX_LENGTH} characters or fewer.`;
  } else if (
    existingLogNumbers.some(
      (logNumber) => logNumber.trim().toLowerCase() === trimmedLogNumber.toLowerCase()
    )
  ) {
    errors.logNumber = "A log with this log number already exists.";
  }

  if (trimmedLogConfigId && trimmedLogConfigId.length > LOG_CONFIG_ID_MAX_LENGTH) {
    errors.logConfigId = `Log configuration must be ${LOG_CONFIG_ID_MAX_LENGTH} characters or fewer.`;
  }

  if (!trimmedLogType) {
    errors.logType = "Log type is required.";
  } else if (!LOG_TYPES.some((type) => type.id === trimmedLogType)) {
    errors.logType = "Please select a valid log type.";
  }

  if (trimmedLogStatus && !ALLOWED_LOG_STATUSES.has(trimmedLogStatus)) {
    errors.logStatus = "Please select a valid log status.";
  }

  if (!trimmedLatitude) {
    if (coordinatesRequired) {
      errors.latitude = "Latitude is required.";
    }
  } else if (trimmedLatitude.length > LOG_COORDINATE_VALUE_MAX_LENGTH) {
    errors.latitude = `Latitude must be ${LOG_COORDINATE_VALUE_MAX_LENGTH} characters or fewer.`;
  } else if (!isValidCoordinateNumber(trimmedLatitude)) {
    errors.latitude = "Latitude must be a valid number.";
  }

  if (!trimmedLongitude) {
    if (coordinatesRequired) {
      errors.longitude = "Longitude is required.";
    }
  } else if (trimmedLongitude.length > LOG_COORDINATE_VALUE_MAX_LENGTH) {
    errors.longitude = `Longitude must be ${LOG_COORDINATE_VALUE_MAX_LENGTH} characters or fewer.`;
  } else if (!isValidCoordinateNumber(trimmedLongitude)) {
    errors.longitude = "Longitude must be a valid number.";
  }

  if (form.drillingDate && !ISO_DATE_PATTERN.test(form.drillingDate)) {
    errors.drillingDate = "Drilling date must be a valid date.";
  }

  if (form.finishLogDate && !ISO_DATE_PATTERN.test(form.finishLogDate)) {
    errors.finishLogDate = "Finish log date must be a valid date.";
  }

  if (
    form.drillingDate &&
    form.finishLogDate &&
    ISO_DATE_PATTERN.test(form.drillingDate) &&
    ISO_DATE_PATTERN.test(form.finishLogDate) &&
    form.finishLogDate < form.drillingDate
  ) {
    errors.finishLogDate = "Finish log date must be on or after the drilling date.";
  }

  if (form.drillingTime.trim() && form.drillingTime.trim().length > LOG_TIME_MAX_LENGTH) {
    errors.drillingTime = `Drilling time must be ${LOG_TIME_MAX_LENGTH} characters or fewer.`;
  }

  if (form.finishLogTime.trim() && form.finishLogTime.trim().length > LOG_TIME_MAX_LENGTH) {
    errors.finishLogTime = `Finish log time must be ${LOG_TIME_MAX_LENGTH} characters or fewer.`;
  }

  if (trimmedFinishingReason && !(FINISHING_REASONS as readonly string[]).includes(trimmedFinishingReason)) {
    errors.finishingReason = "Please select a valid finishing reason.";
  }

  if (trimmedSupplierId) {
    const supplierId = Number(trimmedSupplierId);
    if (!Number.isInteger(supplierId) || supplierId < 1) {
      errors.supplierId = "Please select a valid supplier.";
    }
  }

  if (trimmedEquipmentId) {
    const equipmentId = Number(trimmedEquipmentId);
    if (!Number.isInteger(equipmentId) || equipmentId < 1) {
      errors.equipmentId = "Please select valid equipment.";
    }
  }

  if (form.proposedBorelogId.trim()) {
    const proposedBorelogId = Number(form.proposedBorelogId.trim());
    if (!Number.isInteger(proposedBorelogId) || proposedBorelogId < 1) {
      errors.proposedBorelogId = "Please select a valid proposed borelog.";
    }
  }

  if (form.endDepth.trim() && form.endDepth.trim().length > LOG_END_DEPTH_MAX_LENGTH) {
    errors.endDepth = `End depth must be ${LOG_END_DEPTH_MAX_LENGTH} characters or fewer.`;
  }

  if (form.elevation.trim() && form.elevation.trim().length > LOG_ELEVATION_MAX_LENGTH) {
    errors.elevation = `Elevation must be ${LOG_ELEVATION_MAX_LENGTH} characters or fewer.`;
  }

  if (form.station.trim() && form.station.trim().length > LOG_STATION_MAX_LENGTH) {
    errors.station = `Station must be ${LOG_STATION_MAX_LENGTH} characters or fewer.`;
  }

  const trimmedLoggedBy = form.loggedBy.trim();
  const trimmedReviewedBy = form.reviewedBy.trim();

  if (trimmedLoggedBy && trimmedLoggedBy.length > LOG_PERSON_NAME_MAX_LENGTH) {
    errors.loggedBy = `Logged by must be ${LOG_PERSON_NAME_MAX_LENGTH} characters or fewer.`;
  }

  if (trimmedReviewedBy && trimmedReviewedBy.length > LOG_PERSON_NAME_MAX_LENGTH) {
    errors.reviewedBy = `Reviewed by must be ${LOG_PERSON_NAME_MAX_LENGTH} characters or fewer.`;
  }

  if (form.inclination.trim() && form.inclination.trim().length > LOG_ANGLE_MAX_LENGTH) {
    errors.inclination = `Inclination must be ${LOG_ANGLE_MAX_LENGTH} characters or fewer.`;
  }

  if (form.azimuth.trim() && form.azimuth.trim().length > LOG_ANGLE_MAX_LENGTH) {
    errors.azimuth = `Azimuth must be ${LOG_ANGLE_MAX_LENGTH} characters or fewer.`;
  }

  return errors;
}

export function canSubmitLogForm(
  form: LogFormState,
  existingLogNumbers: readonly string[] = [],
  options: {
    coordinatesRequired?: boolean;
  } = {}
) {
  return Object.keys(validateLogForm(form, existingLogNumbers, options)).length === 0;
}

export function createEmptyLogForm(
  defaultLogConfigId = "",
  coordinateSystem = DEFAULT_LOG_COORDINATE_SYSTEM
): LogFormState {
  return {
    proposedBorelogId: "",
    logNumber: "",
    logConfigId: defaultLogConfigId,
    logType: "",
    logStatus: "To do",
    drillingDate: "",
    drillingTime: "",
    finishLogDate: "",
    finishLogTime: "",
    endDepth: "",
    finishingReason: "",
    finishingComment: "",
    coordinateSystem,
    latitude: "",
    longitude: "",
    easting: "",
    northing: "",
    utmZone: "",
    elevation: "",
    station: "",
    locationComment: "",
    supplierId: "",
    equipmentId: "",
    loggedBy: "",
    reviewedBy: "",
    inclination: "",
    azimuth: "",
    generalComments: "",
  };
}

export function prepareLogFormForSubmit(
  form: LogFormState,
  options: {
    defaultLogConfigId?: string;
    logConfigurations: readonly { id: string; status?: string }[];
  }
): LogFormState {
  const trimmedLogConfigId = form.logConfigId.trim();

  return {
    ...form,
    logConfigId: trimmedLogConfigId
      ? trimmedLogConfigId
      : resolveDefaultLogConfigId(options.defaultLogConfigId ?? "", options.logConfigurations),
    logStatus: form.logStatus.trim() || DEFAULT_LOG_STATUS,
  };
}

export function resolveDefaultLogConfigId(
  projectLogConfigId: string,
  logConfigurations: readonly { id: string; status?: string }[]
): string {
  const trimmedProjectConfig = projectLogConfigId.trim();
  if (
    trimmedProjectConfig &&
    logConfigurations.some((config) => config.id === trimmedProjectConfig)
  ) {
    return trimmedProjectConfig;
  }

  return logConfigurations.find((config) => config.status === "active")?.id ?? logConfigurations[0]?.id ?? "";
}
