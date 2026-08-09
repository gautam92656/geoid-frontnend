import type { Metadata } from "next";
import { UpdateLogRoute } from "@/modules/dashboard/components/UpdateLogRoute";

export const metadata: Metadata = {
  title: "Update Log",
  description: "Update log details",
};

type PageProps = {
  params: Promise<{ projectId: string; logId: string }>;
};

export default async function UpdateLogRoutePage({ params }: PageProps) {
  const { projectId, logId } = await params;

  return <UpdateLogRoute projectId={projectId} logId={logId} />;
}
