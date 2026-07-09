import { Container } from "react-bootstrap";

const STEPS = [
  {
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path
          d="M9 18h6M10 21h4M12 3a6 6 0 00-3 11.2V17h6v-2.8A6 6 0 0012 3z"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
    title: "Capture data in the field",
    desc: "Log boreholes on mobile or tablet with offline support, so your team keeps working on remote sites.",
  },
  {
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8" />
        <path
          d="M9.5 9.5a3 3 0 014.8 1.2c0 1.2-1.2 1.8-2 2.2-.6.3-1 .7-1 1.3v.3"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
        <circle cx="12" cy="17.2" r="1" fill="currentColor" />
      </svg>
    ),
    title: "Standardize across your team",
    desc: "Apply consistent templates and validation rules so every log meets your firm's standards.",
  },
  {
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path
          d="M13 2L4 14h7l-1 8 10-14h-7l0-6z"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
    title: "Deliver reports faster",
    desc: "Generate professional boring logs and export data in formats your clients and tools already use.",
  },
];

export function JourneyStepsSection() {
  return (
    <section className="discovery-steps">
      <Container>
        <h2 className="discovery-steps__title">How GeoID works in three simple steps</h2>
        <div className="discovery-steps__grid">
          {STEPS.map((step) => (
            <article key={step.title} className="discovery-step-card">
              <div className="discovery-step-card__icon">{step.icon}</div>
              <h3 className="discovery-step-card__title">{step.title}</h3>
              <p className="discovery-step-card__desc">{step.desc}</p>
            </article>
          ))}
        </div>
      </Container>
    </section>
  );
}
