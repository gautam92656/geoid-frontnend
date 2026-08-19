"use client";

import { useState } from "react";
import { UiButton } from "@/shared/components/ui";
import { REPORT_PREVIEW_TYPES, REPORT_PREVIEW_ZOOM } from "../data/logReportOptions";
import type { Project } from "../types/project";
import type { LogFormState } from "../types/log";
import type { LogReportPreviewState } from "../hooks/useLogReportPreviewState";
import type { DcpPoint, PreviewStratum } from "../utils/logReportPreviewUtils";
import { LogReportComposedSheet } from "./LogReportComposedSheet";

function InfoIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.5" />
      <path d="M12 11v5M12 8h.01" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

type LogReportPreviewProps = Readonly<{
  project: Project;
  form: LogFormState;
  report: LogReportPreviewState;
  companyName?: string | null;
  companyLogoUrl?: string | null;
  companyEmail?: string | null;
  phoneCode?: string | null;
  phoneNumber?: string | null;
  equipmentLabel?: string | null;
  supplierLabel?: string | null;
  subsurfaceLayers?: PreviewStratum[] | null;
  dcpPoints?: DcpPoint[] | null;
}>;

export function LogReportPreview({
  project,
  form,
  report,
  companyName,
  companyLogoUrl,
  companyEmail,
  phoneCode,
  phoneNumber,
  equipmentLabel,
  supplierLabel,
  subsurfaceLayers,
  dcpPoints,
}: LogReportPreviewProps) {
  const [zoom, setZoom] = useState<number>(REPORT_PREVIEW_ZOOM.default);
  const {
    previewType,
    setPreviewType,
    selection,
    selectedLogTemplate,
    selectedHeaderTemplate,
    selectedFooterTemplate,
    loadingLists,
  } = report;

  return (
    <aside className="log-report-preview" aria-label="Log report preview">
      {/* <div className="log-report-preview__banner">
        <InfoIcon />
        <p>
          Live preview of selected header, log template, and footer. Edit selections on the Log
          Report tab.
        </p>
      </div> */}

      <div className="log-report-preview__toolbar">
        <div className="log-report-preview__toolbar-start">
          <h3 className="log-report-preview__title">
            Preview New Log PDF
            <span
              className="log-report-preview__title-info"
              title="Updates live as you edit the log and report settings"
            >
              <InfoIcon />
            </span>
          </h3>
        </div>
        <div className="log-report-preview__toolbar-end">
          <UiButton type="button" variant="primary" size="sm">
            Save as PDF
          </UiButton>
        </div>
      </div>

      <div className="log-report-preview__controls">
        <div className="log-report-preview__type-tabs" role="tablist" aria-label="Preview type">
          {REPORT_PREVIEW_TYPES.map((type) => (
            <button
              key={type.id}
              type="button"
              role="tab"
              aria-selected={previewType === type.id}
              className={`log-report-preview__type-tab${previewType === type.id ? " is-active" : ""}`}
              onClick={() => setPreviewType(type.id)}
            >
              {type.label}
            </button>
          ))}
        </div>

        <label className="log-report-preview__zoom">
          <span>Zoom: {zoom}</span>
          <input
            type="range"
            min={REPORT_PREVIEW_ZOOM.min}
            max={REPORT_PREVIEW_ZOOM.max}
            step={REPORT_PREVIEW_ZOOM.step}
            value={zoom}
            onChange={(event) => setZoom(Number(event.target.value))}
            aria-label="Preview zoom"
          />
        </label>
      </div>

      <div className="log-report-preview__sheet-wrap ui-scrollbar">
        {loadingLists ? (
          <p className="log-report-preview__loading">Loading templates…</p>
        ) : (
          <LogReportComposedSheet
            project={project}
            form={form}
            previewType={previewType}
            selection={selection}
            logTemplate={selectedLogTemplate}
            headerTemplate={selectedHeaderTemplate}
            footerTemplate={selectedFooterTemplate}
            companyName={companyName}
            companyLogoUrl={companyLogoUrl}
            companyEmail={companyEmail}
            phoneCode={phoneCode}
            phoneNumber={phoneNumber}
            equipmentLabel={equipmentLabel}
            supplierLabel={supplierLabel}
            subsurfaceLayers={subsurfaceLayers}
            dcpPoints={dcpPoints}
            style={{ transform: `scale(${zoom / 100})`, transformOrigin: "top center" }}
          />
        )}
      </div>
    </aside>
  );
}
