import { DEFAULT_COORDINATE_SYSTEM } from "../data/coordinateSystems";
import type { Project, ProjectPayload } from "../types/project";
import {
  PROJECT_ADDRESS_MAX_LENGTH,
  PROJECT_COORDINATE_VALUE_MAX_LENGTH,
  PROJECT_LOG_CONFIG_ID_MAX_LENGTH,
  PROJECT_NAME_MAX_LENGTH,
  PROJECT_NO_MAX_LENGTH,
} from "./projectFormUtils";
import { isEmptyTrimmed, requiredFieldMessage } from "@/shared/utils/formValidation";

export type ProjectDetailsFormState = {
  projectNumber: string;
  projectName: string;
  location: string;
  equipmentSupplier: string;
  equipment: string;
  logConfigId: string;
  coordinateSystem: string;
  utmZone: string;
  latitude: string;
  longitude: string;
  easting: string;
  northing: string;
  client: string;
  office: string;
  serviceArea: string;
  laboratory: string;
};

export type ProjectDetailsFormErrors = Partial<
  Record<
    | "projectNumber"
    | "projectName"
    | "location"
    | "logConfigId"
    | "latitude"
    | "longitude"
    | "client",
    string
  >
>;

function isValidCoordinateNumber(value: string): boolean {
  const parsed = Number(value);
  return Number.isFinite(parsed);
}

export function projectToDetailsFormState(project: Project): ProjectDetailsFormState {
  return {
    projectNumber: project.projectNo,
    projectName: project.name,
    location: project.location || project.address,
    equipmentSupplier: "GEOID",
    equipment: "Drillman GT10",
    logConfigId: project.logConfigId,
    coordinateSystem: project.coordinateSystem || DEFAULT_COORDINATE_SYSTEM,
    utmZone: project.utmZone,
    latitude: project.latitude,
    longitude: project.longitude,
    easting: project.easting,
    northing: project.northing,
    client: project.clientId ? String(project.clientId) : "",
    office: project.office,
    serviceArea: "",
    laboratory: "",
  };
}

export function projectDetailsFormToPayload(
  form: ProjectDetailsFormState
): Partial<ProjectPayload> {
  const clientId = Number(form.client.trim());

  return {
    projectNo: form.projectNumber.trim(),
    name: form.projectName.trim(),
    address: form.location.trim(),
    logConfigId: form.logConfigId.trim(),
    clientId,
    office: form.office.trim() || undefined,
    coordinateSystem: form.coordinateSystem.trim() || undefined,
    latitude: form.latitude.trim(),
    longitude: form.longitude.trim(),
    easting: form.easting.trim() || undefined,
    northing: form.northing.trim() || undefined,
    utmZone: form.utmZone.trim() || undefined,
  };
}

