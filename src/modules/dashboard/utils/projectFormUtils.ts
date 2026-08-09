import { DEFAULT_COORDINATE_SYSTEM } from "../data/coordinateSystems";
import {
  DEFAULT_PROJECT_STATUS,
  PROJECT_STATUSES,
  type ProjectStatus,
} from "../data/projectOptions";
import type { Project, ProjectFormState, ProjectPayload } from "../types/project";

export const PROJECT_NO_MAX_LENGTH = 50;
export const PROJECT_NAME_MAX_LENGTH = 200;
export const PROJECT_ADDRESS_MAX_LENGTH = 500;
export const PROJECT_LOG_CONFIG_ID_MAX_LENGTH = 100;
export const PROJECT_COORDINATE_VALUE_MAX_LENGTH = 50;

export type ProjectFormErrors = Partial<Record<keyof ProjectFormState, string>>;

const STATUS_LABEL_TO_VALUE: Record<string, string> = {
  Draft: "draft",
  "To do": "to_do",
  "In planning": "in_planning",
  Scheduled: "scheduled",
  "Onsite works": "onsite_works",
  "Onsite works completed": "onsite_works_completed",
  "Lab testing": "lab_testing",
  Reporting: "reporting",
  Complete: "complete",
};

const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function isValidCoordinateNumber(value: string): boolean {
  const parsed = Number(value);
  return Number.isFinite(parsed);
}

export function projectStatusToApiValue(status: string): string {
  return STATUS_LABEL_TO_VALUE[status] ?? status;
}

const COPY_PROJECT_NO_SUFFIX = " - copy";

export function buildCopyProjectNo(projectNo: string): string {
  const trimmed = projectNo.trim();
  const maxBaseLength = PROJECT_NO_MAX_LENGTH - COPY_PROJECT_NO_SUFFIX.length;
  const base = trimmed.slice(0, maxBaseLength);
  return `${base}${COPY_PROJECT_NO_SUFFIX}`;
}

export function projectToCopyPayload(project: Project): ProjectPayload | null {
  if (!project.clientId) return null;

  return {
    projectNo: buildCopyProjectNo(project.projectNo),
    name: project.name,
    address: project.address || project.location,
    status: projectStatusToApiValue(project.status),
    brief: project.brief || undefined,
    assignee: project.assignee || undefined,
    logConfigId: project.logConfigId,
    clientId: project.clientId,
    office: project.office || undefined,
    startDate: project.startDate || undefined,
    endDate: project.endDate || undefined,
    coordinateSystem: project.coordinateSystem || undefined,
    latitude: project.latitude,
    longitude: project.longitude,
    easting: project.easting || undefined,
    northing: project.northing || undefined,
    utmZone: project.utmZone || undefined,
  };
}

export function projectToForm(project: Project): ProjectFormState {
  const status = (PROJECT_STATUSES as readonly string[]).includes(project.status)
    ? project.status
    : DEFAULT_PROJECT_STATUS;

  return {
    projectAddress: project.address || project.location,
    projectNo: project.projectNo,
    projectName: project.name,
    projectStatus: status as ProjectStatus,
    logConfigId: project.logConfigId,
    client: project.clientId ? String(project.clientId) : "",
    office: project.office,
    startDate: project.startDate,
    endDate: project.endDate,
    coordinateSystem: project.coordinateSystem || DEFAULT_COORDINATE_SYSTEM,
    latitude: project.latitude,
    longitude: project.longitude,
    easting: project.easting,
    northing: project.northing,
    utmZone: project.utmZone,
  };
}

