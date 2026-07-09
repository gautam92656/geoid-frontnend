import { Container } from "react-bootstrap";

const ITEMS = [
  {
    problem: "Hours Wasted on QA/QC",
    problemDesc:
      "Manual data entry leads to errors — and at ~$7 in wages per log, those errors are expensive.",
    solution: "Built-in Validation",
    solutionDesc:
      "Built-in validation catches errors in real-time. Reduce QA/QC time by 50% — and cut log production costs from ~$7 to as little as $1 per log.",
  },
  {
    problem: "Inconsistent Standards",
    problemDesc:
      "Different loggers, different formats. Maintaining ASTM D2487 compliance across your organization is a nightmare.",
    solution: "Standardized Workflows",
    solutionDesc:
      "Standardized workflows ensure every log meets industry requirements. Your entire team follows the same process, every time.",
  },
  {
    problem: "Scaling is Painful",
    problemDesc:
      "Legacy software can't grow with you. Adding new users, projects, or locations becomes a bottleneck.",
    solution: "Modern, Cloud-based Software",
    solutionDesc:
      "Our cloud-native platform scales from 5 to 500 users seamlessly. Log 3 inches or 30 feet — we handle it all.",
  },
];

export function WhyChooseSection() {
  return (
    <section className="landing-section">
      <Container>
        <div className="landing-section__header landing-section__header--center">
          <h2 className="landing-section__title">Why Geotechnical Teams Choose Us</h2>
        </div>
        <div className="landing-why-grid">
          {ITEMS.map((item) => (
            <article key={item.problem} className="landing-why-card">
              <h3 className="landing-why-card__problem">{item.problem}</h3>
              <p className="landing-why-card__problem-desc">{item.problemDesc}</p>
              <div className="landing-why-card__solution">
                <span className="landing-badge landing-badge--small">{item.solution}</span>
                <p>{item.solutionDesc}</p>
              </div>
            </article>
          ))}
        </div>
      </Container>
    </section>
  );
}
