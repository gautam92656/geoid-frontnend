"use client";

import Image from "next/image";
import { Container } from "react-bootstrap";
import { useAppSelector } from "@/store/hooks";

const DEFAULT_COMPANY = "GEOID Engineering";
const COMPANY_LOGO = "/geoid_logo.jpg";

export function DashboardHero() {
  const { user } = useAppSelector((s) => s.auth);
  const firstName = user?.firstName ?? "Geo";

  return (
    <section className="dashboard-hero">
      <Container fluid className="dashboard-hero__container">
        <div className="dashboard-hero__content">
          <div className="dashboard-hero__avatar">
            <Image src={COMPANY_LOGO} alt="GeoID" width={40} height={40} />
          </div>
          <h1 className="dashboard-hero__title">Welcome back, {firstName}!</h1>
          <p className="dashboard-hero__subtitle">
            <strong>{DEFAULT_COMPANY}</strong>
          </p>
        </div>
      </Container>
    </section>
  );
}
