"use client";

import { useEffect, useRef } from "react";
import { LogReportComposedSheet } from "./LogReportComposedSheet";
import type { Project } from "../types/project";
import type { LogReportExportSheetJob } from "../utils/logReportExportData";
import { waitForLogReportImages } from "../utils/logReportPdfExport";

const LEGEND_SETTLE_MS = 400;

type LogReportExportCaptureProps = Readonly<{
  project: Project;
  job: LogReportExportSheetJob | null;
  onReady: (sheet: HTMLElement) => void;
}>;

export function LogReportExportCapture({
  project,
  job,
  onReady,
}: LogReportExportCaptureProps) {
  const sheetRef = useRef<HTMLElement>(null);
  const onReadyRef = useRef(onReady);
  onReadyRef.current = onReady;

  useEffect(() => {
    if (!job) return;

    let cancelled = false;
    let settleTimer: number | null = null;

    const run = async () => {
      await new Promise<void>((resolve) => {
        requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
      });
      if (cancelled) return;

      const sheet = sheetRef.current;
      if (!sheet) return;

      if (document.fonts?.ready) {
        await document.fonts.ready.catch(() => undefined);
      }
      await waitForLogReportImages(sheet);
      await new Promise<void>((resolve) => {
        settleTimer = window.setTimeout(resolve, LEGEND_SETTLE_MS);
      });
      if (cancelled) return;
      onReadyRef.current(sheet);
    };

    void run();

    return () => {
      cancelled = true;
      if (settleTimer != null) window.clearTimeout(settleTimer);
    };
  }, [job]);

  if (!job) return null;

  return (
    <div className="log-report-export-capture" aria-hidden="true">
      <LogReportComposedSheet
        key={job.key}
        ref={sheetRef}
        project={project}
        form={job.form}
        previewType={job.previewType}
        selection={job.selection}
        logTemplate={job.logTemplate}
        headerTemplate={job.headerTemplate}
        footerTemplate={job.footerTemplate}
        companyName={job.companyName}
        companyLogoUrl={job.companyLogoUrl}
        companyEmail={job.companyEmail}
        phoneCode={job.phoneCode}
        phoneNumber={job.phoneNumber}
        equipmentLabel={job.equipmentLabel}
        supplierLabel={job.supplierLabel}
        subsurfaceLayers={job.subsurfaceLayers}
        dcpPoints={job.dcpPoints}
        drillingIntervals={job.drillingIntervals}
        pspBands={job.pspBands}
        waterObservations={job.waterObservations}
        wellIntervals={job.wellIntervals}
      />
    </div>
  );
}
