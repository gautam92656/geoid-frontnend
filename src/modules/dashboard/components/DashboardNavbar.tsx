"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { Container } from "react-bootstrap";
import { useAuth } from "@/modules/auth/hooks/useAuth";
import { useAppSelector } from "@/store/hooks";
import {
  COMPANY_LOGO_ALT,
  COMPANY_LOGO_HEIGHT,
  COMPANY_LOGO_PATH,
  COMPANY_LOGO_WIDTH,
} from "@/shared/constants/branding";

const MAIN_LINKS = [
  { label: "Home", href: "/dashboard", icon: "home" },
  { label: "Projects", href: "/dashboard/projects", icon: "projects" },
  { label: "Data", href: "/dashboard/data", icon: "data" },
  { label: "Settings", href: "/dashboard/settings", icon: "settings" },
] as const;

const ASSET_LINKS = [
  {
    label: "Clients",
    description: "Client companies",
    href: "/dashboard/assets/clients",
    icon: "clients",
    tone: "blue",
  },
  {
    label: "Suppliers",
    description: "Vendor partners",
    href: "/dashboard/assets/suppliers",
    icon: "suppliers",
    tone: "amber",
  },
  {
    label: "Equipment",
    description: "Tools and rigs",
    href: "/dashboard/assets/equipment",
    icon: "equipment",
    tone: "green",
  },
  // {
  //   label: "Offices",
  //   description: "Office locations",
  //   href: "/dashboard/assets/offices",
  //   icon: "offices",
  //   tone: "violet",
  // },
] as const;

type NavIconName = (typeof MAIN_LINKS)[number]["icon"] | "assets";
type AssetIconName = (typeof ASSET_LINKS)[number]["icon"];

