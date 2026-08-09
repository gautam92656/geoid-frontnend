"use client";

import { useEffect, useId } from "react";
import { IconButton, ProjectModalPortal, UiButton } from "@/shared/components/ui";

type GraphicCatalogEntry = Readonly<{
  filename: string;
  label: string;
  url: string;
}>;

type SelectDrillingGraphicsModalProps = Readonly<{
  open: boolean;
  graphics: GraphicCatalogEntry[];
  selectedFilename: string | null | undefined;
  loading?: boolean;
  error?: string | null;
  disabled?: boolean;
  /** `column` = tall borehole symbols; `square` = water-obs / icon symbols. */
  variant?: "column" | "square";
  title?: string;
  subtitle?: string;
  listAriaLabel?: string;
  closeAriaLabel?: string;
  fallbackLabel?: (filename: string) => string;
  onClose: () => void;
  onSelect: (filename: string) => void;
}>;

function CloseIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M6 6l12 12M18 6L6 18"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function SelectDrillingGraphicsModal({
  open,
  graphics,
  selectedFilename,
  loading = false,
  error = null,
  disabled = false,
  variant = "column",
  title = "Select Drilling Type Graphic",
  subtitle = "Select a graphic for the currently adding or updating drilling type.",
  listAriaLabel = "Drilling type graphics",
  closeAriaLabel = "Close Select Drilling Graphic dialog",
  fallbackLabel,
  onClose,
  onSelect,
}: SelectDrillingGraphicsModalProps) {
  const titleId = useId();
  const isSquare = variant === "square";

  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.stopImmediatePropagation();
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown, true);
    return () => window.removeEventListener("keydown", handleKeyDown, true);
  }, [onClose, open]);

  return (
    <ProjectModalPortal open={open}>
      <div
        className="project-modal project-modal--stacked project-modal--nested"
        role="presentation"
      >
        <button
          type="button"
          className="project-modal__backdrop"
          aria-label={closeAriaLabel}
          onClick={onClose}
          disabled={disabled}
        />

        <div
          className={[
            "project-modal__dialog project-modal__dialog--scroll select-drilling-graphics-modal",
            isSquare ? "select-drilling-graphics-modal--square" : "",
          ]
            .filter(Boolean)
            .join(" ")}
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
        >
          <div className="select-drilling-graphics-modal__header">
            <div>
              <p id={titleId} className="select-drilling-graphics-modal__title">
                {title}
              </p>
              <p className="select-drilling-graphics-modal__subtitle">{subtitle}</p>
            </div>
            <IconButton
              label="Close"
              size="sm"
              className="select-drilling-graphics-modal__close"
              onClick={onClose}
              disabled={disabled}
            >
              <CloseIcon />
            </IconButton>
          </div>

          <hr className="select-drilling-graphics-modal__divider" />

          <div className="select-drilling-graphics-modal__body">
            {loading ? (
              <p className="select-drilling-graphics-modal__status">Loading graphics…</p>
            ) : error ? (
              <p className="select-drilling-graphics-modal__status is-error">{error}</p>
            ) : graphics.length === 0 ? (
              <p className="select-drilling-graphics-modal__status">No graphics found.</p>
            ) : (
              <div
                className="select-drilling-graphics-modal__grid"
                role="listbox"
                aria-label={listAriaLabel}
              >
                {graphics.map((graphic) => {
                  const selected = selectedFilename === graphic.filename;
                  const label =
                    graphic.label ||
                    fallbackLabel?.(graphic.filename) ||
                    graphic.filename;
                  return (
                    <button
                      key={graphic.filename}
                      type="button"
                      role="option"
                      aria-selected={selected}
                      className={[
                        "select-drilling-graphics-modal__card",
                        selected ? "is-selected" : "",
                      ]
                        .filter(Boolean)
                        .join(" ")}
                      disabled={disabled}
                      title={label}
                      onClick={() => onSelect(graphic.filename)}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={graphic.url}
                        alt={label}
                        className="select-drilling-graphics-modal__card-image"
                      />
                      <span className="select-drilling-graphics-modal__card-title">{label}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div className="select-drilling-graphics-modal__footer">
            <UiButton type="button" variant="ghost" disabled={disabled} onClick={onClose}>
              Close
            </UiButton>
          </div>
        </div>
      </div>
    </ProjectModalPortal>
  );
}
