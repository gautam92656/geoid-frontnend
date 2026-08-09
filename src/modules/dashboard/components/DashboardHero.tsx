"use client";

import Image from "next/image";
import { Container } from "react-bootstrap";
import { useAppSelector } from "@/store/hooks";

import {
  COMPANY_LOGO_ALT,
  COMPANY_LOGO_HEIGHT,
  COMPANY_LOGO_PATH,
  COMPANY_LOGO_WIDTH,
  DEFAULT_COMPANY_NAME,
} from "../data/branding";

export function DashboardHero() {
  const { user } = useAppSelector((s) => s.auth);
  const firstName = user?.firstName ?? "Geo";
  const isSuperAdmin = user?.role === "super_admin";

  const companyName =
    isSuperAdmin || !user?.companyName?.trim()
      ? DEFAULT_COMPANY_NAME
      : user.companyName.trim();
  const companyLogoUrl = isSuperAdmin ? null : user?.companyLogoUrl?.trim() || null;

  return (
    <section className="dashboard-hero">
      <Container fluid className="dashboard-hero__container">
        <div className="dashboard-hero__content">
          <div className="dashboard-hero__avatar">
            {companyLogoUrl ? (
              // User-uploaded logos may be data URLs; next/image is not suitable here.
              // eslint-disable-next-line @next/next/no-img-element
              <img src={companyLogoUrl} alt={companyName} />
            ) : (
              <Image
                src={COMPANY_LOGO_PATH}
                alt={COMPANY_LOGO_ALT}
                width={COMPANY_LOGO_WIDTH}
                height={COMPANY_LOGO_HEIGHT}
              />
            )}
          </div>
          <h1 className="dashboard-hero__title">Welcome back, {firstName}!</h1>
          <p className="dashboard-hero__subtitle">
            <strong>{companyName}</strong>
          </p>
        </div>
      </Container>
    </section>
  );
}
