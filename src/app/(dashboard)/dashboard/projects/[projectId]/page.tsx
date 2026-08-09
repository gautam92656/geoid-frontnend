import type { Metadata } from "next";
import { ProjectDashboardRoute } from "@/modules/dashboard/components/ProjectDashboardRoute";

export const metadata: Metadata = {
  title: "Project",
  description: "View project details and activity.",
};

type PageProps = {
  params: Promise<{ projectId: string }>;
};

export default async function ProjectDashboardPage({ params }: PageProps) {
  const { projectId } = await params;

  return <ProjectDashboardRoute projectId={projectId} />;
}
