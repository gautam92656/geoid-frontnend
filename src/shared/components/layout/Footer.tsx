"use client";

import Image from "next/image";
import Link from "next/link";
import { Container } from "react-bootstrap";
import {
  COMPANY_LOGO_ALT,
  COMPANY_LOGO_HEIGHT,
  COMPANY_LOGO_PATH,
  COMPANY_LOGO_WIDTH,
} from "@/shared/constants/branding";

export function Footer() {
  return (
    <footer className="footer">
      <Container>
        <div className="footer__inner">
          <div className="footer__top">
            <div className="footer__brand">
              <Link href="/" className="footer__logo-link">
                <Image
                  src={COMPANY_LOGO_PATH}
                  alt={COMPANY_LOGO_ALT}
                  width={COMPANY_LOGO_WIDTH}
                  height={COMPANY_LOGO_HEIGHT}
                />
              </Link>
              <p className="footer__tagline">
                Cloud-based boring log software for geotechnical engineers.
              </p>
            </div>

            <nav className="footer__links-row" aria-label="Footer navigation">
              <Link href="/" className="footer__link">
                Home
              </Link>
              <Link href="/#features" className="footer__link">
                Features
              </Link>
              <Link href="/login" className="footer__link">
                Login
              </Link>
            </nav>
          </div>

          <div className="footer__bottom">
            <p className="footer__copy">&copy; {new Date().getFullYear()} GeoID. All rights reserved.</p>
          </div>
        </div>
      </Container>
    </footer>
  );
}
