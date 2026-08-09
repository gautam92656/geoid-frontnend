export const SUPER_ADMIN_BASE_PATH = "/super-admin";
export const SUPER_ADMIN_USERS_PATH = `${SUPER_ADMIN_BASE_PATH}/users`;
export const SUPER_ADMIN_LOG_CONFIGURATIONS_PATH = `${SUPER_ADMIN_BASE_PATH}/log-configurations`;

export function superAdminSectionPath(section: "users" | "log-configurations"): string {
  return `${SUPER_ADMIN_BASE_PATH}/${section}`;
}

export function superAdminLogConfigurationDetailPath(
  configurationId: string,
  ownerUserId?: number
): string {
  const path = `${SUPER_ADMIN_LOG_CONFIGURATIONS_PATH}/${configurationId}`;
  if (ownerUserId == null) return path;
  return `${path}?userId=${ownerUserId}`;
}

export function superAdminLogConfigurationsPath(ownerUserId?: number): string {
  if (ownerUserId == null) return SUPER_ADMIN_LOG_CONFIGURATIONS_PATH;
  return `${SUPER_ADMIN_LOG_CONFIGURATIONS_PATH}?userId=${ownerUserId}`;
}
