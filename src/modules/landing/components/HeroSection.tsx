import { Container } from "react-bootstrap";

export function HeroSection() {
  return (
    <section className="discovery-hero geo-page-bg">
      <Container>
        <div className="discovery-hero__content">
          {/* <span className="discovery-hero__badge">Book a Call</span> */}
          <h1 className="discovery-hero__title">
            Transform your geotechnical workflows with GeoLog —{" "}
            <span className="discovery-hero__title-accent">
              from field capture to final report, seamlessly.
            </span>
          </h1>
          <p className="discovery-hero__subtitle">
            Each session is run by one of our in-house geotechnical professionals.
          </p>
        </div>
      </Container>
    </section>
  );
}
