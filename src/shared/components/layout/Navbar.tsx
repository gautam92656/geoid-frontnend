"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useAppSelector } from "@/store/hooks";
import Image from "next/image";
import {
  COMPANY_LOGO_ALT,
  COMPANY_LOGO_HEIGHT,
  COMPANY_LOGO_PATH,
  COMPANY_LOGO_WIDTH,
} from "@/shared/constants/branding";
import { Container } from "react-bootstrap";

const NAV_LINKS = [
  { label: "Home", href: "/", active: true },
  { label: "Features", href: "/#features", hasDropdown: true },
  // { label: "Pricing", href: "/#pricing", hasDropdown: true },
  { label: "About", href: "/#about", hasDropdown: true },
  { label: "Resources", href: "/#resources", hasDropdown: true },
];

function ChevronDown() {
  return (
    <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden="true">
      <path d="M2 3.5L5 6.5L8 3.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}

function HamburgerIcon({ open }: Readonly<{ open: boolean }>) {
  return (
    <span className={`navbar__hamburger-icon${open ? " is-open" : ""}`}>
      <span />
      <span />
      <span />
    </span>
  );
}

export function Navbar() {
  const { isAuthenticated: storeIsAuthenticated } = useAppSelector((s) => s.auth);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setHydrated(true);
  }, []);

  const isAuthenticated = hydrated && storeIsAuthenticated;
  const close = () => setDrawerOpen(false);

  useEffect(() => {
    document.body.style.overflow = drawerOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [drawerOpen]);

  return (
    <>
      <header className="header">
        <Container>
          <div className="navbar-main">
            <div className="logo">
              <Link href="/" className="navbar__logo">
                <Image
                  src={COMPANY_LOGO_PATH}
                  alt={COMPANY_LOGO_ALT}
                  width={COMPANY_LOGO_WIDTH}
                  height={COMPANY_LOGO_HEIGHT}
                  priority
                />
              </Link>
            </div>

            <nav>
              <ul className="navbar__nav">
                {NAV_LINKS.map(({ label, href, active, hasDropdown }) => (
                  <li key={href}>
                    <Link
                      href={href}
                      className={`navbar__nav-link${active ? " is-active" : ""}`}
                    >
                      {label}
                      {hasDropdown ? <ChevronDown /> : null}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>

            <div className="navbar__actions">
              {isAuthenticated ? (
                <Link href="/dashboard" className="btns btns-primary">
                  Dashboard
                </Link>
              ) : (
                <>
                
                  <Link href="/login" className="btns btns-primary">
                    Login
                  </Link>
                </>
              )}

              <button
                type="button"
                aria-label={drawerOpen ? "Close menu" : "Open menu"}
                className="navbar__hamburger"
                onClick={() => setDrawerOpen((open) => !open)}
              >
                <HamburgerIcon open={drawerOpen} />
              </button>
            </div>
          </div>
        </Container>
      </header>

      <div
        className={`navbar__backdrop${drawerOpen ? " open" : ""}`}
        onClick={close}
        aria-hidden="true"
      />

      <aside
        className={`navbar__drawer${drawerOpen ? " open" : ""}`}
        aria-label="Mobile navigation"
      >
        <div className="navbar__drawer-header">
          <Link href="/" className="navbar__logo" onClick={close}>
            <Image
              src={COMPANY_LOGO_PATH}
              alt={COMPANY_LOGO_ALT}
              width={COMPANY_LOGO_WIDTH}
              height={COMPANY_LOGO_HEIGHT}
            />
          </Link>
          <button
            type="button"
            aria-label="Close menu"
            className="navbar__drawer-close"
            onClick={close}
          >
            ×
          </button>
        </div>

        <nav className="navbar__drawer-nav ui-scrollbar">
          {NAV_LINKS.map(({ label, href }) => (
            <Link key={href} href={href} className="navbar__drawer-link" onClick={close}>
              {label}
            </Link>
          ))}
          {isAuthenticated ? (
            <Link href="/dashboard" className="navbar__drawer-link" onClick={close}>
              Dashboard
            </Link>
          ) : (
            <>
              <Link href="/register" className="navbar__drawer-link" onClick={close}>
                Switch Now
              </Link>
              <Link href="/login" className="navbar__drawer-link" onClick={close}>
                Login
              </Link>
            </>
          )}
        </nav>
      </aside>
    </>
  );
}
