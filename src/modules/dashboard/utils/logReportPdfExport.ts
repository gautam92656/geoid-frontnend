"use client";

export type LogReportPdfExportOptions = {
  logNumber?: string | null;
  pageWidthPx: number;
  pageHeightPx: number;
};

const CSS_PX_PER_INCH = 96;
const MM_PER_INCH = 25.4;

function pxToMm(px: number): number {
  return (px / CSS_PX_PER_INCH) * MM_PER_INCH;
}

function resetExportTransforms(root: HTMLElement): void {
  let node: HTMLElement | null = root;
  while (node) {
    // Only clear zoom/scale wrappers — keep intentional child transforms
    // (e.g. vertical column headers use rotate(-90deg)).
    if (
      node.classList.contains("log-report-composed__pages") ||
      node.classList.contains("log-report-preview__sheet-wrap") ||
      node === root
    ) {
      if (node.style.transform.includes("scale") || node.classList.contains("log-report-composed__pages")) {
        node.style.transform = node.classList.contains("log-report-composed__pages")
          ? "none"
          : node.style.transform.replace(/scale\([^)]*\)/g, "scale(1)");
      }
      if (node.classList.contains("log-report-composed__pages")) {
        node.style.transform = "none";
        node.style.gap = "0";
        node.style.margin = "0";
      }
    }
    node.style.zoom = "1";
    node = node.parentElement;
  }

  // Ensure the captured page itself is unscaled.
  root.style.transform = "none";
  root.style.transformOrigin = "top left";
}

async function waitForImages(root: HTMLElement): Promise<void> {
  const images = Array.from(root.querySelectorAll("img"));
  await Promise.all(
    images.map(
      (image) =>
        new Promise<void>((resolve) => {
          if (image.complete) {
            resolve();
            return;
          }
          const done = () => resolve();
          image.addEventListener("load", done, { once: true });
          image.addEventListener("error", done, { once: true });
        })
    )
  );
}

/**
 * Captures every `.log-report-composed` page inside `sheet` and writes each one to
 * its own PDF page (one image per page, at matching physical dimensions), so a log
 * that spans multiple Metres/Page windows downloads as a real multi-page PDF.
 */
export async function exportLogReportPdf(
  sheet: HTMLElement,
  { logNumber, pageWidthPx, pageHeightPx }: LogReportPdfExportOptions
): Promise<void> {
  const pageNodes = Array.from(sheet.querySelectorAll<HTMLElement>(".log-report-composed"));
  const nodes = pageNodes.length > 0 ? pageNodes : [sheet];

  await waitForImages(sheet);

  const [{ default: jsPDF }, { default: html2canvas }] = await Promise.all([
    import("jspdf"),
    import("html2canvas"),
  ]);

  const pageWidthMm = pxToMm(pageWidthPx);
  const pageHeightMm = pxToMm(pageHeightPx);
  const orientation = pageWidthPx >= pageHeightPx ? "landscape" : "portrait";
  const pdf = new jsPDF({
    orientation,
    unit: "mm",
    format: [pageWidthMm, pageHeightMm],
    compress: true,
  });

  for (let index = 0; index < nodes.length; index += 1) {
    const node = nodes[index];
    const canvas = await html2canvas(node, {
      scale: 2.5,
      useCORS: true,
      allowTaint: false,
      logging: false,
      backgroundColor: "#ffffff",
      imageTimeout: 15000,
      letterRendering: true,
      onclone: (_document, clonedNode) => {
        resetExportTransforms(clonedNode);
      },
    });

    // PNG keeps vertical header glyphs sharper than JPEG.
    const imageData = canvas.toDataURL("image/png");
    if (index > 0) {
      pdf.addPage([pageWidthMm, pageHeightMm], orientation);
    }
    pdf.addImage(imageData, "PNG", 0, 0, pageWidthMm, pageHeightMm, undefined, "FAST");
  }

  const safeName = (logNumber ?? "").toString().trim().replace(/[^\w.-]+/g, "_") || "Log";
  pdf.save(`${safeName}.pdf`);
}
