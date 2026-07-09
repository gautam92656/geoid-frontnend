import type { ReactNode } from "react";
import { DashboardNavbar } from "@/modules/dashboard/components";

export default function DashboardLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <div className="dashboard-page">
      <DashboardNavbar />
      <div className="dashboard-page__content">{children}</div>
    </div>
  );
}
