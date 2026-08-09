import {
  DEFAULT_PROJECT_DETAIL_FIELDS_SETTINGS,
  parseProjectDetailFieldsSettings,
  type ProjectDetailFieldsSettings,
} from "../utils/projectDetailFieldsUtils";
import {
  DEFAULT_LOG_DETAIL_FIELDS_SETTINGS,
  parseLogDetailFieldsSettings,
  type LogDetailFieldsSettings,
} from "../utils/logDetailFieldsUtils";
import { parseEnabledModuleIds } from "../data/configModules";
import {
  DEFAULT_WORKFLOW_SETTINGS,
  parseConfigModuleSettings,
  type ConfigModuleSettings,
} from "../utils/configModuleSettings";

export type LogConfigurationStatus = "active" | "inactive";

export type LogConfigurationCoordinateRequirement = "can-be-null" | "required";

export type LogConfigurationCoordinateSystemUnit = "meters" | "feet";

export type LogConfigurationMeasurementSystem = "metric" | "imperial";

export type LogConfigurationDateFormat = "DD/MM/YYYY" | "MM/DD/YYYY" | "YYYY-MM-DD";

export type LogConfigurationElevationUnit = "meters" | "feet";

export type LogConfigurationSettings = {
  description: string;
  coordinateSystem: string;
  coordinateSystemUnit: LogConfigurationCoordinateSystemUnit;
  allowCoordinateSystemAtLog: boolean;
  allowCoordinateSystemAtProject: boolean;
  autoElevation: boolean;
  coordinateRequirement: LogConfigurationCoordinateRequirement;
  allowDuplicateProjectNumbers: boolean;
  measurementSystem: LogConfigurationMeasurementSystem;
  dateFormat: LogConfigurationDateFormat;
  elevationUnit: LogConfigurationElevationUnit;
  projectDetailFields: ProjectDetailFieldsSettings;
  logDetailFields: LogDetailFieldsSettings;
  enabledModules: string[];
  moduleSettings: ConfigModuleSettings;
};

export type LogConfiguration = LogConfigurationSettings & {
  id: string;
  name: string;
  status: LogConfigurationStatus;
  templateSlug?: string | null;
  createdAt?: string;
  updatedAt?: string;
  deletedAt?: string | null;
  enabledModules?: string[];
  moduleSettings?: ConfigModuleSettings;
};

export type LogConfigurationFormState = {
  name: string;
  status: LogConfigurationStatus;
} & LogConfigurationSettings;

export type PaginatedLogConfigurations = {
  data: LogConfiguration[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

export const DEFAULT_LOG_CONFIGURATION_SETTINGS: LogConfigurationSettings = {
  description: "",
  coordinateSystem: "easting-northing",
  coordinateSystemUnit: "meters",
  allowCoordinateSystemAtLog: true,
  allowCoordinateSystemAtProject: true,
  autoElevation: true,
  coordinateRequirement: "can-be-null",
  allowDuplicateProjectNumbers: false,
  measurementSystem: "metric",
  dateFormat: "DD/MM/YYYY",
  elevationUnit: "meters",
  projectDetailFields: DEFAULT_PROJECT_DETAIL_FIELDS_SETTINGS,
  logDetailFields: DEFAULT_LOG_DETAIL_FIELDS_SETTINGS,
  enabledModules: [],
  moduleSettings: {
    order: [],
    modules: {},
    workflow: {
      enabled: DEFAULT_WORKFLOW_SETTINGS.enabled,
      name: DEFAULT_WORKFLOW_SETTINGS.name,
      ignoreParentLegacySettings: DEFAULT_WORKFLOW_SETTINGS.ignoreParentLegacySettings,
      steps: DEFAULT_WORKFLOW_SETTINGS.steps.map((step) => ({
        ...step,
        options: step.options?.map((option) => ({ ...option })),
        conditions: step.conditions?.map((condition) => ({ ...condition })),
      })),
      applyClassificationRules: DEFAULT_WORKFLOW_SETTINGS.applyClassificationRules,
      classificationCodes: DEFAULT_WORKFLOW_SETTINGS.classificationCodes.map((code) => ({
        ...code,
      })),
    },
  },
};

export function toLogConfigurationFormState(
  configuration: LogConfiguration
): LogConfigurationFormState {
  return {
    name: configuration.name,
    status: configuration.status,
    description: configuration.description ?? "",
    coordinateSystem: configuration.coordinateSystem ?? DEFAULT_LOG_CONFIGURATION_SETTINGS.coordinateSystem,
    coordinateSystemUnit:
      configuration.coordinateSystemUnit ?? DEFAULT_LOG_CONFIGURATION_SETTINGS.coordinateSystemUnit,
    allowCoordinateSystemAtLog:
      configuration.allowCoordinateSystemAtLog ??
      DEFAULT_LOG_CONFIGURATION_SETTINGS.allowCoordinateSystemAtLog,
    allowCoordinateSystemAtProject:
      configuration.allowCoordinateSystemAtProject ??
      DEFAULT_LOG_CONFIGURATION_SETTINGS.allowCoordinateSystemAtProject,
    autoElevation: configuration.autoElevation ?? DEFAULT_LOG_CONFIGURATION_SETTINGS.autoElevation,
    coordinateRequirement:
      configuration.coordinateRequirement ?? DEFAULT_LOG_CONFIGURATION_SETTINGS.coordinateRequirement,
    allowDuplicateProjectNumbers:
      configuration.allowDuplicateProjectNumbers ??
      DEFAULT_LOG_CONFIGURATION_SETTINGS.allowDuplicateProjectNumbers,
    measurementSystem:
      configuration.measurementSystem ?? DEFAULT_LOG_CONFIGURATION_SETTINGS.measurementSystem,
    dateFormat: configuration.dateFormat ?? DEFAULT_LOG_CONFIGURATION_SETTINGS.dateFormat,
    elevationUnit: configuration.elevationUnit ?? DEFAULT_LOG_CONFIGURATION_SETTINGS.elevationUnit,
    projectDetailFields: parseProjectDetailFieldsSettings(configuration.projectDetailFields),
    logDetailFields: parseLogDetailFieldsSettings(configuration.logDetailFields),
    enabledModules: parseEnabledModuleIds(configuration.enabledModules),
    moduleSettings: parseConfigModuleSettings(
      configuration.moduleSettings,
      parseEnabledModuleIds(configuration.enabledModules)
    ),
  };
}
