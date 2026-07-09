import type { ReactNode } from "react";
import { Container } from "react-bootstrap";
import { AuthPromo } from "@/modules/auth/components/AuthPromo";
import { Navbar } from "@/shared/components/layout/Navbar";
import { Footer } from "@/shared/components/layout/Footer";
import { ScrollToTop } from "@/shared/components/layout/ScrollToTop";

export default function AuthLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <>
      <ScrollToTop />
      <Navbar />
      <div className="auth-page geo-page-bg">
        <Container>
          <div className="auth-page__grid">
            <AuthPromo />
            <div className="auth-page__panel">{children}</div>
          </div>
        </Container>
      </div>
      <Footer />
    </>
  );
}
