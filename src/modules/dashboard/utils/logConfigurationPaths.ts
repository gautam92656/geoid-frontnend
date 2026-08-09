const DEFAULT_LOG_CONFIGURATION_BASE = "/dashboard/settings/log-configurations";

function withOwnerUserId(path: string, ownerUserId?: number): string {
  if (ownerUserId == null) return path;
  const separator = path.includes("?") ? "&" : "?";
  return `${path}${separator}userId=${ownerUserId}`;
}

export function logConfigurationDetailPath(
  configurationId: string,
  basePath: string = DEFAULT_LOG_CONFIGURATION_BASE,
  ownerUserId?: number
): string {
  return withOwnerUserId(`${basePath}/${configurationId}`, ownerUserId);
}

export function logConfigurationsListPath(
  basePath: string = DEFAULT_LOG_CONFIGURATION_BASE,
  ownerUserId?: number
): string {
  return withOwnerUserId(basePath, ownerUserId);
}
