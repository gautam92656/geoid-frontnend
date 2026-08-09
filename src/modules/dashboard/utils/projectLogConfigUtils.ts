import { DEFAULT_COORDINATE_SYSTEM } from "../data/coordinateSystems";
import {
  DEFAULT_LOG_CONFIGURATION_SETTINGS,
  type LogConfiguration,
  type LogConfigurationCoordinateRequirement,
  type LogConfigurationCoordinateSystemUnit,
  type LogConfigurationDateFormat,
  type LogConfigurationElevationUnit,
} from "../types/logConfiguration";

export type LogConfigRuntimeSettings = {
  dateFormat: LogConfigurationDateFormat;
  coordinateSystem: string;
  coordinateSystemUnit: LogConfigurationCoordinateSystemUnit;
  elevationUnit: LogConfigurationElevationUnit;
  allowCoordinateSystemAtLog: boolean;
  allowCoordinateSystemAtProject: boolean;
  coordinateRequirement: LogConfigurationCoordinateRequirement;
  allowDuplicateProjectNumbers: boolean;
};

/** @deprecated Prefer LogConfigRuntimeSettings */
export type ProjectLogConfigSettings = LogConfigRuntimeSettings;

export function resolveLogConfigRuntimeSettings(
  logConfigId: string,
  logConfigurations: readonly LogConfiguration[]
): LogConfigRuntimeSettings {
  const config = logConfigurations.find((item) => item.id === logConfigId);
  const defaults = DEFAULT_LOG_CONFIGURATION_SETTINGS;

  return {
    dateFormat: config?.dateFormat ?? defaults.dateFormat,
    coordinateSystem:
      config?.coordinateSystem?.trim() ||
      defaults.coordinateSystem ||
      DEFAULT_COORDINATE_SYSTEM,
    coordinateSystemUnit: config?.coordinateSystemUnit ?? defaults.coordinateSystemUnit,
    elevationUnit: config?.elevationUnit ?? defaults.elevationUnit,
    allowCoordinateSystemAtLog:
      config?.allowCoordinateSystemAtLog ?? defaults.allowCoordinateSystemAtLog,
    allowCoordinateSystemAtProject:
      config?.allowCoordinateSystemAtProject ?? defaults.allowCoordinateSystemAtProject,
    coordinateRequirement: config?.coordinateRequirement ?? defaults.coordinateRequirement,
    allowDuplicateProjectNumbers:
      config?.allowDuplicateProjectNumbers ?? defaults.allowDuplicateProjectNumbers,
  };
}

/** @deprecated Prefer resolveLogConfigRuntimeSettings */
export function resolveProjectLogConfigSettings(
  logConfigId: string,
  logConfigurations: readonly LogConfiguration[]
): ProjectLogConfigSettings {
  return resolveLogConfigRuntimeSettings(logConfigId, logConfigurations);
}

export function coordinateUnitLabel(
  unit: LogConfigurationCoordinateSystemUnit | LogConfigurationElevationUnit
): string {
  return unit === "feet" ? "ft" : "m";
}

export function areCoordinatesRequired(
  settings: Pick<LogConfigRuntimeSettings, "coordinateRequirement">
): boolean {
  return settings.coordinateRequirement === "required";
}

/** @deprecated Prefer areCoordinatesRequired */
export function areProjectCoordinatesRequired(
  settings: Pick<LogConfigRuntimeSettings, "coordinateRequirement">
): boolean {
  return areCoordinatesRequired(settings);
}
