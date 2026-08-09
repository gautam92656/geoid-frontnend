"use client";

import { useEffect } from "react";
import { FormField, Input, Select, UiButton } from "@/shared/components/ui";
import type {
  LogTemplateColumn,
  LogTemplateColumnType,
  LogTemplateSelectionGroup,
} from "../../types/logTemplate";
import { applyTextFormat, readTextFormat, type TextFormatValue } from "./columnFormat";
import { LOG_TEMPLATE_COLUMN_TYPES } from "./contentSchema";
import {
  AS_ABOVE_LINE_OPTIONS,
  COPY_PRESET_CONFIGURABLE,
  MULTI_MODULE_STRUCTURE_TOGGLES,
  PHOTO_LAYOUT_OPTIONS,
  PHOTO_TOGGLES,
  TEXT_GRAPHIC_LAYOUTS,
  createEmptyChartSeries,
  getColumnTypeUi,
  getCopyPresetValue,
  getPresetColumnDefaults,
  isCombineRepeatedNamesColumn,
  isDisplayTypeLocked,
  isDrillingMethodColumn,
  isMultiModuleBoundColumn,
  isOptionOn,
  isSubsurfaceColumn,
  isWellDiagramColumn,
  shouldShowStringBuilders,
  type FieldToggle,
} from "./columnTypeFields";
import { LtBoundSelectDataSection } from "./LtBoundSelectDataSection";
import { LtChartDisplaySection } from "./LtChartDisplaySection";
import { LtScaleDisplaySection } from "./LtScaleDisplaySection";
import { LtStringBuilderSection } from "./LtStringBuilderSection";
import { LtSwitch } from "./LtSwitch";
import { LtTextFormatRow } from "./LtTextFormatRow";
import { LtWellDiagramSection } from "./LtWellDiagramSection";
import { asDataSourceObject, getDataSourceGroup, getDataSourceValue } from "./selectDataBinding";
import type { BoundSelectDataKind } from "./selectDataBinding";

const PARENT_COLUMN_OPTIONS = [
  { value: "always", label: "Always" },
  { value: "exists_in_log", label: "If data exists in log" },
];

const SCALING_OPTIONS = [
  { value: "dynamic", label: "Dynamically Scale" },
  { value: "fixed", label: "Fixed Width" },
];

const DEPTH_UNIT_OPTIONS = [
  { value: "units_of_data", label: "Units of data" },
  { value: "m", label: "m" },
  { value: "ft", label: "ft" },
];

export type CopyPresetOption = Readonly<{
  code: string;
  text: string;
  column_type: LogTemplateColumnType;
  column_data_source?: LogTemplateColumn["column_data_source"];
  show_arrows?: boolean;
  vertical_text?: boolean;
  name_vertical?: boolean;
  width?: number | string;
  text_graphic_layout_type?: string;
}>;

type LtColumnConfigPanelProps = Readonly<{
  column: LogTemplateColumn | null;
  remainingWidth: number;
  selectionGroups: LogTemplateSelectionGroup[];
  copyPresets: CopyPresetOption[];
  selectDataOverrides?: Partial<
    Record<BoundSelectDataKind, Array<{ value: string; label: string }>>
  >;
  onColumnChange: (patch: Partial<LogTemplateColumn>) => void;
  onDelete: () => void;
}>;

