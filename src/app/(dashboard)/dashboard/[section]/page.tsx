import type { Metadata } from "next";

const PAGE_CONTENT: Record<string, { title: string; description: string }> = {
  projects: {
    title: "Projects",
    description: "Manage and view all your geotechnical projects.",
  },
  data: {
    title: "Data",
    description: "Access and analyze your borehole and subsurface data.",
  },
  assets: {
    title: "Assets",
    description: "Browse and manage your project assets and resources.",
  },
};

type PageProps = {
  params: Promise<{ section: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { section } = await params;
  const content = PAGE_CONTENT[section];
  return { title: content?.title ?? "Dashboard" };
}

export default async function DashboardSectionPage({ params }: PageProps) {
  const { section } = await params;
  const content = PAGE_CONTENT[section] ?? {
    title: "Dashboard",
    description: "This section is coming soon.",
  };

  return (
    <section className="dashboard-placeholder">
      <div className="dashboard-placeholder__inner">
        <h1 className="dashboard-placeholder__title">{content.title}</h1>
        <p className="dashboard-placeholder__text">{content.description}</p>
      </div>
    </section>
  );
}
