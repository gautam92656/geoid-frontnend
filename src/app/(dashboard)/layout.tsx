import type { ReactNode } from "react";
import { AuthGuard } from "@/modules/auth/components/AuthGuard";
import { DashboardNavbar } from "@/modules/dashboard/components";
import { PageTransition } from "@/shared/components/layout/PageTransition";

export default function DashboardLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <AuthGuard>
      <div className="dashboard-page">
        <DashboardNavbar />
        <div className="dashboard-page__content">
          <PageTransition>{children}</PageTransition>
        </div>
      </div>
    </AuthGuard>
  );
}
