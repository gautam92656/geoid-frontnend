"use client";

import { useMemo } from "react";
import { FormField, Input, MultiSelect, Select, UiButton } from "@/shared/components/ui";
import type { LogTemplateColumn, LogTemplateSelectionGroup } from "../../types/logTemplate";
import {
  DEPTH_MARKER_OPTIONS,
  SCALE_DECIMAL_OPTIONS,
  SCALE_SOURCE_OPTIONS,
  createEmptyStringBuilderColumn,
  getSelectedDepthOptions,
  getStringBuilderColumns,
  isOptionOn,
  shouldShowScaleGraphics,
  shouldShowScaleMajorMinor,
  type FieldToggle,
  type StringBuilderColumn,
} from "./columnTypeFields";
import { LtSwitch } from "./LtSwitch";
import { getDataSourceValue } from "./selectDataBinding";

type LtScaleDisplaySectionProps = Readonly<{
  column: LogTemplateColumn;
  selectionGroups: LogTemplateSelectionGroup[];
  dataDisplayToggles: FieldToggle[];
  visualStyleToggles: FieldToggle[];
  onColumnChange: (patch: Partial<LogTemplateColumn>) => void;
}>;

const DEPTH_UNIT_OPTIONS = [
  { value: "units_of_data", label: "Units of data" },
  { value: "m", label: "m" },
  { value: "ft", label: "ft" },
];

function ToggleOption({
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
      onChange={(checked) => onColumnChange({ [option.key]: checked })}
    />
  );
}

