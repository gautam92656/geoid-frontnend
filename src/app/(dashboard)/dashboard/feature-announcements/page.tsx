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
  title: "Feature Announcements",
};

export default function FeatureAnnouncementsPage() {
  return (
    <PlaceholderPage
      title="Feature Announcements"
      description="Stay up to date with the latest GeoLog features and product updates."
    />
  );
}
