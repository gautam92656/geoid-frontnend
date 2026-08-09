"use client";

import { useMemo } from "react";
import { FormField, MultiSelect } from "@/shared/components/ui";
import type { LogTemplateColumn, LogTemplateSelectionGroup } from "../../types/logTemplate";
import {
  WELL_DIAGRAM_COMMENT_TOGGLES,
  WELL_DIAGRAM_LABEL_TOGGLES,
  WELL_DIAGRAM_WIDTH_ROWS,
  getWellDiagramRemainingWidth,
  isOptionOn,
  type FieldToggle,
  type WellDiagramWidthRow,
} from "./columnTypeFields";
import { LtSwitch } from "./LtSwitch";

type LtWellDiagramSectionProps = Readonly<{
  column: LogTemplateColumn;
  selectionGroups: LogTemplateSelectionGroup[];
  onColumnChange: (patch: Partial<LogTemplateColumn>) => void;
}>;

function ToggleRow({
  option,
  column,
  onColumnChange,
}: Readonly<{
  option: FieldToggle;
  column: LogTemplateColumn;
  onColumnChange: (patch: Partial<LogTemplateColumn>) => void;
}>) {
  return (
    <LtSwitch
      showLabel
      label={option.label}
      checked={isOptionOn(column, option.key)}
      onChange={(checked) => {
        const patch: Partial<LogTemplateColumn> = { [option.key]: checked };
        // Keep legacy key in sync with Angular split label toggle.
        if (option.key === "show_well_type_labels") {
          patch.show_well_type = checked;
        }
        onColumnChange(patch);
      }}
    />
  );
}

function WidthRow({
  row,
  column,
  remaining,
  onColumnChange,
}: Readonly<{
  row: WellDiagramWidthRow;
  column: LogTemplateColumn;
  remaining: number;
  onColumnChange: (patch: Partial<LogTemplateColumn>) => void;
}>) {
  const width = Number(column[row.widthKey] ?? 0) || 0;

  return (
    <div className="lt-fmt__well-width-row">
      <div className="lt-fmt__well-width-toggle">
        <LtSwitch
          showLabel
          label={row.label}
          checked={isOptionOn(column, row.toggleKey)}
          onChange={(checked) => onColumnChange({ [row.toggleKey]: checked })}
        />
        {row.hint ? <p className="lt-fmt__section-note">{row.hint}</p> : null}
      </div>
      <div className="lt-fmt__well-width-slider">
        {row.showWidthLabel ? (
          <div className="lt-fmt__width-head">
            <span className="lt-fmt__width-value">Width (% of column)</span>
          </div>
        ) : null}
        <div className="lt-fmt__well-width-value">{width}</div>
        <input
          type="range"
          min={0}
          max={100}
          step={1}
          className="lt-fmt__slider-input"
          value={Math.min(Math.max(width, 0), 100)}
          aria-label={`${row.label} width`}
          onChange={(event) =>
            onColumnChange({ [row.widthKey]: Number(event.target.value) })
          }
        />
        <span className={`lt-fmt__width-remaining${remaining < 0 ? " is-over" : ""}`}>
          {remaining}% column remains
        </span>
      </div>
    </div>
  );
}

export function LtWellDiagramSection({
  column,
  selectionGroups,
  onColumnChange,
}: LtWellDiagramSectionProps) {
  const remaining = getWellDiagramRemainingWidth(column);

  const waterOptions = useMemo(() => {
    const group = selectionGroups.find((entry) => entry.code === "all_waters");
    if (!group) return [];
    return group.data.map((item) => ({ value: item.code, label: item.name }));
  }, [selectionGroups]);

  const selectedWaters = Array.isArray(column.selected_water_types_on_well_log)
    ? column.selected_water_types_on_well_log.map((entry) => String(entry))
    : [];

  return (
    <div className="lt-fmt__section">
      <h3 className="lt-fmt__section-title">Well Diagram</h3>

      <div className="lt-fmt__options-row">
        {WELL_DIAGRAM_LABEL_TOGGLES.map((option) => (
          <ToggleRow
            key={option.key}
            option={option}
            column={column}
            onColumnChange={onColumnChange}
          />
        ))}
      </div>

      <div className="lt-fmt__options-row" style={{ marginTop: 14 }}>
        {WELL_DIAGRAM_COMMENT_TOGGLES.map((option) => (
          <ToggleRow
            key={option.key}
            option={option}
            column={column}
            onColumnChange={onColumnChange}
          />
        ))}
      </div>

      <div className="lt-fmt__well-width-list">
        {WELL_DIAGRAM_WIDTH_ROWS.map((row) => (
          <WidthRow
            key={row.toggleKey}
            row={row}
            column={column}
            remaining={remaining}
            onColumnChange={onColumnChange}
          />
        ))}
      </div>

      <FormField label="Select Water Symbols To Show" htmlFor="lt-well-water-symbols">
        <MultiSelect
          id="lt-well-water-symbols"
          value={selectedWaters}
          options={waterOptions}
          placeholder="All Waters"
          search
          onChange={(values) =>
            onColumnChange({ selected_water_types_on_well_log: values })
          }
        />
      </FormField>
    </div>
  );
}
