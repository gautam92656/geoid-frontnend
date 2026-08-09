import type { ReactNode } from "react";
import { DashboardNavbar } from "@/modules/dashboard/components";
import { SuperAdminGuard } from "@/modules/super-admin/components/SuperAdminGuard";
import { PageTransition } from "@/shared/components/layout/PageTransition";

export default function SuperAdminLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <SuperAdminGuard>
      <div className="dashboard-page">
        <DashboardNavbar />
        <div className="dashboard-page__content">
          <PageTransition>{children}</PageTransition>
        </div>
      </div>
    </SuperAdminGuard>
  );
}
