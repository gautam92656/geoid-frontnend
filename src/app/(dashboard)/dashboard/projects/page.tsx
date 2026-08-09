import type { Metadata } from "next";
import { ProjectsPage } from "@/modules/dashboard/components/ProjectsPage";

export const metadata: Metadata = {
  title: "Projects",
  description: "Manage and view all your geotechnical projects.",
};

export default function DashboardProjectsPage() {
  return (
    <main>
      <ProjectsPage />
    </main>
  );
}
