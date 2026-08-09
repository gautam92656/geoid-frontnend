import { COORDINATE_SYSTEMS } from "./coordinateSystems";
import type {
  LogConfigurationCoordinateRequirement,
  LogConfigurationCoordinateSystemUnit,
  LogConfigurationDateFormat,
  LogConfigurationElevationUnit,
  LogConfigurationMeasurementSystem,
} from "../types/logConfiguration";

export const LOG_CONFIGURATION_COORDINATE_SYSTEM_OPTIONS = COORDINATE_SYSTEMS.map((system) => ({
  value: system.value,
  label: system.label,
}));

export const LOG_CONFIGURATION_COORDINATE_SYSTEM_UNIT_OPTIONS: readonly {
  value: LogConfigurationCoordinateSystemUnit;
  label: string;
}[] = [
  { value: "meters", label: "Meters" },
  { value: "feet", label: "Feet" },
];

export const LOG_CONFIGURATION_COORDINATE_REQUIREMENT_OPTIONS: readonly {
  value: LogConfigurationCoordinateRequirement;
  label: string;
}[] = [
  { value: "can-be-null", label: "Can be Null" },
  { value: "required", label: "Required" },
];

export const LOG_CONFIGURATION_MEASUREMENT_SYSTEM_OPTIONS: readonly {
  value: LogConfigurationMeasurementSystem;
  label: string;
}[] = [
  { value: "metric", label: "Metric" },
  { value: "imperial", label: "Imperial" },
];

export const LOG_CONFIGURATION_DATE_FORMAT_OPTIONS: readonly {
  value: LogConfigurationDateFormat;
  label: string;
}[] = [
  { value: "DD/MM/YYYY", label: "DD/MM/YYYY" },
  { value: "MM/DD/YYYY", label: "MM/DD/YYYY" },
  { value: "YYYY-MM-DD", label: "YYYY-MM-DD" },
];

export const LOG_CONFIGURATION_ELEVATION_UNIT_OPTIONS: readonly {
  value: LogConfigurationElevationUnit;
  label: string;
}[] = [
  { value: "meters", label: "Meters" },
  { value: "feet", label: "Feet" },
];
