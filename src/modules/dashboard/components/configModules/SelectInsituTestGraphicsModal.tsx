"use client";

import { useEffect, useId } from "react";
import { IconButton, ProjectModalPortal, UiButton } from "@/shared/components/ui";
import {
  insituGraphicLabel,
  type InsituTestTypeGraphicCatalogEntry,
  type InsituTestTypeGraphicKind,
} from "../../utils/configModules/insituTestType";

type SelectInsituTestGraphicsModalProps = Readonly<{
  open: boolean;
  title: string;
  subtitle: string;
  graphics: InsituTestTypeGraphicCatalogEntry[];
  selectedFilename: string | null | undefined;
  kind?: InsituTestTypeGraphicKind;
  loading?: boolean;
  error?: string | null;
  disabled?: boolean;
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

export function SelectInsituTestGraphicsModal({
  open,
  title,
  subtitle,
  graphics,
  selectedFilename,
  kind = "test",
  loading = false,
  error = null,
  disabled = false,
  onClose,
  onSelect,
}: SelectInsituTestGraphicsModalProps) {
  const titleId = useId();
  const imageWide = kind === "top-bottom";

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
          aria-label={`Close ${title} dialog`}
          onClick={onClose}
          disabled={disabled}
        />

        <div
          className="project-modal__dialog project-modal__dialog--scroll select-insitu-test-graphics-modal"
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
        >
          <div className="select-insitu-test-graphics-modal__header">
            <div>
              <p id={titleId} className="select-insitu-test-graphics-modal__title">
                {title}
              </p>
              <p className="select-insitu-test-graphics-modal__subtitle">{subtitle}</p>
            </div>
            <IconButton
              label="Close"
              size="sm"
              className="select-insitu-test-graphics-modal__close"
              onClick={onClose}
              disabled={disabled}
            >
              <CloseIcon />
            </IconButton>
          </div>

          <hr className="select-insitu-test-graphics-modal__divider" />

          <div className="select-insitu-test-graphics-modal__body">
            {loading ? (
              <p className="select-insitu-test-graphics-modal__status">Loading graphics…</p>
            ) : error ? (
              <p className="select-insitu-test-graphics-modal__status is-error">{error}</p>
            ) : graphics.length === 0 ? (
              <p className="select-insitu-test-graphics-modal__status">No graphics found.</p>
            ) : (
              <div
                className={[
                  "select-insitu-test-graphics-modal__grid",
                  imageWide ? "select-insitu-test-graphics-modal__grid--top-bottom" : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
                role="listbox"
                aria-label={title}
              >
                {graphics.map((graphic) => {
                  const selected = selectedFilename === graphic.filename;
                  const label =
                    graphic.label || insituGraphicLabel(graphic.filename, graphic.kind ?? kind);
                  return (
                    <button
                      key={graphic.filename}
                      type="button"
                      role="option"
                      aria-selected={selected}
                      className={[
                        "select-insitu-test-graphics-modal__card",
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
                        className={[
                          "select-insitu-test-graphics-modal__card-image",
                          imageWide
                            ? "select-insitu-test-graphics-modal__card-image--wide"
                            : "",
                        ]
                          .filter(Boolean)
                          .join(" ")}
                      />
                      <span className="select-insitu-test-graphics-modal__card-title">
                        {label}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div className="select-insitu-test-graphics-modal__footer">
            <UiButton type="button" variant="ghost" disabled={disabled} onClick={onClose}>
              Close
            </UiButton>
          </div>
        </div>
      </div>
    </ProjectModalPortal>
  );
}
