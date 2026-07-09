import type { Metadata } from "next";

type PlaceholderPageProps = {
  title: string;
  description: string;
};

function PlaceholderPage({ title, description }: Readonly<PlaceholderPageProps>) {
  return (
    <section className="dashboard-placeholder">
      <div className="dashboard-placeholder__inner">
        <h1 className="dashboard-placeholder__title">{title}</h1>
        <p className="dashboard-placeholder__text">{description}</p>
      </div>
    </section>
  );
}

export const metadata: Metadata = {
  title: "Support Workspace",
};

export default function SupportWorkspacePage() {
  return (
    <PlaceholderPage
      title="Support Workspace"
      description="Get help from our support team and manage your workspace requests."
    />
  );
}
