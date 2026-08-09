import type { ReactNode } from "react";
import { SettingsAccessGuard } from "@/modules/dashboard/components/SettingsAccessGuard";

export default function DashboardSettingsLayout({ children }: Readonly<{ children: ReactNode }>) {
  return <SettingsAccessGuard>{children}</SettingsAccessGuard>;
}