export function validateProjectForm(
  form: ProjectFormState,
  existingProjectNos: readonly string[] = [],
  excludeProjectNo?: string,
  options: {
    coordinatesRequired?: boolean;
    allowDuplicateProjectNumbers?: boolean;
  } = {}
): ProjectFormErrors {
  const errors: ProjectFormErrors = {};
  const coordinatesRequired = options.coordinatesRequired ?? true;
  const allowDuplicateProjectNumbers = options.allowDuplicateProjectNumbers ?? false;

  const trimmedAddress = form.projectAddress.trim();
  const trimmedProjectNo = form.projectNo.trim();
  const trimmedProjectName = form.projectName.trim();
  const trimmedLogConfigId = form.logConfigId.trim();
  const trimmedClient = form.client.trim();
  const trimmedLatitude = form.latitude.trim();
  const trimmedLongitude = form.longitude.trim();

  if (!trimmedAddress) {
    errors.projectAddress = "Project address is required.";
  } else if (trimmedAddress.length > PROJECT_ADDRESS_MAX_LENGTH) {
    errors.projectAddress = `Project address must be ${PROJECT_ADDRESS_MAX_LENGTH} characters or fewer.`;
  }

  if (!trimmedProjectNo) {
    errors.projectNo = "Project number is required.";
  } else if (trimmedProjectNo.length > PROJECT_NO_MAX_LENGTH) {
    errors.projectNo = `Project number must be ${PROJECT_NO_MAX_LENGTH} characters or fewer.`;
  } else if (
    !allowDuplicateProjectNumbers &&
    existingProjectNos.some(
      (projectNo) =>
        projectNo.trim().toLowerCase() === trimmedProjectNo.toLowerCase() &&
        projectNo.trim().toLowerCase() !== excludeProjectNo?.trim().toLowerCase()
    )
  ) {
    errors.projectNo = "A project with this project number already exists.";
  }

  if (!trimmedProjectName) {
    errors.projectName = "Project name is required.";
  } else if (trimmedProjectName.length > PROJECT_NAME_MAX_LENGTH) {
    errors.projectName = `Project name must be ${PROJECT_NAME_MAX_LENGTH} characters or fewer.`;
  }

  if (!form.projectStatus.trim()) {
    errors.projectStatus = "Project status is required.";
  } else if (!(PROJECT_STATUSES as readonly string[]).includes(form.projectStatus)) {
    errors.projectStatus = "Please select a valid project status.";
  }

  if (!trimmedLogConfigId) {
    errors.logConfigId = "Default log configuration is required.";
  } else if (trimmedLogConfigId.length > PROJECT_LOG_CONFIG_ID_MAX_LENGTH) {
    errors.logConfigId = `Log configuration must be ${PROJECT_LOG_CONFIG_ID_MAX_LENGTH} characters or fewer.`;
  }

  if (!trimmedClient) {
    errors.client = "Client is required.";
  } else {
    const clientId = Number(trimmedClient);
    if (!Number.isInteger(clientId) || clientId < 1) {
      errors.client = "Please select a valid client.";
    }
  }

  if (!trimmedLatitude) {
    if (coordinatesRequired) {
      errors.latitude = "Latitude is required.";
    }
  } else if (trimmedLatitude.length > PROJECT_COORDINATE_VALUE_MAX_LENGTH) {
    errors.latitude = `Latitude must be ${PROJECT_COORDINATE_VALUE_MAX_LENGTH} characters or fewer.`;
  } else if (!isValidCoordinateNumber(trimmedLatitude)) {
    errors.latitude = "Latitude must be a valid number.";
  }

  if (!trimmedLongitude) {
    if (coordinatesRequired) {
      errors.longitude = "Longitude is required.";
    }
  } else if (trimmedLongitude.length > PROJECT_COORDINATE_VALUE_MAX_LENGTH) {
    errors.longitude = `Longitude must be ${PROJECT_COORDINATE_VALUE_MAX_LENGTH} characters or fewer.`;
  } else if (!isValidCoordinateNumber(trimmedLongitude)) {
    errors.longitude = "Longitude must be a valid number.";
  }

  if (form.startDate && !ISO_DATE_PATTERN.test(form.startDate)) {
    errors.startDate = "Start date must be a valid date.";
  }

  if (form.endDate && !ISO_DATE_PATTERN.test(form.endDate)) {
    errors.endDate = "End date must be a valid date.";
  }

  if (
    form.startDate &&
    form.endDate &&
    ISO_DATE_PATTERN.test(form.startDate) &&
    ISO_DATE_PATTERN.test(form.endDate) &&
    form.endDate < form.startDate
  ) {
    errors.endDate = "End date must be on or after the start date.";
  }

  return errors;
}
