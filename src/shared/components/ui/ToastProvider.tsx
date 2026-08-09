"use client";

import type { ReactNode } from "react";
import { Toaster } from "react-hot-toast";

type ToastIconVariant = "success" | "error";

const toastBaseStyle = {
  background: "var(--surface-card)",
  color: "var(--text-secondary)",
  border: "1px solid var(--border-default)",
  borderRadius: "var(--radius-lg)",
  boxShadow: "var(--shadow-md)",
  padding: "12px 14px",
  fontSize: "0.875rem",
  fontWeight: 500,
  lineHeight: 1.45,
  maxWidth: "360px",
} as const;

function ToastIcon({ variant }: { variant: ToastIconVariant }) {
  return (
    <span className="geoid-toast__icon" aria-hidden="true">
      {variant === "success" ? (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
          <path
            d="M5 12.5l4.5 4.5L19 7.5"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      ) : (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
          <path
            d="M12 8.5v5M12 16.5h.01"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
          <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.75" />
        </svg>
      )}
    </span>
  );
}

function toastIcon(variant: ToastIconVariant): ReactNode {
  return <ToastIcon variant={variant} />;
}

export function ToastProvider() {
  return (
    <Toaster
      position="top-right"
      gutter={10}
      containerStyle={{
        top: 24,
        right: 24,
      }}
      toastOptions={{
        className: "geoid-toast",
        duration: 4000,
        style: toastBaseStyle,
        success: {
          className: "geoid-toast geoid-toast--success",
          style: {
            ...toastBaseStyle,
            borderColor: "rgba(5, 150, 105, 0.18)",
          },
          icon: toastIcon("success"),
        },
        error: {
          className: "geoid-toast geoid-toast--error",
          style: {
            ...toastBaseStyle,
            borderColor: "rgba(220, 38, 38, 0.18)",
          },
          icon: toastIcon("error"),
        },
      }}
    />
  );
}