export function LtScaleDisplaySection({
  column,
  selectionGroups,
  dataDisplayToggles,
  visualStyleToggles,
  onColumnChange,
}: LtScaleDisplaySectionProps) {
  const selectedDepth = getSelectedDepthOptions(column);
  const depthMarkerValues = useMemo(
    () => selectedDepth.map((option) => option.value),
    [selectedDepth]
  );
  const showMajorMinor = shouldShowScaleMajorMinor(column);
  const showGraphics = shouldShowScaleGraphics(column);
  const graphics = getStringBuilderColumns(column);
  const scaleValue = getDataSourceValue(column);

  const scaleOptions = useMemo(() => {
    const known = new Map<string, string>(
      SCALE_SOURCE_OPTIONS.map((option) => [option.value, option.label])
    );
    const group = selectionGroups.find((entry) => entry.code === "all_scales");
    if (group) {
      group.data.forEach((item) => {
        if (!known.has(item.code)) known.set(item.code, item.name);
      });
    }
    return Array.from(known.entries()).map(([value, label]) => ({ value, label }));
  }, [selectionGroups]);

  const graphicDataOptions = useMemo(
    () =>
      selectionGroups.flatMap((group) =>
        group.data.map((item) => ({
          value: `${group.code}::${item.code}`,
          label: `${group.name} — ${item.name}`,
        }))
      ),
    [selectionGroups]
  );

  const setScaleSource = (value: string) => {
    onColumnChange({
      column_data_source: { group: "all_scales", value },
      scaleSource: value,
    });
  };

  const updateGraphics = (next: StringBuilderColumn[]) => {
    onColumnChange({ stringBuilderColumns: next });
  };

  const addGraphic = () => {
    updateGraphics([...graphics, createEmptyStringBuilderColumn()]);
  };

  return (
    <div className="lt-fmt__scale-display">
      {/* Scale Source */}
      <div className="lt-fmt__section">
        <FormField label="Scale Source" htmlFor="lt-scale-source">
          <Select
            id="lt-scale-source"
            value={scaleValue}
            placeholder="Select Scale Source..."
            options={scaleOptions}
            onChange={setScaleSource}
          />
        </FormField>
      </div>

      {/* Display options (Angular app-display-options) */}
      {dataDisplayToggles.length > 0 || visualStyleToggles.length > 0 ? (
        <div className="lt-fmt__section">
          {dataDisplayToggles.length > 0 ? (
            <div className="lt-fmt__option-group">
              <h4 className="lt-fmt__group-heading">Data Display</h4>
              <div className="lt-fmt__options-row">
                {dataDisplayToggles.map((option) => (
                  <ToggleOption
                    key={option.key}
                    option={option}
                    column={column}
                    onColumnChange={onColumnChange}
                  />
                ))}
              </div>
              {isOptionOn(column, "include_depth") ? (
                <div className="lt-fmt__logic-row" style={{ marginTop: 10 }}>
                  <FormField label="Depth unit" htmlFor="lt-scale-depth-unit">
                    <Select
                      id="lt-scale-depth-unit"
                      value={String(column.include_depth_unit_option ?? "units_of_data")}
                      options={DEPTH_UNIT_OPTIONS}
                      onChange={(value) => onColumnChange({ include_depth_unit_option: value })}
                    />
                  </FormField>
                </div>
              ) : null}
            </div>
          ) : null}

          {visualStyleToggles.length > 0 ? (
            <div className="lt-fmt__option-group">
              <h4 className="lt-fmt__group-heading">Visual Style</h4>
              <div className="lt-fmt__options-row">
                {visualStyleToggles.map((option) => (
                  <ToggleOption
                    key={option.key}
                    option={option}
                    column={column}
                    onColumnChange={onColumnChange}
                  />
                ))}
              </div>
            </div>
          ) : null}
        </div>
      ) : null}

      {/* Depth Markers + Number display */}
      <div className="lt-fmt__section">
        <FormField label="Depth Markers" htmlFor="lt-scale-depth-markers">
          <MultiSelect
            id="lt-scale-depth-markers"
            value={depthMarkerValues}
            options={DEPTH_MARKER_OPTIONS}
            placeholder="Select depth markers…"
            search
            onChange={(values) =>
              onColumnChange({
                selectedDepthOptions: values.map((value) => {
                  const known = DEPTH_MARKER_OPTIONS.find((option) => option.value === value);
                  return {
                    value,
                    label: known?.label ?? value,
                  };
                }),
              })
            }
          />
        </FormField>

        {showMajorMinor ? (
          <div className="lt-fmt__logic-row" style={{ marginTop: 14 }}>
            <FormField label="Major (incl. Labels)" htmlFor="lt-major-step">
              <Input
                id="lt-major-step"
                type="number"
                variant="ui"
                value={String(column.majorStep ?? "1")}
                onChange={(event) => onColumnChange({ majorStep: event.target.value })}
              />
            </FormField>
            <FormField label="Minor Spacing Count" htmlFor="lt-minor-step">
              <Input
                id="lt-minor-step"
                type="number"
                variant="ui"
                value={String(column.minorStep ?? "0.1")}
                onChange={(event) => onColumnChange({ minorStep: event.target.value })}
              />
            </FormField>
          </div>
        ) : null}

        <div style={{ marginTop: 14 }}>
          <FormField label="Number display" htmlFor="lt-scale-decimals">
            <Select
              id="lt-scale-decimals"
              value={String(column.scale_decimal_places ?? "")}
              options={SCALE_DECIMAL_OPTIONS}
              onChange={(value) => onColumnChange({ scale_decimal_places: value })}
            />
          </FormField>
        </div>
      </div>

      {/* Select Graphics */}
      {showGraphics ? (
        <div className="lt-fmt__section">
          <div className="lt-fmt__scale-graphics-head">
            <span className="lt-fmt__label">Select Graphics</span>
            <button
              type="button"
              className="lt-fmt__sb-add-btn"
              title="Add graphic"
              onClick={addGraphic}
            >
              +
            </button>
          </div>

          {graphics.length > 0 ? (
            <div className="lt-fmt__sb-list" style={{ marginTop: 12 }}>
              {graphics.map((graphic, index) => {
                const selectedKey = graphic.column_data_source?.value
                  ? `${graphic.column_data_source.group ?? ""}::${graphic.column_data_source.value}`
                  : "";
                return (
                  <div key={`scale-graphic-${index}`} className="lt-fmt__sb-card">
                    <div className="lt-fmt__sb-card-head">
                      <span className="lt-fmt__sb-card-title">Graphic {index + 1}</span>
                      <UiButton
                        type="button"
                        variant="danger"
                        size="sm"
                        onClick={() => updateGraphics(graphics.filter((_, i) => i !== index))}
                      >
                        Remove
                      </UiButton>
                    </div>
                    <FormField label="Select Data" htmlFor={`lt-scale-graphic-${index}`}>
                      <Select
                        id={`lt-scale-graphic-${index}`}
                        value={selectedKey}
                        placeholder="Please choose data..."
                        options={graphicDataOptions}
                        onChange={(raw) => {
                          const sep = raw.indexOf("::");
                          const next =
                            sep < 0
                              ? { group: "", value: raw }
                              : { group: raw.slice(0, sep), value: raw.slice(sep + 2) };
                          updateGraphics(
                            graphics.map((entry, i) =>
                              i === index ? { ...entry, column_data_source: next } : entry
                            )
                          );
                        }}
                      />
                    </FormField>
                  </div>
                );
              })}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