export function LtColumnConfigPanel({
  column,
  remainingWidth,
  selectionGroups,
  copyPresets,
  selectDataOverrides,
  onColumnChange,
  onDelete,
}: LtColumnConfigPanelProps) {
  // Heal Drilling Method columns that were saved with the wrong display type (e.g. Scale).
  useEffect(() => {
    if (!column || !isDrillingMethodColumn(column)) return;
    if (column.column_type === "text" && column.show_arrows !== undefined) return;
    const defaults = getPresetColumnDefaults("drilling method");
    if (!defaults) return;
    onColumnChange({
      ...defaults,
      text: column.text || "Drilling Method",
      width: column.width || 5,
    });
    // Intentionally omit onColumnChange from deps — parent passes an inline callback.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    column?.code,
    column?.column_type,
    column?.copy_default_column,
    getDataSourceGroup(column ?? ({} as LogTemplateColumn)),
    column?.show_arrows,
    column?.text,
    column?.width,
  ]);

  if (!column) {
    return (
      <section className="lt-fmt__panel">
        <p className="lt-fmt__empty">
          Select a column on the left to edit its width, format, display type, and data source.
        </p>
      </section>
    );
  }

  const type = column.column_type;
  // Drilling Method is always treated as Text for field visibility, even before heal commits.
  const effectiveType =
    isDrillingMethodColumn(column) && type !== "text" ? "text" : type;
  const ui = getColumnTypeUi(effectiveType);
  const width = Number(column.width) || 0;
  const displayLocked = isDisplayTypeLocked(column);
  const widthMax = remainingWidth <= 0 ? Math.max(width, 0) : 100;
  const copyPreset = getCopyPresetValue(column);
  const showStringBuilders = shouldShowStringBuilders(column);
  const isDrillingMethod = isDrillingMethodColumn(column);
  const isMultiModule = isMultiModuleBoundColumn(column);
  // Scale owns its display options inside LtScaleDisplaySection (Angular app-scale-display).
  const showDisplayOptions =
    !ui.showScaleSettings &&
    (ui.dataDisplayToggles.length > 0 ||
      isDrillingMethod ||
      ui.visualStyleToggles.length > 0 ||
      ui.showVerticalText ||
      (!ui.showChartSettings && ui.behaviourToggles.length > 0) ||
      ui.structureToggles.length > 0 ||
      isMultiModule);

  const changeFormat = (target: "heading" | "body", patch: Partial<TextFormatValue>) => {
    onColumnChange(applyTextFormat(column, target, patch));
  };

  const setDisplayType = (nextType: LogTemplateColumnType) => {
    if (displayLocked) return;
    const label =
      LOG_TEMPLATE_COLUMN_TYPES.find((entry) => entry.value === nextType)?.label ?? nextType;
    onColumnChange({
      column_type: nextType,
      displayType: label,
      ...(nextType === "chart" && !(column.chart_data && column.chart_data.length)
        ? {
            chart_type: "bar_chart",
            chart_data: [createEmptyChartSeries()],
            hide_chart_name_graphic: true,
            axis_label: true,
          }
        : {}),
      ...(nextType === "text_graphic" && !column.text_graphic_layout_type
        ? { text_graphic_layout_type: "text_horizontal_bottom" }
        : {}),
      ...(nextType === "scale" && !column.selectedDepthOptions
        ? {
            selectedDepthOptions: [{ value: "all_depth_markers", label: "Depth Scale" }],
            majorStep: column.majorStep ?? "1",
            minorStep: column.minorStep ?? "0.1",
            column_data_source: getDataSourceValue(column)
              ? asDataSourceObject(column.column_data_source)
              : { group: "all_scales", value: "" },
          }
        : {}),
      ...(nextType === "photo"
        ? {
            photo_layout: column.photo_layout ?? "default",
            show_photo_column: column.show_photo_column ?? false,
            show_photo_row: column.show_photo_row ?? false,
            show_captions: column.show_captions ?? false,
          }
        : {}),
    });
  };

  const applyCopyPreset = (presetCode: string) => {
    if (presetCode === COPY_PRESET_CONFIGURABLE) {
      onColumnChange({
        copy_default_column: COPY_PRESET_CONFIGURABLE,
        show_arrows: false,
      });
      return;
    }

    const knownDefaults = getPresetColumnDefaults(presetCode);
    if (knownDefaults) {
      const preset = copyPresets.find((entry) => entry.code === presetCode);
      onColumnChange({
        ...knownDefaults,
        text: column.text?.trim() ? column.text : preset?.text || "Drilling Method",
        width: preset?.width ?? column.width ?? 5,
      });
      return;
    }

    const preset = copyPresets.find((entry) => entry.code === presetCode);
    if (!preset) {
      onColumnChange({ copy_default_column: presetCode });
      return;
    }
    const nextType = preset.column_type || "text";
    const label =
      LOG_TEMPLATE_COLUMN_TYPES.find((entry) => entry.value === nextType)?.label ?? nextType;

    onColumnChange({
      copy_default_column: preset.code,
      column_type: nextType,
      displayType: label,
      column_data_source: preset.column_data_source ?? { group: "", value: "" },
      text: column.text?.trim() ? column.text : preset.text,
      ...(preset.width !== undefined ? { width: preset.width } : {}),
      ...(preset.vertical_text !== undefined ? { vertical_text: preset.vertical_text } : {}),
      ...(preset.name_vertical !== undefined ? { name_vertical: preset.name_vertical } : {}),
      ...(preset.text_graphic_layout_type
        ? { text_graphic_layout_type: preset.text_graphic_layout_type }
        : {}),
      show_arrows: Boolean(preset.show_arrows),
    });
  };

  return (
    <section className="lt-fmt__panel ui-scrollbar">
      {/* ---- Identity ---- */}
      <div className="lt-fmt__section">
        <div className="lt-fmt__top-row">
          <FormField label="Column name" htmlFor="lt-column-name">
            <Input
              id="lt-column-name"
              variant="ui"
              value={column.text}
              onChange={(event) => onColumnChange({ text: event.target.value })}
            />
          </FormField>

          <FormField label="Choose Column Type" htmlFor="lt-copy-preset">
            <Select
              id="lt-copy-preset"
              value={copyPreset}
              disabled={Boolean(column.default_column)}
              options={[
                { value: COPY_PRESET_CONFIGURABLE, label: "Configurable" },
                ...copyPresets.map((preset) => ({ value: preset.code, label: preset.text })),
              ]}
              onChange={(value) => applyCopyPreset(value)}
            />
          </FormField>

          <div className="lt-fmt__field lt-fmt__field--auto">
            <UiButton variant="danger" onClick={onDelete}>
              Delete
            </UiButton>
          </div>
        </div>
      </div>

      {/* ---- Width ---- */}
      <div className="lt-fmt__section">
        <div className="lt-fmt__width-head">
          <span className="lt-fmt__width-value">Column Width: {width}%</span>
          <span className={`lt-fmt__width-remaining${remainingWidth < 0 ? " is-over" : ""}`}>
            {remainingWidth < 0
              ? `${Math.abs(remainingWidth)}% over page width`
              : `${remainingWidth}% of page remains`}
          </span>
        </div>
        <input
          type="range"
          min={0}
          max={widthMax}
          step={1}
          className="lt-fmt__slider-input"
          value={Math.min(width, widthMax)}
          aria-label="Column width"
          onChange={(event) => onColumnChange({ width: Number(event.target.value) })}
        />
      </div>

      {/* ---- Show column logic ---- */}
      <div className="lt-fmt__section">
        <div className="lt-fmt__logic-heading">
          <label className="lt-fmt__section-title">Show column logic</label>
          <p className="lt-fmt__section-note">
            If column is hidden other columns dynamically adjust to fill space
          </p>
        </div>
        <div className="lt-fmt__logic-row">
          <FormField label="Parent Column" htmlFor="lt-parent-column">
            <Select
              id="lt-parent-column"
              value={String(column.parent_static_display_type ?? column.parentColumn ?? "always")}
              options={PARENT_COLUMN_OPTIONS}
              onChange={(value) =>
                onColumnChange({
                  parent_static_display_type: value,
                  parentColumn: value,
                })
              }
            />
          </FormField>
          <FormField label="Scaling Type" htmlFor="lt-scaling-type">
            <Select
              id="lt-scaling-type"
              value={column.width_behavior ?? "dynamic"}
              options={SCALING_OPTIONS}
              onChange={(value) =>
                onColumnChange({
                  width_behavior: value === "fixed" ? "fixed" : "dynamic",
                })
              }
            />
          </FormField>
        </div>
      </div>

      {/* ---- Data source bound to Column Type (when string builders are not shown) ---- */}
      {!showStringBuilders && !ui.showScaleSettings && !ui.showChartSettings ? (
        <LtBoundSelectDataSection
          column={column}
          selectionGroups={selectionGroups}
          selectDataOverrides={selectDataOverrides}
          onColumnChange={onColumnChange}
        />
      ) : null}

      {/* ---- Column format ---- */}
      <div className="lt-fmt__section">
        <h3 className="lt-fmt__section-title">Column format</h3>
        <LtTextFormatRow
          label="Heading"
          value={readTextFormat(column, "heading")}
          onChange={(patch) => changeFormat("heading", patch)}
        />
        {ui.showBodyFormat ? (
          <LtTextFormatRow
            label="Body"
            value={readTextFormat(column, "body")}
            showTextDirection={ui.showBodyTextDirection}
            onChange={(patch) => changeFormat("body", patch)}
          />
        ) : null}
      </div>

      {/* ---- Display Type ---- */}
      <div className="lt-fmt__section">
        <label className="lt-fmt__section-title">Display Type</label>
        <div className="lt-fmt__display-types">
          {LOG_TEMPLATE_COLUMN_TYPES.map((entry) => (
            <button
              key={entry.value}
              type="button"
              disabled={displayLocked && entry.value !== effectiveType}
              className={`lt-fmt__display-type${effectiveType === entry.value ? " is-active" : ""}`}
              onClick={() => setDisplayType(entry.value)}
            >
              {entry.label}
            </button>
          ))}
        </div>

        {ui.showTextGraphicLayout ? (
          <div className="lt-fmt__layout-grid">
            {TEXT_GRAPHIC_LAYOUTS.map((layout) => (
              <button
                key={layout.value}
                type="button"
                title={layout.label}
                className={`lt-fmt__layout-btn${
                  column.text_graphic_layout_type === layout.value ? " is-active" : ""
                }`}
                onClick={() => onColumnChange({ text_graphic_layout_type: layout.value })}
              >
                <span className={`lt-fmt__layout-preview lt-fmt__layout-preview--${layout.value}`} />
                <span>{layout.label}</span>
              </button>
            ))}
          </div>
        ) : null}
      </div>

      {/* ---- Configurable text display: string builders ---- */}
      {showStringBuilders ? (
        <LtStringBuilderSection
          column={column}
          selectionGroups={selectionGroups}
          selectDataOverrides={selectDataOverrides}
          onColumnChange={onColumnChange}
        />
      ) : null}

      {/* ---- Remarks/Samples/Testing structure toggles (Angular app-text-display) ---- */}
      {isMultiModule &&
      !ui.showScaleSettings &&
      !ui.showChartSettings &&
      !ui.showPhotoSettings ? (
        <div className="lt-fmt__section">
          <div className="lt-fmt__options-row" style={{ flexDirection: "column", gap: 12 }}>
            {MULTI_MODULE_STRUCTURE_TOGGLES.map((option) => (
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

      {/* ---- Chart display (Angular app-chart-display) ---- */}
      {ui.showChartSettings ? (
        <LtChartDisplaySection
          column={column}
          selectionGroups={selectionGroups}
          onColumnChange={onColumnChange}
        />
      ) : null}

      {/* ---- Scale display (Angular app-scale-display) ---- */}
      {ui.showScaleSettings ? (
        <LtScaleDisplaySection
          column={column}
          selectionGroups={selectionGroups}
          dataDisplayToggles={ui.dataDisplayToggles}
          visualStyleToggles={ui.visualStyleToggles}
          onColumnChange={onColumnChange}
        />
      ) : null}

      {/* ---- Photo settings ---- */}
      {ui.showPhotoSettings ? (
        <div className="lt-fmt__section">
          <div className="lt-fmt__photo-options">
            {PHOTO_TOGGLES.map((option) => (
              <div key={option.key} className="lt-fmt__photo-option">
                <span className="lt-fmt__photo-option-label">{option.label}</span>
                <LtSwitch
                  label={option.label}
                  checked={isOptionOn(column, option.key)}
                  disabled={
                    option.key === "first_page_only" && Boolean(column.show_photo_column)
                  }
                  onChange={(checked) => {
                    if (option.key === "show_photo_column" && checked) {
                      onColumnChange({
                        show_photo_column: true,
                        show_photo_row: false,
                        first_page_only: false,
                      });
                      return;
                    }
                    if (option.key === "show_photo_row" && checked) {
                      onColumnChange({
                        show_photo_row: true,
                        show_photo_column: false,
                      });
                      return;
                    }
                    onColumnChange({ [option.key]: checked });
                  }}
                />
              </div>
            ))}
          </div>

          <div style={{ marginTop: 12 }}>
            <FormField label="Photo layout" htmlFor="lt-photo-layout">
              <Select
                id="lt-photo-layout"
                value={String(column.photo_layout ?? "default")}
                options={PHOTO_LAYOUT_OPTIONS}
                onChange={(value) => onColumnChange({ photo_layout: value })}
              />
            </FormField>
          </div>
        </div>
      ) : null}

      {/* ---- Display options (Angular app-display-options groups) ---- */}
      {showDisplayOptions ? (
        <div className="lt-fmt__section">
          {ui.dataDisplayToggles.length > 0 || isDrillingMethod ? (
            <div className="lt-fmt__option-group">
              <h4 className="lt-fmt__group-heading">Data Display</h4>
              <div className="lt-fmt__options-row">
                {ui.dataDisplayToggles.map((option) => (
                  <ToggleOption
                    key={option.key}
                    option={option}
                    column={column}
                    onColumnChange={onColumnChange}
                  />
                ))}
                {isDrillingMethod ? (
                  <LtSwitch
                    showLabel
                    label="Show Arrows"
                    checked={column.show_arrows !== false}
                    onChange={(checked) => onColumnChange({ show_arrows: checked })}
                  />
                ) : null}
              </div>
              {isOptionOn(column, "include_depth") && effectiveType !== "chart" ? (
                <div className="lt-fmt__logic-row" style={{ marginTop: 10 }}>
                  <FormField label="Depth unit" htmlFor="lt-depth-unit">
                    <Select
                      id="lt-depth-unit"
                      value={String(column.include_depth_unit_option ?? "units_of_data")}
                      options={DEPTH_UNIT_OPTIONS}
                      onChange={(value) =>
                        onColumnChange({ include_depth_unit_option: value })
                      }
                    />
                  </FormField>
                </div>
              ) : null}
            </div>
          ) : null}

          {ui.visualStyleToggles.length > 0 || ui.showVerticalText ? (
            <div className="lt-fmt__option-group">
              <h4 className="lt-fmt__group-heading">Visual Style</h4>
              <div className="lt-fmt__options-row">
                {ui.showVerticalText ? (
                  <LtSwitch
                    showLabel
                    label="Vertical Text"
                    checked={Boolean(column.vertical_text)}
                    onChange={(checked) => onColumnChange({ vertical_text: checked })}
                  />
                ) : null}
                {ui.visualStyleToggles.map((option) => (
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

          {!ui.showChartSettings && ui.behaviourToggles.length > 0 ? (
            <>
              {(() => {
                const graphicKeys = new Set([
                  "continue_graphic_if_unchanged",
                  "empty_graphic_if_not_sampled",
                ]);
                const graphicBehaviour = ui.behaviourToggles.filter((option) =>
                  graphicKeys.has(option.key)
                );
                const textBehaviour = ui.behaviourToggles.filter(
                  (option) => !graphicKeys.has(option.key)
                );
                return (
                  <>
                    {graphicBehaviour.length > 0 ? (
                      <div className="lt-fmt__option-group">
                        <h4 className="lt-fmt__group-heading">Graphic Behavior</h4>
                        <div className="lt-fmt__options-row">
                          {graphicBehaviour.map((option) => (
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
                    {textBehaviour.length > 0 ? (
                      <div className="lt-fmt__option-group">
                        <h4 className="lt-fmt__group-heading">Text Behavior</h4>
                        <div className="lt-fmt__options-row">
                          {textBehaviour.map((option) => (
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
                  </>
                );
              })()}
            </>
          ) : null}

          {ui.structureToggles.length > 0 ? (
            <div className="lt-fmt__option-group">
              <h4 className="lt-fmt__group-heading">Structure</h4>
              <div className="lt-fmt__options-row">
                {ui.structureToggles.map((option) => (
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

      {/* ---- Conditional extras by data source / code ---- */}
      {isWellDiagramColumn(column) ? (
        <LtWellDiagramSection
          column={column}
          selectionGroups={selectionGroups}
          onColumnChange={onColumnChange}
        />
      ) : null}

      {isCombineRepeatedNamesColumn(column) ? (
        <div className="lt-fmt__section">
          <div className="lt-fmt__options-row">
            <LtSwitch
              showLabel
              label="Combine Repeated Names"
              checked={Boolean(column.name_repeat)}
              onChange={(checked) => onColumnChange({ name_repeat: checked })}
            />
          </div>
        </div>
      ) : null}

      {isSubsurfaceColumn(column) ? (
        <div className="lt-fmt__section">
          <FormField label="As Above Separator Line" htmlFor="lt-as-above">
            <Select
              id="lt-as-above"
              value={String(column.as_above_separator_line ?? "no_line")}
              options={AS_ABOVE_LINE_OPTIONS}
              onChange={(value) => onColumnChange({ as_above_separator_line: value })}
            />
          </FormField>
        </div>
      ) : null}
    </section>
  );
}

function ToggleOption({
  option,
  column,
  onColumnChange,
  disabled,
}: Readonly<{
  option: FieldToggle;
  column: LogTemplateColumn;
  onColumnChange: (patch: Partial<LogTemplateColumn>) => void;
  disabled?: boolean;
}>) {
  return (
    <LtSwitch
      showLabel
      label={option.label}
      checked={isOptionOn(column, option.key)}
      disabled={disabled}
      onChange={(checked) => onColumnChange({ [option.key]: checked })}
    />
  );
}