function NavIcon({ name }: Readonly<{ name: NavIconName }>) {
  const icons: Record<NavIconName, ReactNode> = {
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

function AssetLogo({ name }: Readonly<{ name: AssetIconName }>) {
  const icons: Record<AssetIconName, ReactNode> = {
    clients: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <circle cx="9" cy="8" r="3" stroke="currentColor" strokeWidth="1.5" />
        <path d="M4 19c0-2.8 2.2-5 5-5s5 2.2 5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        <path d="M16 11h5M18.5 8.5v5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    ),
    suppliers: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M3 7h13l3 4v6H3V7z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
        <circle cx="7.5" cy="18" r="1.5" fill="currentColor" />
        <circle cx="16.5" cy="18" r="1.5" fill="currentColor" />
        <path d="M16 7l-2-3H3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    ),
    equipment: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path
          d="M8 4h8l2 4v10a2 2 0 01-2 2H8a2 2 0 01-2-2V8l2-4z"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
        <path d="M10 12h4M10 16h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    ),
  };

  return icons[name];
}

function AssetsDropdown({ onNavigate }: Readonly<{ onNavigate?: () => void }>) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLLIElement>(null);

  useEffect(() => {
    if (!open) return;

    const handlePointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    document.addEventListener("mousedown", handlePointerDown);
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  return (
    <li ref={rootRef} className={`dashboard-navbar__dropdown${open ? " is-open" : ""}`}>
      <button
        type="button"
        className="dashboard-navbar__main-link dashboard-navbar__main-link--trigger"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
      >
        <NavIcon name="assets" />
        Assets
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          aria-hidden="true"
          className="dashboard-navbar__chevron"
        >
          <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </button>

      {open ? (
        <div className="dashboard-navbar__dropdown-menu" role="menu" aria-label="Assets">
          {ASSET_LINKS.map(({ label, description, href, icon, tone }) => (
            <Link
              key={href}
              href={href}
              role="menuitem"
              className="dashboard-navbar__dropdown-item"
              onClick={() => {
                setOpen(false);
                onNavigate?.();
              }}
            >
              <span className={`dashboard-navbar__dropdown-logo dashboard-navbar__dropdown-logo--${tone}`}>
                <AssetLogo name={icon} />
              </span>
              <span className="dashboard-navbar__dropdown-copy">
                <span className="dashboard-navbar__dropdown-label">{label}</span>
                <span className="dashboard-navbar__dropdown-description">{description}</span>
              </span>
            </Link>
          ))}
        </div>
      ) : null}
    </li>
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

function getInitials(firstName?: string, lastName?: string): string {
  const first = firstName?.charAt(0) ?? "";
  const last = lastName?.charAt(0) ?? "";
  const initials = `${first}${last}`.toUpperCase();
  return initials || "GE";
}

function ProfileMenu({
  initials,
  email,
  isSuperAdmin,
}: Readonly<{
  initials: string;
  email: string;
  isSuperAdmin: boolean;
}>) {
  const { signOut } = useAuth();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    const handlePointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    document.addEventListener("mousedown", handlePointerDown);
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  const handleLogout = () => {
    setOpen(false);
    signOut();
  };

  return (
    <div ref={rootRef} className={`dashboard-navbar__profile${open ? " is-open" : ""}`}>
      <button
        type="button"
        className="dashboard-navbar__avatar dashboard-navbar__profile-trigger"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Open profile menu"
        onClick={() => setOpen((current) => !current)}
      >
        {initials}
      </button>

      {open ? (
        <div className="dashboard-navbar__profile-menu" role="menu" aria-label="Profile">
          <p className="dashboard-navbar__profile-email">{email}</p>

          {isSuperAdmin ? (
            <Link
              href="/dashboard/settings/account"
              role="menuitem"
              className="dashboard-navbar__profile-action"
              onClick={() => setOpen(false)}
            >
              My Profile
            </Link>
          ) : null}

          {isSuperAdmin ? (
            <Link
              href="/super-admin/users"
              role="menuitem"
              className="dashboard-navbar__profile-action"
              onClick={() => setOpen(false)}
            >
              Super Admin
            </Link>
          ) : null}

          <button
            type="button"
            role="menuitem"
            className="dashboard-navbar__profile-action dashboard-navbar__profile-action--danger"
            onClick={handleLogout}
          >
            Log out
          </button>
        </div>
      ) : null}
    </div>
  );
}

function BrandLogo() {
  return (
    <Link href="/dashboard" className="dashboard-navbar__logo">
      <Image
        src={COMPANY_LOGO_PATH}
        alt={COMPANY_LOGO_ALT}
        width={COMPANY_LOGO_WIDTH}
        height={COMPANY_LOGO_HEIGHT}
        priority
      />
    </Link>
  );
}

export function DashboardNavbar() {
  const { user, email } = useAppSelector((s) => s.auth);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [mobileAssetsOpen, setMobileAssetsOpen] = useState(false);
  const close = () => {
    setDrawerOpen(false);
    setMobileAssetsOpen(false);
  };

  useEffect(() => {
    document.body.style.overflow = drawerOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [drawerOpen]);

  const initials = getInitials(user?.firstName, user?.lastName);
  const profileEmail = user?.email || email || "";
  const isSuperAdmin = user?.role === "super_admin";

  return (
    <>
      <header className="dashboard-navbar">
        <Container fluid className="dashboard-navbar__container">
          <div className="dashboard-navbar__inner">
            <div className="dashboard-navbar__left">
              <BrandLogo />

              <nav className="dashboard-navbar__main-nav" aria-label="Main navigation">
                <ul>
                  {MAIN_LINKS.filter((link) => link.href !== "/dashboard/settings").map(
                    ({ label, href, icon }) => (
                      <li key={href}>
                        <Link href={href} className="dashboard-navbar__main-link">
                          <NavIcon name={icon} />
                          {label}
                        </Link>
                      </li>
                    )
                  )}
                  <AssetsDropdown />
                  {isSuperAdmin
                    ? MAIN_LINKS.filter((link) => link.href === "/dashboard/settings").map(
                        ({ label, href, icon }) => (
                          <li key={href}>
                            <Link href={href} className="dashboard-navbar__main-link">
                              <NavIcon name={icon} />
                              {label}
                            </Link>
                          </li>
                        )
                      )
                    : null}
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

              <ProfileMenu initials={initials} email={profileEmail} isSuperAdmin={isSuperAdmin} />

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
          <BrandLogo />
          <button type="button" aria-label="Close menu" className="navbar__drawer-close" onClick={close}>
            ×
          </button>
        </div>

        <nav className="navbar__drawer-nav ui-scrollbar">
          {MAIN_LINKS.filter((link) => link.href !== "/dashboard/settings").map(({ label, href }) => (
            <Link key={href} href={href} className="navbar__drawer-link" onClick={close}>
              {label}
            </Link>
          ))}

          <div className="navbar__drawer-group">
            <button
              type="button"
              className="navbar__drawer-link navbar__drawer-link--trigger"
              aria-expanded={mobileAssetsOpen}
              onClick={() => setMobileAssetsOpen((current) => !current)}
            >
              Assets
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </button>

            {mobileAssetsOpen ? (
              <div className="navbar__drawer-submenu">
                {ASSET_LINKS.map(({ label, href, icon, tone }) => (
                  <Link key={href} href={href} className="navbar__drawer-sublink" onClick={close}>
                    <span className={`dashboard-navbar__dropdown-logo dashboard-navbar__dropdown-logo--${tone}`}>
                      <AssetLogo name={icon} />
                    </span>
                    {label}
                  </Link>
                ))}
              </div>
            ) : null}
          </div>

          {isSuperAdmin
            ? MAIN_LINKS.filter((link) => link.href === "/dashboard/settings").map(({ label, href }) => (
                <Link key={href} href={href} className="navbar__drawer-link" onClick={close}>
                  {label}
                </Link>
              ))
            : null}
          {isSuperAdmin ? (
            <Link href="/super-admin/users" className="navbar__drawer-link" onClick={close}>
              Super Admin
            </Link>
          ) : null}
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
