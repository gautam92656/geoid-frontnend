"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { IconButton } from "./IconButton";
import { UiButton } from "./UiButton";

type ConfirmDialogProps = Readonly<{
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void | Promise<void>;
  onCancel: () => void;
  loading?: boolean;
  variant?: "danger" | "primary";
}>;

function CloseIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M6 6l12 12M18 6L6 18"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
    </svg>
  );
}

function DangerIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function InfoIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.75" />
      <path d="M12 11v5" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
      <circle cx="12" cy="8" r="1" fill="currentColor" />
    </svg>
  );
}

function LoadingSpinner() {
  return (
    <svg
      className="confirm-dialog__spinner"
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" opacity="0.25" />
      <path
        d="M21 12a9 9 0 00-9-9"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  onConfirm,
  onCancel,
  loading = false,
  variant = "primary",
}: ConfirmDialogProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !loading) onCancel();
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [loading, onCancel, open]);

  if (!open || !mounted) return null;

  const isDanger = variant === "danger";

  return createPortal(
    <div className="confirm-dialog-overlay" role="presentation">
      <button
        type="button"
        className="confirm-dialog-overlay__backdrop"
        aria-label="Close confirmation dialog"
        onClick={onCancel}
        disabled={loading}
      />

      <div
        className={["confirm-dialog", isDanger ? "confirm-dialog--danger" : "confirm-dialog--primary"]
          .filter(Boolean)
          .join(" ")}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        aria-describedby="confirm-dialog-message"
      >
        <IconButton
          label="Close dialog"
          size="sm"
          className="confirm-dialog__close"
          onClick={onCancel}
          disabled={loading}
        >
          <CloseIcon />
        </IconButton>

        <div className="confirm-dialog__content">
          <div
            className={[
              "confirm-dialog__icon",
              isDanger ? "confirm-dialog__icon--danger" : "confirm-dialog__icon--primary",
            ].join(" ")}
            aria-hidden="true"
          >
            {isDanger ? <DangerIcon /> : <InfoIcon />}
          </div>

          <div className="confirm-dialog__copy">
            <h2 id="confirm-dialog-title" className="confirm-dialog__title">
              {title}
            </h2>
            <p id="confirm-dialog-message" className="confirm-dialog__message">
              {message}
            </p>
          </div>
        </div>

        <div className="confirm-dialog__footer">
          <UiButton
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={loading}
            autoFocus
          >
            {cancelLabel}
          </UiButton>
          <UiButton
            type="button"
            variant="primary"
            className={isDanger ? "confirm-dialog__confirm--danger" : undefined}
            onClick={() => void onConfirm()}
            disabled={loading}
          >
            {loading ? (
              <>
                <LoadingSpinner />
                Processing…
              </>
            ) : (
              confirmLabel
            )}
          </UiButton>
        </div>
      </div>
    </div>,
    document.body
  );
}
