import { Container } from "react-bootstrap";

const STATS = [
  { value: "43", label: "Logs Today" },
  { value: "164", label: "Logs This Week" },
  { value: "342", label: "Logs This Month" },
  { value: "22,223", label: "Total Logs" },
  { value: "0", label: "Converted Proposed Logs" },
] as const;

export function StatCards() {
  return (
    <section className="dashboard-stats">
      <Container fluid className="dashboard-stats__container">
        <div className="dashboard-stats__grid">
          {STATS.map((stat) => (
            <article key={stat.label} className="dashboard-stat-card">
              <span className="dashboard-stat-card__value">{stat.value}</span>
              <span className="dashboard-stat-card__label">{stat.label}</span>
            </article>
          ))}
        </div>
      </Container>
    </section>
  );
}
