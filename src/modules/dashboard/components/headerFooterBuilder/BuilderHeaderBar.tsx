"use client";

import { MoreIcon, SaveIcon, UiButton } from "@/shared/components/ui";
import type {
  HeaderFooterReportType,
  HeaderFooterTemplateKind,
} from "../../types/headerFooterTemplate";
import {
  HEADER_FOOTER_RENDERER_URL,
  HEADER_FOOTER_RENDERER_VERSION,
} from "./rendererRegistry";

type BuilderHeaderBarProps = Readonly<{
  name: string;
  kind: HeaderFooterTemplateKind;
  reportType: HeaderFooterReportType | "";
  isNew: boolean;
  dirty: boolean;
  saving: boolean;
  onNameChange: (name: string) => void;
  onReportTypeChange: (reportType: HeaderFooterReportType | "") => void;
  onBack: () => void;
  onSave: () => void;
}>;

export function BuilderHeaderBar({
  name,
  kind,
  reportType,
  isNew,
  dirty,
  saving,
  onNameChange,
  onReportTypeChange,
  onBack,
  onSave,
}: BuilderHeaderBarProps) {
  return (
    <div className="hf-builder__header">
      <div className="hf-builder__header-left">
        <button
          type="button"
          className="hf-builder__icon-btn"
          onClick={onBack}
          aria-label="Back to templates"
          title="Back to templates"
        >
          <BackIcon />
        </button>

        <div className="hf-builder__name-field">
          <label className="hf-builder__name-label" htmlFor="hf-builder-name">
            Name
          </label>
          <input
            id="hf-builder-name"
            className="hf-builder__name-input"
            value={name}
            onChange={(event) => onNameChange(event.target.value)}
            placeholder="Template Name"
          />
        </div>

        <div className="hf-builder__name-field">
          <label className="hf-builder__name-label" htmlFor="hf-builder-report-type">
            Type
          </label>
          <select
            id="hf-builder-report-type"
            className="hf-builder__name-input hf-builder__type-select"
            value={reportType}
            onChange={(event) =>
              onReportTypeChange(event.target.value as HeaderFooterReportType | "")
            }
          >
            <option value="">Not Set</option>
            <option value="borelog">Borelog</option>
            <option value="corelog">Corelog</option>
          </select>
        </div>

        <span className="hf-builder__kind-badge">{kind === "header" ? "Header" : "Footer"}</span>
        {isNew ? (
          <span className="hf-builder__dirty">Draft</span>
        ) : dirty ? (
          <span className="hf-builder__dirty">Unsaved</span>
        ) : null}
      </div>

      <div className="hf-builder__header-right">
        <button type="button" className="hf-builder__icon-btn" aria-label="More options" disabled>
          <MoreIcon />
        </button>
        <UiButton
          variant="primary"
          size="sm"
          onClick={onSave}
          disabled={saving || !name.trim()}
          title="Ctrl+S"
        >
          <SaveIcon />
          {saving ? "Saving…" : isNew ? "Create" : "Save"}
        </UiButton>
        <div className="hf-builder__header-separator" />
       
      </div>
    </div>
  );
}

function BackIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M15 18l-6-6 6-6"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function LayersIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M12 3L3 8l9 5 9-5-9-5zM3 12l9 5 9-5M3 16l9 5 9-5"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
