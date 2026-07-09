import { Container } from "react-bootstrap";

const LOGOS = ["Terracon", "ECS", "Geosyntec", "ARUP", "Jacobs"];

export function TrustedBySection() {
  return (
    <section className="landing-trusted">
      <Container>
        <p className="landing-trusted__label">Trusted by leading companies worldwide</p>
        <div className="landing-trusted__logos">
          {LOGOS.map((name) => (
            <span key={name} className="landing-trusted__logo">
              {name}
            </span>
          ))}
        </div>
      </Container>
    </section>
  );
}
