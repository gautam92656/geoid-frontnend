import Link from "next/link";
import { Container } from "react-bootstrap";

const STEPS = [
  { num: "1", title: "Import Your Data", desc: "Upload your gINT database — minutes, not hours" },
  { num: "2", title: "Onboard Your Team", desc: "Personalized training for your engineers" },
  { num: "3", title: "Go Live", desc: "Pilot on one project or roll out fully" },
];

export function MigrationSection() {
  return (
    <section className="landing-section landing-section--alt">
      <Container>
        <div className="landing-split">
          <div className="landing-split__content">
            <h2 className="landing-section__title">A gINT Replacement Built for US Engineers</h2>
            <p className="landing-section__text">
              With gINT support ending, now is the time to move to a modern boring log platform.
              Import historical data, standardize logs to ASTM D2487 and USCS, and continue working
              with a modern, cloud-based workflow without disrupting active projects.
            </p>
            <Link href="#get-started" className="landing-link">
              See the 3-step migration plan →
            </Link>
          </div>
          <div className="landing-steps">
            {STEPS.map((step) => (
              <div key={step.num} className="landing-step">
                <span className="landing-step__num">{step.num}</span>
                <div>
                  <h3 className="landing-step__title">{step.title}</h3>
                  <p className="landing-step__desc">{step.desc}</p>
                </div>
              </div>
            ))}
            <div className="landing-step landing-step--highlight">
              <div>
                <h3 className="landing-step__title">Dedicated Transition Manager</h3>
                <p className="landing-step__desc">
                  Your personal point of contact for the first 30 days. We make sure you succeed.
                </p>
                <span className="landing-badge">Included Free</span>
              </div>
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}
