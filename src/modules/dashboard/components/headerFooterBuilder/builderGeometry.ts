import type { PageOrientation, PageSize } from "./contentSchema";

const DPI = 96;
const MM_PER_INCH = 25.4;

export const PAGE_SIZE_MM: Record<PageSize, { width: number; height: number }> = {
  A4: { width: 210, height: 297 },
  Letter: { width: 215.9, height: 279.4 },
  Legal: { width: 215.9, height: 355.6 },
};

export function mmToPx(mm: number): number {
  return (mm / MM_PER_INCH) * DPI;
}

export function pxToMm(px: number): number {
  return (px / DPI) * MM_PER_INCH;
}

export function getPageDimensionsMm(
  size: PageSize,
  orientation: PageOrientation
): { widthMm: number; heightMm: number } {
  const base = PAGE_SIZE_MM[size];
  if (orientation === "landscape") {
    return { widthMm: base.height, heightMm: base.width };
  }
  return { widthMm: base.width, heightMm: base.height };
}

export function getPageDimensionsPx(
  size: PageSize,
  orientation: PageOrientation
): { width: number; height: number } {
  const { widthMm, heightMm } = getPageDimensionsMm(size, orientation);
  return { width: mmToPx(widthMm), height: mmToPx(heightMm) };
}

export function formatPageLabel(size: PageSize, orientation: PageOrientation): string {
  const { widthMm, heightMm } = getPageDimensionsMm(size, orientation);
  const { width, height } = getPageDimensionsPx(size, orientation);
  return `${size} ${orientation} - ${Math.round(widthMm)}mm × ${Math.round(heightMm)}mm (${Math.round(width)}px × ${Math.round(height)}px @ 96DPI)`;
}

/** Page margin used by the canvas (matches reference ~36px). */
export const PAGE_MARGIN_PX = 36;

export function columnBoundaryXs(
  startX: number,
  totalWidth: number,
  columnWidths: number[]
): number[] {
  const boundaries = [startX];
  let cursor = startX;
  for (const weight of columnWidths) {
    cursor += totalWidth * weight;
    boundaries.push(cursor);
  }
  return boundaries;
}

export function columnIndexFromBoundary(boundary: number): number {
  return boundary;
}
