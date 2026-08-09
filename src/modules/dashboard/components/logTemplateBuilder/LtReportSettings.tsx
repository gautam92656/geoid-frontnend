"use client";

import { FormField, Input, Select } from "@/shared/components/ui";
import type { LogTemplateColumn, LogTemplateConfig } from "../../types/logTemplate";
import { LOG_TEMPLATE_ORIENTATIONS, LOG_TEMPLATE_PAGE_SIZES } from "./contentSchema";
import { LtSwitch } from "./LtSwitch";

type ReportSettingsPatch = Partial<
  Pick<
    LogTemplateConfig,
    | "depth_per_page"
    | "template_page_size"
    | "template_orientation"
    | "hide_all_column_headings"
    | "hide_watermark"
    | "finish_log_target_column_id"
    | "extend_column_boundaries_type"
  >
>;

type LtReportSettingsProps = Readonly<{
  config: LogTemplateConfig;
  columns: LogTemplateColumn[];
  onChange: (patch: ReportSettingsPatch) => void;
}>;

const ORIENTATION_OPTIONS = LOG_TEMPLATE_ORIENTATIONS.map((orientation) => ({
  value: orientation,
  label: orientation === "portrait" ? "Portrait" : "Landscape",
}));

const EXTEND_BOUNDARY_OPTIONS = [
  { value: "bottom", label: "To bottom of page" },
  { value: "content", label: "To end of content" },
  { value: "none", label: "Do not extend" },
];

export function LtReportSettings({ config, columns, onChange }: LtReportSettingsProps) {
  const finishColumnOptions = [
    { value: "", label: "Not set" },
    ...columns.map((column) => ({ value: column.code, label: column.text })),
  ];

  return (
    <section className="lt-fmt__panel ui-scrollbar">
      <div className="lt-fmt__section">
        <h3 className="lt-fmt__section-title">Page</h3>
        <div className="lt-fmt__grid">
          <FormField label="Page size" htmlFor="lt-page-size">
            <Select
              id="lt-page-size"
              value={config.template_page_size ?? "A4"}
              options={LOG_TEMPLATE_PAGE_SIZES.map((size) => ({ value: size, label: size }))}
              onChange={(value) => onChange({ template_page_size: value })}
            />
          </FormField>

          <FormField label="Orientation" htmlFor="lt-orientation">
            <Select
              id="lt-orientation"
              value={config.template_orientation ?? "portrait"}
              options={ORIENTATION_OPTIONS}
              onChange={(value) =>
                onChange({
                  template_orientation: value === "landscape" ? "landscape" : "portrait",
                })
              }
            />
          </FormField>

          <FormField label="Depth per page (m)" htmlFor="lt-depth-per-page">
            <Input
              id="lt-depth-per-page"
              variant="ui"
              type="number"
              min={0.1}
              step={0.1}
              value={String(config.depth_per_page ?? 2)}
              onChange={(event) => onChange({ depth_per_page: Number(event.target.value) || 0 })}
            />
          </FormField>
        </div>
      </div>

      <div className="lt-fmt__section">
        <h3 className="lt-fmt__section-title">Log finish text</h3>
        <p className="lt-fmt__section-note">
          Choose which column the log finish text is written into and how boundaries extend.
        </p>
        <div className="lt-fmt__grid" style={{ marginTop: 12 }}>
          <FormField label="Target column" htmlFor="lt-finish-column">
            <Select
              id="lt-finish-column"
              value={config.finish_log_target_column_id ?? ""}
              options={finishColumnOptions}
              placeholder="Not set"
              onChange={(value) => onChange({ finish_log_target_column_id: value })}
            />
          </FormField>

          <FormField label="Extend column boundaries" htmlFor="lt-extend-boundaries">
            <Select
              id="lt-extend-boundaries"
              value={config.extend_column_boundaries_type ?? "bottom"}
              options={EXTEND_BOUNDARY_OPTIONS}
              onChange={(value) => onChange({ extend_column_boundaries_type: value })}
            />
          </FormField>
        </div>
      </div>

      <div className="lt-fmt__section">
        <h3 className="lt-fmt__section-title">Visibility</h3>
        <div className="lt-fmt__options-row">
          <LtSwitch
            showLabel
            label="Hide all column headings"
            checked={Boolean(config.hide_all_column_headings)}
            onChange={(checked) => onChange({ hide_all_column_headings: checked })}
          />
          <LtSwitch
            showLabel
            label="Hide watermark"
            checked={Boolean(config.hide_watermark)}
            onChange={(checked) => onChange({ hide_watermark: checked })}
          />
        </div>
      </div>
    </section>
  );
}
