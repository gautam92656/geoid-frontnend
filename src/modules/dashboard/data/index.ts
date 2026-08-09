/**
 * Shared dashboard constants — import from here or from individual modules.
 *
 * Domain options live under `src/modules/dashboard/data/`:
 * - logOptions.ts        — log types, statuses, finishing reasons
 * - logSections.ts       — update-log tab sections
 * - logReportOptions.ts  — borelog/corelog report config options
 * - logReportMeta.ts     — log report preview field builder
 * - projectOptions.ts    — project statuses and page tabs
 * - statusOptions.ts     — active/inactive entity statuses
 * - supplierOptions.ts   — supplier form options
 * - offices.ts           — office select options
 * - laboratories.ts      — laboratory select options
 * - serviceAreas.ts      — service area options
 * - branding.ts          — company name and logo
 *
 * Cross-module constants live under `src/shared/constants/`:
 * - pagination.ts        — table page size options
 */

export * from "./branding";
export * from "./laboratories";
export * from "./logOptions";
export * from "./logReportMeta";
export * from "./logReportOptions";
export * from "./logSections";
export * from "./offices";
export * from "./projectOptions";
export * from "./serviceAreas";
export * from "./statusOptions";
export * from "./supplierOptions";
