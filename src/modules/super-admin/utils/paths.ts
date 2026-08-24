export const SUPER_ADMIN_BASE_PATH = "/super-admin";
export const SUPER_ADMIN_USERS_PATH = `${SUPER_ADMIN_BASE_PATH}/users`;
export const SUPER_ADMIN_LOG_CONFIGURATIONS_PATH = `${SUPER_ADMIN_BASE_PATH}/log-configurations`;
export const SUPER_ADMIN_LOG_TEMPLATES_PATH = `${SUPER_ADMIN_BASE_PATH}/log-templates`;

export function superAdminSectionPath(
  section: "users" | "log-configurations" | "log-templates"
): string {
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

export function superAdminLogTemplatesPath(
  ownerUserId?: number,
  tab: "log-report" | "header-footer" = "log-report"
): string {
  const params = new URLSearchParams();
  if (ownerUserId != null) params.set("userId", String(ownerUserId));
  if (tab !== "log-report") params.set("tab", tab);
  const query = params.toString();
  return query
    ? `${SUPER_ADMIN_LOG_TEMPLATES_PATH}?${query}`
    : SUPER_ADMIN_LOG_TEMPLATES_PATH;
}

export function superAdminLogReportTemplatesPath(): string {
  return `${SUPER_ADMIN_LOG_TEMPLATES_PATH}/log-report-templates`;
}

export function superAdminHeaderFooterTemplatesPath(): string {
  return `${SUPER_ADMIN_LOG_TEMPLATES_PATH}/header-footer-templates`;
}
