"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import { Container } from "react-bootstrap";
import { useAppSelector } from "@/store/hooks";
import logo from "@/assets/image/logo.svg";

const MAIN_LINKS = [
  { label: "Home", href: "/dashboard", icon: "home" },
  { label: "Projects", href: "/dashboard/projects", icon: "projects" },
  { label: "Data", href: "/dashboard/data", icon: "data" },
  { label: "Assets", href: "/dashboard/assets", icon: "assets" },
  { label: "Settings", href: "/dashboard/settings", icon: "settings" },
] as const;

function NavIcon({ name }: Readonly<{ name: (typeof MAIN_LINKS)[number]["icon"] }>) {
  const icons: Record<(typeof MAIN_LINKS)[number]["icon"], ReactNode> = {
    home: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path
          d="M3 10.5L12 3l9 7.5V20a1 1 0 01-1 1h-5v-6H9v6H4a1 1 0 01-1-1v-9.5z"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
      </svg>
    ),
    projects: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path
          d="M4 6h16M4 12h16M4 18h10"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      </svg>
    ),
    data: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path
          d="M4 19V5M4 19h16M8 15V9M12 17V7M16 13V11"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      </svg>
    ),
    assets: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <rect x="3" y="4" width="18" height="16" rx="2" stroke="currentColor" strokeWidth="1.5" />
        <path d="M3 9h18" stroke="currentColor" strokeWidth="1.5" />
      </svg>
    ),
    settings: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.5" />
        <path
          d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      </svg>
    ),
  };

  return <span className="dashboard-navbar__icon">{icons[name]}</span>;
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

function getInitials(firstName?: string, lastName?: string): string {
  const first = firstName?.charAt(0) ?? "";
  const last = lastName?.charAt(0) ?? "";
  const initials = `${first}${last}`.toUpperCase();
  return initials || "GE";
}

export function DashboardNavbar() {
  const { user } = useAppSelector((s) => s.auth);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const close = () => setDrawerOpen(false);

  useEffect(() => {
    document.body.style.overflow = drawerOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [drawerOpen]);

  const initials = getInitials(user?.firstName, user?.lastName);

  return (
    <>
      <header className="dashboard-navbar">
        <Container fluid className="dashboard-navbar__container">
          <div className="dashboard-navbar__inner">
            <div className="dashboard-navbar__left">
              <Link href="/dashboard" className="dashboard-navbar__logo">
                <Image src={logo} alt="GeoID" priority />
              </Link>

              <nav className="dashboard-navbar__main-nav" aria-label="Main navigation">
                <ul>
                  {MAIN_LINKS.map(({ label, href, icon }) => (
                    <li key={href}>
                      <Link href={href} className="dashboard-navbar__main-link">
                        <NavIcon name={icon} />
                        {label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </nav>
            </div>

            <div className="dashboard-navbar__right">

              <div className="dashboard-navbar__utilities">
                <button type="button" className="dashboard-navbar__utility-btn" aria-label="Toggle dark mode">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <path
                      d="M21 14.5A8.5 8.5 0 1112.5 3a6.5 6.5 0 009.5 11.5z"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinejoin="round"
                    />
                  </svg>
                </button>
                <button type="button" className="dashboard-navbar__utility-btn" aria-label="Toggle fullscreen">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <path
                      d="M8 3H5a2 2 0 00-2 2v3M16 3h3a2 2 0 012 2v3M8 21H5a2 2 0 01-2-2v-3M16 21h3a2 2 0 002-2v-3"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                    />
                  </svg>
                </button>
                <button type="button" className="dashboard-navbar__utility-btn" aria-label="Notifications">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <path
                      d="M15 17H9M18 8a6 6 0 10-12 0v5l-2 2h16l-2-2V8z"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </button>
              </div>

              <div className="dashboard-navbar__avatar" aria-label="User profile">
                {initials}
              </div>

              <button
                type="button"
                aria-label={drawerOpen ? "Close menu" : "Open menu"}
                className="dashboard-navbar__hamburger"
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
          <Link href="/dashboard" className="navbar__logo" onClick={close}>
            <Image src={logo} alt="GeoID" width={120} height={32} />
          </Link>
          <button type="button" aria-label="Close menu" className="navbar__drawer-close" onClick={close}>
            ×
          </button>
        </div>

        <nav className="navbar__drawer-nav">
          {MAIN_LINKS.map(({ label, href }) => (
            <Link key={href} href={href} className="navbar__drawer-link" onClick={close}>
              {label}
            </Link>
          ))}
          <Link href="/dashboard/support-workspace" className="navbar__drawer-link" onClick={close}>
            Support Workspace
          </Link>
          <Link href="/dashboard/feature-announcements" className="navbar__drawer-link" onClick={close}>
            Feature Announcements
          </Link>
          <Link href="/dashboard/knowledge-base" className="navbar__drawer-link" onClick={close}>
            Knowledge Base
          </Link>
        </nav>
      </aside>
    </>
  );
}
