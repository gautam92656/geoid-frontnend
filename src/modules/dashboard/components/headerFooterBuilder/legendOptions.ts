/**
 * Legend cell options for header/footer templates.
 *
 * Contract comes from Tablogs header-footer-renderer 0.1.28
 * (flatCellToColProxy / resolveLegendData / renderLegendContent).
 *
 * HAR `header-template-legend.har` shows switching legend type in the builder
 * loads different graphic sets:
 *   - water_observations_graphics/*
 *   - testing-and-sample-type-graphics/*
 *   - drilling_method_graphics/* (+ /api/drilling-type)
 * plus renderer specials: subsurface_graphics, site_plan_icons.
 *
 * Impact: `content` (primary type) and optional `legendTypes` are what the
 * renderer passes to LegendDataResolver.resolveLegend(). Without a type the
 * cell renders the “Select Log and Legend Type…” placeholder.
 */

export const HF_LEGEND_TYPE_OPTIONS = [
  { value: "water_observations", label: "Water Observations" },
  { value: "testing_and_sample_type", label: "Testing & Sample Types" },
  { value: "drilling_method", label: "Drilling Methods" },
  { value: "subsurface_graphics", label: "Subsurface Graphics" },
  { value: "site_plan_icons", label: "Site Plan Icons" },
] as const;

export type HfLegendType = (typeof HF_LEGEND_TYPE_OPTIONS)[number]["value"];

export const HF_LEGEND_VISIBILITY_OPTIONS = [
  { value: "all", label: "Show all" },
  { value: "used-only", label: "Used in log only" },
  { value: "custom", label: "Custom selection" },
] as const;

export type HfLegendVisibility = (typeof HF_LEGEND_VISIBILITY_OPTIONS)[number]["value"];

export const HF_LEGEND_SORT_OPTIONS = [
  { value: "default", label: "Default order" },
  { value: "az", label: "A → Z" },
  { value: "za", label: "Z → A" },
  { value: "by-presence", label: "By presence (depth order)" },
] as const;

export type HfLegendSort = (typeof HF_LEGEND_SORT_OPTIONS)[number]["value"];

export const HF_LEGEND_COLUMN_CONTENT_OPTIONS = [
  { value: "graphic", label: "Graphic" },
  { value: "label", label: "Label" },
  { value: "depth", label: "Depth" },
  { value: "date", label: "Date" },
  { value: "time", label: "Time" },
] as const;

export type HfLegendColumnContent =
  (typeof HF_LEGEND_COLUMN_CONTENT_OPTIONS)[number]["value"];

export type HfLegendColumnDef = {
  content: HfLegendColumnContent;
  widthPct: number;
  prefix?: string;
  suffix?: string;
  paddingLeft?: number;
  xOffset?: number;
  fontBold?: boolean;
  fontItalic?: boolean;
  fontUnderline?: boolean;
  fontColor?: string;
  fontFamily?: string;
  fontSize?: string;
};

export type HfLegendCustomItem = {
  imageUrl: string;
  label: string;
  legendType?: string;
};

export function legendTypeLabel(value: string | undefined | null): string {
  if (!value) return "Not selected";
  const match = HF_LEGEND_TYPE_OPTIONS.find((option) => option.value === value);
  return match?.label ?? value;
}

export function defaultLegendColumnDefs(): HfLegendColumnDef[] {
  return [
    { content: "graphic", widthPct: 30 },
    { content: "label", widthPct: 70 },
  ];
}
