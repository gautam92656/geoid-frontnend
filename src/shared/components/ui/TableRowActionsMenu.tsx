"use client";

import type { CSSProperties, ReactNode } from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { IconButton } from "./IconButton";
import { MoreIcon } from "./TableToolbar";

export type TableRowAction = Readonly<{
  id: string;
  label: string;
  icon: ReactNode;
  onClick: () => void;
  disabled?: boolean;
  tone?: "default" | "danger";
}>;

type TableRowActionsMenuProps = Readonly<{
  label: string;
  actions: TableRowAction[];
}>;

const MENU_GAP = 4;
const MENU_MIN_WIDTH = 148;
const MENU_ESTIMATED_HEIGHT = 220;
const VIEWPORT_PADDING = 8;

function getMenuPosition(
  trigger: HTMLElement,
  menuHeight: number,
  menuWidth: number
): CSSProperties {
  const rect = trigger.getBoundingClientRect();
  const spaceBelow = window.innerHeight - rect.bottom;
  const openAbove = spaceBelow < menuHeight + MENU_GAP && rect.top > spaceBelow;

  let top = openAbove ? rect.top - menuHeight - MENU_GAP : rect.bottom + MENU_GAP;
  let left = rect.right - menuWidth;

  left = Math.max(VIEWPORT_PADDING, Math.min(left, window.innerWidth - menuWidth - VIEWPORT_PADDING));
  top = Math.max(VIEWPORT_PADDING, Math.min(top, window.innerHeight - menuHeight - VIEWPORT_PADDING));

  return {
    position: "fixed",
    top,
    left,
    width: menuWidth,
    zIndex: "var(--z-floating-menu)",
  };
}

export function TableRowActionsMenu({ label, actions }: TableRowActionsMenuProps) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [menuStyle, setMenuStyle] = useState<CSSProperties>({});
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const updateMenuPosition = useCallback(() => {
    if (!triggerRef.current) return;

    const menuWidth = Math.max(MENU_MIN_WIDTH, triggerRef.current.offsetWidth);
    const menuHeight = Math.min(
      menuRef.current?.offsetHeight ?? MENU_ESTIMATED_HEIGHT,
      window.innerHeight - VIEWPORT_PADDING * 2
    );
    setMenuStyle(getMenuPosition(triggerRef.current, menuHeight, menuWidth));
  }, []);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;

    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (rootRef.current?.contains(target) || menuRef.current?.contains(target)) return;
      setOpen(false);
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    document.addEventListener("mousedown", handlePointerDown);
    window.addEventListener("keydown", handleKeyDown);

    const handleReposition = () => updateMenuPosition();
    updateMenuPosition();
    window.addEventListener("resize", handleReposition);
    window.addEventListener("scroll", handleReposition, true);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("resize", handleReposition);
      window.removeEventListener("scroll", handleReposition, true);
    };
  }, [open, updateMenuPosition]);

  useEffect(() => {
    if (!open) return;
    updateMenuPosition();
  }, [actions.length, open, updateMenuPosition]);

  const menu = open ? (
    <div
      ref={menuRef}
      className="table-row-actions__menu table-row-actions__menu--floating"
      role="menu"
      aria-label={label}
      style={menuStyle}
    >
      {actions.map((action) => (
        <button
          key={action.id}
          type="button"
          role="menuitem"
          className={`table-row-actions__item${
            action.tone === "danger" ? " table-row-actions__item--danger" : ""
          }`}
          disabled={action.disabled}
          onClick={() => {
            action.onClick();
            setOpen(false);
          }}
        >
          <span className="table-row-actions__item-icon" aria-hidden="true">
            {action.icon}
          </span>
          <span>{action.label}</span>
        </button>
      ))}
    </div>
  ) : null;

  return (
    <div ref={rootRef} className={`table-row-actions${open ? " is-open" : ""}`}>
      <IconButton
        ref={triggerRef}
        label={label}
        size="sm"
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
        aria-haspopup="menu"
      >
        <MoreIcon />
      </IconButton>

      {mounted && menu ? createPortal(menu, document.body) : null}
    </div>
  );
}

export function EditIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M4 20h4l10.5-10.5a1.5 1.5 0 000-2.12l-2.38-2.38a1.5 1.5 0 00-2.12 0L4 15.5V20z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path d="M13.5 6.5l4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

export function ViewIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M2.5 12s3.5-6.5 9.5-6.5S21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="12" r="2.5" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

export function ArchiveIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M4 7h16M6 7V5a2 2 0 012-2h8a2 2 0 012 2v2m-12 4h8m-10 0v8a2 2 0 002 2h8a2 2 0 002-2v-8"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function UnarchiveIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="3" y="6" width="18" height="3" rx="1" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      <path
        d="M5 9v8a2 2 0 002 2h10a2 2 0 002-2V9"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M12 17v-5m0 0l-2 2m2-2l2 2"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
