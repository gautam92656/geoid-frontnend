import type { Metadata } from "next";
import { ClientsPage, EquipmentPage, SuppliersPage } from "@/modules/dashboard/components";

const ASSET_CONTENT: Record<string, { title: string; description: string }> = {
  clients: {
    title: "Clients",
    description: "Manage client companies and contacts.",
  },
  suppliers: {
    title: "Suppliers",
    description: "Manage equipment and material suppliers.",
  },
  equipment: {
    title: "Equipment",
    description: "Browse and manage project equipment.",
  },
  offices: {
    title: "Offices",
    description: "Manage office locations and defaults.",
  },
};

type PageProps = {
  params: Promise<{ assetType: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { assetType } = await params;
  const content = ASSET_CONTENT[assetType];
  return { title: content?.title ?? "Assets" };
}

export default async function DashboardAssetPage({ params }: PageProps) {
  const { assetType } = await params;

  if (assetType === "clients") {
    return <ClientsPage />;
  }

  if (assetType === "suppliers") {
    return <SuppliersPage />;
  }

  if (assetType === "equipment") {
    return <EquipmentPage />;
  }

  const content = ASSET_CONTENT[assetType] ?? {
    title: "Assets",
    description: "This asset section is coming soon.",
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
