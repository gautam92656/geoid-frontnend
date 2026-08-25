import type { AuthUser } from "@/modules/auth/types";
import {
  COMPANY_LOGO_ALT,
  COMPANY_LOGO_HEIGHT,
  COMPANY_LOGO_PATH,
  COMPANY_LOGO_WIDTH,
} from "@/shared/constants/branding";

export {
  COMPANY_LOGO_ALT,
  COMPANY_LOGO_HEIGHT,
  COMPANY_LOGO_PATH,
  COMPANY_LOGO_WIDTH,
};

export const DEFAULT_COMPANY_NAME = "GEOLOG Engineering";
export const REPORT_BRAND_SUBTITLE = "Geotechnical Investigation";

export function resolveDashboardBranding(user: AuthUser | null | undefined) {
  const isSuperAdmin = user?.role === "super_admin";
  const customName = user?.companyName?.trim() ?? "";

  return {
    companyName: isSuperAdmin || !customName ? DEFAULT_COMPANY_NAME : customName,
  };
}
