"use client";

import { useRef } from "react";
import { FormField, Input, Select, UiButton } from "@/shared/components/ui";
import {
  LOG_BUILDER_VERSION_OPTIONS,
  REPORT_ORIENTATION_OPTIONS,
  REPORT_PAGE_SIZE_OPTIONS,
  REPORT_PREVIEW_TYPES,
} from "../data/logReportOptions";
import type { Project } from "../types/project";
import type { LogFormState } from "../types/log";
import type { LogReportPreviewState } from "../hooks/useLogReportPreviewState";
import {
  LOG_REPORT_COMPOSED_PRINT_STYLES,
  LogReportComposedSheet,
} from "./LogReportComposedSheet";

function PrintPreviewIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M7 17h10v4H7v-4zM7 3h10v5H7V3z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path
        d="M5 8h14a2 2 0 012 2v5H3v-5a2 2 0 012-2z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path d="M17 13h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function ExternalLinkIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M14 3h7v7M10 14L21 3M21 10v11H3V3h11"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function HelpIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M9.5 9.5a2.5 2.5 0 014.5 1.5c0 2-2.5 2-2.5 4"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <circle cx="12" cy="17" r="0.75" fill="currentColor" />
    </svg>
  );
}

type LogReportSectionProps = Readonly<{
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
}>;

export function LogReportSection({
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
}: LogReportSectionProps) {
  const sheetRef = useRef<HTMLElement>(null);
  const {
    previewType,
    setPreviewType,
    selection,
    updateSelection,
    templateOptions,
    headerOptions,
    footerOptions,
    selectedLogTemplate,
    selectedHeaderTemplate,
    selectedFooterTemplate,
    loadingLists,
  } = report;

  const isCorelog = previewType === "corelog";
  const selectsDisabled = loadingLists;

  const openPreviewDocument = (printAfterOpen: boolean) => {
    const sheet = sheetRef.current;
    if (!sheet) return;

    const clone = sheet.cloneNode(true) as HTMLElement;
    clone.style.transform = "";
    const sheetHtml = clone.outerHTML;

    const previewWindow = window.open(
      "",
      "_blank",
      printAfterOpen ? "noopener,noreferrer,width=900,height=700" : "noopener,noreferrer"
    );
    if (!previewWindow) return;

    const reportTitle = previewType === "borelog" ? "Borelog Report" : "Corelog Report";

    previewWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>${form.logNumber || "Log"} · ${reportTitle}</title>
          <style>${LOG_REPORT_COMPOSED_PRINT_STYLES}</style>
        </head>
        <body>${sheetHtml}</body>
      </html>
    `);
    previewWindow.document.close();

    if (printAfterOpen) {
      previewWindow.focus();
      previewWindow.print();
    }
  };

  return (
    <section className="log-report-section" aria-label="Log report">
      <div className="log-report-section__top">
        <div className="log-report-section__top-main">
          <h2 className="log-report-section__title">Preview New Log PDF</h2>
          <div className="log-report-section__type-tabs" role="tablist" aria-label="Report type">
            {REPORT_PREVIEW_TYPES.map((type) => (
              <button
                key={type.id}
                type="button"
                role="tab"
                aria-selected={previewType === type.id}
                className={`log-report-section__type-tab${previewType === type.id ? " is-active" : ""}`}
                onClick={() => setPreviewType(type.id)}
              >
                {type.label}
              </button>
            ))}
          </div>
        </div>

        <div className="log-report-section__actions">
          {/* <UiButton
            type="button"
            variant="outline"
            size="sm"
            onClick={() => openPreviewDocument(true)}
          >
            <PrintPreviewIcon />
            Print Preview
          </UiButton> */}
          <UiButton
            type="button"
            variant="outline"
            size="sm"
            onClick={() => openPreviewDocument(false)}
          >
            <ExternalLinkIcon />
            Open in new tab
          </UiButton>
        </div>
      </div>

      <div
        className="log-report-section__config"
        role="tabpanel"
        aria-label={isCorelog ? "Corelog settings" : "Borelog settings"}
      >
        <FormField label="Select template">
          <Select
            value={selection.templateId}
            onChange={(value) => updateSelection("templateId", value)}
            options={templateOptions}
            placeholder={loadingLists ? "Loading templates…" : "Select template"}
            disabled={selectsDisabled}
            search
            searchPlaceholder="Search templates…"
          />
        </FormField>

        <FormField label="Select Orientation">
          <Select
            value={selection.orientation}
            onChange={(value) => updateSelection("orientation", value)}
            options={REPORT_ORIENTATION_OPTIONS}
            disabled={selectsDisabled}
          />
        </FormField>

        <FormField label="Select Page Size">
          <Select
            value={selection.pageSize}
            onChange={(value) => updateSelection("pageSize", value)}
            options={REPORT_PAGE_SIZE_OPTIONS}
            disabled={selectsDisabled}
          />
        </FormField>

        <FormField label="Select header">
          <Select
            value={selection.headerId}
            onChange={(value) => updateSelection("headerId", value)}
            options={headerOptions}
            placeholder={loadingLists ? "Loading headers…" : "Select header"}
            disabled={selectsDisabled}
            search
            searchPlaceholder="Search headers…"
          />
        </FormField>

        <FormField label="Select footer">
          <Select
            value={selection.footerId}
            onChange={(value) => updateSelection("footerId", value)}
            options={footerOptions}
            placeholder={loadingLists ? "Loading footers…" : "Select footer"}
            disabled={selectsDisabled}
            search
            searchPlaceholder="Search footers…"
          />
        </FormField>

        <FormField label="Metres/Page">
          <Input
            variant="ui"
            type="number"
            min={0}
            step={isCorelog ? "0.5" : "0.1"}
            placeholder="Metres/Page"
            value={selection.metresPerPage}
            onChange={(event) => updateSelection("metresPerPage", event.target.value)}
            disabled={selectsDisabled}
          />
        </FormField>

        {isCorelog ? (
          <FormField label="Select Log Builder Version">
            <div className="log-report-section__builder-version">
              <Select
                value={selection.builderVersion}
                onChange={(value) => updateSelection("builderVersion", value)}
                options={LOG_BUILDER_VERSION_OPTIONS}
                disabled={selectsDisabled}
              />
              <span
                className="log-report-section__help-icon"
                title="Latest uses the current log builder release"
              >
                <HelpIcon />
              </span>
            </div>
          </FormField>
        ) : null}
      </div>

      {report.error ? (
        <p className="log-report-section__error" role="alert">
          {report.error}
        </p>
      ) : null}

      {/* <div className="log-report-section__sheet-wrap ui-scrollbar">
        <LogReportComposedSheet
          ref={sheetRef}
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
        />
      </div> */}
    </section>
  );
}
