import Link from "next/link";
import { Container } from "react-bootstrap";

const BENEFITS = [
  "Free trial with full platform access",
  "Onboarding support for your team",
  "Import existing project data",
  "Unlimited users, no per-seat fees",
];

export function CtaSection() {
  return (
    <section id="get-started" className="landing-section landing-cta">
      <Container>
        <div className="landing-cta__grid">
          <div className="landing-cta__content">
            <span className="landing-eyebrow">Get Started</span>
            <h2 className="landing-section__title">
              Ready to get started with GeoLog?
            </h2>
            <p className="landing-section__text">
              Join engineering teams using GeoLog for faster logging, consistent reports,
              and streamlined geotechnical project management.
            </p>
            <ul className="landing-cta__list">
              {BENEFITS.map((item) => (
                <li key={item}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <path
                      d="M20 6L9 17l-5-5"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  {item}
                </li>
              ))}
            </ul>
          </div>

          <div className="landing-cta__form-card">
            <h3 className="landing-cta__form-title">Start with GeoLog</h3>
            <p className="landing-cta__form-sub">
              Create your account and explore the platform with a free trial.
            </p>
            <div className="landing-cta__form-actions">
              <Link href="/register" className="btns w-100">
                Start Free Trial
              </Link>
              <Link href="/login" className="btns btns-outline w-100">
                Sign In
              </Link>
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}
