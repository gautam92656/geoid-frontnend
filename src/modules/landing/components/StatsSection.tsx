import { Container } from "react-bootstrap";

const STATS = [
  { value: "400+", label: "Consulting Firms Worldwide" },
  { value: "1M+", label: "Boreholes Logged" },
  { value: "Millions", label: "Feet of Subsurface Data Captured" },
  { value: "99.9%", label: "Uptime Reliability" },
];

export function StatsSection() {
  return (
    <section className="landing-section">
      <Container>
        <p className="landing-stats__intro">
          Built for North American standards. Our DOT-aligned log configurations are adopted by
          leading consulting firms across the region.
        </p>
        <div className="landing-stats-grid">
          {STATS.map((stat) => (
            <div key={stat.label} className="landing-stat">
              <span className="landing-stat__value">{stat.value}</span>
              <span className="landing-stat__label">{stat.label}</span>
            </div>
          ))}
        </div>
        <blockquote className="landing-testimonial">
          <p>
            &ldquo;This is definitely the best investment we&apos;ve made in terms of where the
            innovation group is trying to get us as a company.&rdquo;
          </p>
          <footer>
            <strong>Michael</strong>
            <span>Farallon — California</span>
          </footer>
        </blockquote>
      </Container>
    </section>
  );
}
