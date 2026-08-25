import { Container } from "react-bootstrap";

const FEATURES = [
  {
    title: "Field logging with offline sync",
    desc: "Capture borehole data on mobile or tablet in the field. Work offline and sync automatically when connected.",
  },
  {
    title: "Professional boring log reports",
    desc: "Generate customizable, standardized reports that match your firm's templates and client requirements.",
  },
  {
    title: "Export and integrations",
    desc: "Export to AGS, DIGGS, and CAD-ready formats. Integrate with your existing geotechnical workflows.",
  },
];

export function FeaturesSection() {
  return (
    <section id="features" className="landing-section">
      <Container>
        <div className="landing-section__header landing-section__header--center">
          <span className="landing-eyebrow">Features</span>
          <h2 className="landing-section__title">Everything you need for geotechnical logging</h2>
          <p className="landing-section__text">
            GeoLog helps your team move from paper logs and spreadsheets to a modern, cloud-based workflow.
          </p>
        </div>
        <div className="landing-features-grid">
          {FEATURES.map((feature) => (
            <article key={feature.title} className="landing-feature-card">
              <div className="landing-feature-card__icon" aria-hidden="true">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <rect x="3" y="3" width="18" height="18" rx="4" stroke="currentColor" strokeWidth="1.5" />
                  <path d="M8 12h8M12 8v8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              </div>
              <h3 className="landing-feature-card__title">{feature.title}</h3>
              <p className="landing-feature-card__desc">{feature.desc}</p>
            </article>
          ))}
        </div>
      </Container>
    </section>
  );
}