export function validateProjectDetailsForm(
  form: ProjectDetailsFormState,
  existingProjectNos: readonly string[] = [],
  currentProjectNo?: string,
  options: {
    coordinatesRequired?: boolean;
    allowDuplicateProjectNumbers?: boolean;
  } = {}
): ProjectDetailsFormErrors {
  const errors: ProjectDetailsFormErrors = {};
  const coordinatesRequired = options.coordinatesRequired ?? true;
  const allowDuplicateProjectNumbers = options.allowDuplicateProjectNumbers ?? false;

  const trimmedProjectNumber = form.projectNumber.trim();
  const trimmedProjectName = form.projectName.trim();
  const trimmedLocation = form.location.trim();
  const trimmedLogConfigId = form.logConfigId.trim();
  const trimmedClient = form.client.trim();
  const trimmedLatitude = form.latitude.trim();
  const trimmedLongitude = form.longitude.trim();

  if (isEmptyTrimmed(trimmedProjectNumber)) {
    errors.projectNumber = requiredFieldMessage("Project number");
  } else if (trimmedProjectNumber.length > PROJECT_NO_MAX_LENGTH) {
    errors.projectNumber = `Project number must be ${PROJECT_NO_MAX_LENGTH} characters or fewer.`;
  } else if (
    !allowDuplicateProjectNumbers &&
    existingProjectNos.some(
      (projectNo) =>
        projectNo.trim().toLowerCase() === trimmedProjectNumber.toLowerCase() &&
        projectNo.trim().toLowerCase() !== currentProjectNo?.trim().toLowerCase()
    )
  ) {
    errors.projectNumber = "A project with this project number already exists.";
  }

  if (isEmptyTrimmed(trimmedProjectName)) {
    errors.projectName = requiredFieldMessage("Project name");
  } else if (trimmedProjectName.length > PROJECT_NAME_MAX_LENGTH) {
    errors.projectName = `Project name must be ${PROJECT_NAME_MAX_LENGTH} characters or fewer.`;
  }

  if (isEmptyTrimmed(trimmedLocation)) {
    errors.location = requiredFieldMessage("Location");
  } else if (trimmedLocation.length > PROJECT_ADDRESS_MAX_LENGTH) {
    errors.location = `Location must be ${PROJECT_ADDRESS_MAX_LENGTH} characters or fewer.`;
  }

  if (isEmptyTrimmed(trimmedLogConfigId)) {
    errors.logConfigId = requiredFieldMessage("Log configuration");
  } else if (trimmedLogConfigId.length > PROJECT_LOG_CONFIG_ID_MAX_LENGTH) {
    errors.logConfigId = `Log configuration must be ${PROJECT_LOG_CONFIG_ID_MAX_LENGTH} characters or fewer.`;
  }

  if (isEmptyTrimmed(trimmedLatitude)) {
    if (coordinatesRequired) {
      errors.latitude = requiredFieldMessage("Latitude");
    }
  } else if (trimmedLatitude.length > PROJECT_COORDINATE_VALUE_MAX_LENGTH) {
    errors.latitude = `Latitude must be ${PROJECT_COORDINATE_VALUE_MAX_LENGTH} characters or fewer.`;
  } else if (!isValidCoordinateNumber(trimmedLatitude)) {
    errors.latitude = "Latitude must be a valid number.";
  }

  if (isEmptyTrimmed(trimmedLongitude)) {
    if (coordinatesRequired) {
      errors.longitude = requiredFieldMessage("Longitude");
    }
  } else if (trimmedLongitude.length > PROJECT_COORDINATE_VALUE_MAX_LENGTH) {
    errors.longitude = `Longitude must be ${PROJECT_COORDINATE_VALUE_MAX_LENGTH} characters or fewer.`;
  } else if (!isValidCoordinateNumber(trimmedLongitude)) {
    errors.longitude = "Longitude must be a valid number.";
  }

  if (isEmptyTrimmed(trimmedClient)) {
    errors.client = requiredFieldMessage("Client");
  } else {
    const clientId = Number(trimmedClient);
    if (!Number.isInteger(clientId) || clientId < 1) {
      errors.client = "Please select a valid client.";
    }
  }

  return errors;
}

export function mapProjectDetailsApiError(
  message: string
): { fieldErrors: ProjectDetailsFormErrors; toastMessage: string } {
  const fieldErrors: ProjectDetailsFormErrors = {};
  const normalized = message.toLowerCase();

  if (normalized.includes("project number")) {
    fieldErrors.projectNumber = "A project with this project number already exists.";
  }

  if (normalized.includes("client")) {
    fieldErrors.client = message;
  }

  if (normalized.includes("logconfigid") || normalized.includes("log configuration")) {
    fieldErrors.logConfigId = message;
  }

  if (normalized.includes("latitude")) {
    fieldErrors.latitude = message;
  }

  if (normalized.includes("longitude")) {
    fieldErrors.longitude = message;
  }

  if (normalized.includes("address") || normalized.includes("location")) {
    fieldErrors.location = message;
  }

  if (normalized.includes("name") && !normalized.includes("company")) {
    fieldErrors.projectName = message;
  }

  if (normalized.includes("projectno") || normalized.includes("project no")) {
    fieldErrors.projectNumber = message;
  }

  return { fieldErrors, toastMessage: message };
}
