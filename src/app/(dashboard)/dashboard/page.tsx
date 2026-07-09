import type { Metadata } from "next";
import { DashboardHero, ProjectsSection, StatCards } from "@/modules/dashboard/components";

export const metadata: Metadata = {
  title: "Dashboard",
  description: "GeoID dashboard — view your logs and project activity at a glance.",
};

export default function DashboardHomePage() {
  return (
    <main>
      <DashboardHero />
      <div className="dashboard-main">
        <StatCards />
        <ProjectsSection />
      </div>
    </main>
  );
}
