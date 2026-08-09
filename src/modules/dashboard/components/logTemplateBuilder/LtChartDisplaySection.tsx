"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import { FormField, Input, MultiSelect, Select, UiButton } from "@/shared/components/ui";
import type {
  LogTemplateChartSeries,
  LogTemplateColumn,
  LogTemplateSelectionGroup,
} from "../../types/logTemplate";
import {
  CHART_SERIES_LINE_TYPES,
  CHART_TYPE_OPTIONS,
  createEmptyChartSeries,
  createEmptyMultiChartOption,
  getChartLineTypeImageUrl,
  getChartTypeImageUrl,
  getMultiChartOptions,
  supportsMultiChartData,
  type MultiChartOption,
} from "./columnTypeFields";
import { LtSwitch } from "./LtSwitch";
import { asDataSourceObject } from "./selectDataBinding";

type LtChartDisplaySectionProps = Readonly<{
  column: LogTemplateColumn;
  selectionGroups: LogTemplateSelectionGroup[];
  onColumnChange: (patch: Partial<LogTemplateColumn>) => void;
}>;

const LINE_TYPE_OPTIONS = [
  { value: "", label: "Select line type…" },
  { value: "thinSolid", label: "Solid" },
  { value: "solid", label: "Solid" },
  { value: "dashed", label: "Dashed" },
  { value: "dotted", label: "Dotted" },
] as const;

const LABEL_MODE_OPTIONS = [
  { value: "always", label: "Always show" },
  { value: "if_exceeds_max", label: "If data exceeds axis maximum" },
] as const;

const LABEL_POSITION_OPTIONS = [
  { value: "left", label: "Left of bar", icon: "|≡" },
  { value: "middle", label: "Middle of bar", icon: "≡|≡" },
  { value: "right", label: "Right of bar", icon: "≡|" },
] as const;

const X_AXIS_SCALE_OPTIONS = [
  { value: "linear", label: "Linear" },
  { value: "logarithmic", label: "Logarithmic" },
] as const;

const Y_DEPTH_UNIT_OPTIONS = [
  { value: "units_of_data", label: "Units of data" },
  { value: "ft", label: "ft" },
  { value: "m", label: "m" },
] as const;

function readCharts(column: LogTemplateColumn): LogTemplateChartSeries[] {
  if (Array.isArray(column.chart_data) && column.chart_data.length > 0) {
    return column.chart_data;
  }
  return [
    createEmptyChartSeries({
      chart_type: String(column.chart_type ?? "bar_chart"),
      fill_color: String(column.fill_color ?? "#83BEEC"),
      line_color: String(column.line_color ?? "#83BEEC"),
      line_type: String(column.line_type ?? "solid"),
      axis_bounds_min: Number(column.axis_bounds_min ?? 0),
      axis_bounds_max: Number(column.axis_bounds_max ?? 10),
      axis_units_minor: Number(column.axis_units_minor ?? 1),
      axis_units_major: Number(column.axis_units_major ?? 2),
      axis_label: Boolean(column.axis_label ?? true),
      column_data_source: asDataSourceObject(column.column_data_source),
    }),
  ];
}

function sourceKey(group: string, value: string) {
  return `${group}::${value}`;
}

function parseSourceKey(key: string) {
  const separatorIndex = key.indexOf("::");
  return {
    group: key.slice(0, separatorIndex),
    value: key.slice(separatorIndex + 2),
  };
}

function ChartLineTypeSelect({
  value,
  onChange,
}: Readonly<{
  value: string;
  onChange: (next: string) => void;
}>) {
  const [open, setOpen] = useState(false);
  const [menuStyle, setMenuStyle] = useState<CSSProperties>({});
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const menuRef = useRef<HTMLUListElement | null>(null);
  const normalized =
    value === "dashed_around" || value === "dotted" ? "dotted_around" : value;
  const current =
    CHART_SERIES_LINE_TYPES.find((entry) => entry.value === normalized) ??
    CHART_SERIES_LINE_TYPES[0];

  useLayoutEffect(() => {
    if (!open || !triggerRef.current) return;

    const placeMenu = () => {
      const rect = triggerRef.current?.getBoundingClientRect();
      if (!rect) return;
      const menuWidth = 72;
      const menuHeight = menuRef.current?.offsetHeight ?? 168;
      const gap = 4;
      const spaceBelow = window.innerHeight - rect.bottom - gap;
      const openUp = spaceBelow < menuHeight && rect.top > spaceBelow;
      const top = openUp
        ? Math.max(8, rect.top - menuHeight - gap)
        : Math.min(window.innerHeight - menuHeight - 8, rect.bottom + gap);
      const left = Math.min(
        Math.max(8, rect.left),
        window.innerWidth - menuWidth - 8
      );
      setMenuStyle({
        position: "fixed",
        top,
        left,
        zIndex: 10000,
      });
    };

    placeMenu();
    window.addEventListener("resize", placeMenu);
    window.addEventListener("scroll", placeMenu, true);
    return () => {
      window.removeEventListener("resize", placeMenu);
      window.removeEventListener("scroll", placeMenu, true);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (triggerRef.current?.contains(target)) return;
      if (menuRef.current?.contains(target)) return;
      setOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [open]);

  return (
    <div className="lt-fmt__line-type">
      <button
        ref={triggerRef}
        type="button"
        className={`lt-fmt__line-type-trigger${open ? " is-open" : ""}`}
        aria-expanded={open}
        aria-label={`Line type: ${current.label}`}
        title={current.label}
        onClick={() => setOpen((next) => !next)}
      >
        <img
          src={getChartLineTypeImageUrl(current.value)}
          alt={current.label}
          className="lt-fmt__line-type-img"
        />
        <span className="lt-fmt__line-type-caret" aria-hidden>
          ▾
        </span>
      </button>
      {open && typeof document !== "undefined"
        ? createPortal(
            <ul
              ref={menuRef}
              className="lt-fmt__line-type-menu lt-fmt__line-type-menu--floating"
              style={menuStyle}
            >
              {CHART_SERIES_LINE_TYPES.map((option) => {
                const selected = option.value === current.value;
                return (
                  <li key={option.value}>
                    <button
                      type="button"
                      className={`lt-fmt__line-type-option${selected ? " is-active" : ""}`}
                      title={option.label}
                      onClick={() => {
                        onChange(option.value);
                        setOpen(false);
                      }}
                    >
                      <img
                        src={getChartLineTypeImageUrl(option.value)}
                        alt={option.label}
                        className="lt-fmt__line-type-img"
                      />
                      {selected ? (
                        <span className="lt-fmt__line-type-check">✓</span>
                      ) : null}
                    </button>
                  </li>
                );
              })}
            </ul>,
            document.body
          )
        : null}
    </div>
  );
}

function ChartMultiDataSelect({
  chartType,
  options,
  selectionGroups,
  onChange,
}: Readonly<{
  chartType: string;
  options: MultiChartOption[];
  selectionGroups: LogTemplateSelectionGroup[];
  onChange: (next: MultiChartOption[]) => void;
}>) {
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const isBar = chartType === "bar_chart";
  const isScatter = chartType === "scatter_line_chart";

  const dataOptions = useMemo(
    () =>
      selectionGroups.flatMap((group) =>
        group.data.map((item) => ({
          value: sourceKey(group.code, item.code),
          label: `${group.name} — ${item.name}`,
        }))
      ),
    [selectionGroups]
  );

  const selectedKeys = useMemo(
    () =>
      options.map((option) =>
        sourceKey(
          option.column_data_source?.group ?? option.group_code ?? "",
          option.column_data_source?.value ?? option.code ?? option.name
        )
      ),
    [options]
  );

  const handleSelectionChange = (keys: string[]) => {
    const nextOptions = keys.map((key) => {
      const existing = options.find(
        (option) =>
          sourceKey(
            option.column_data_source?.group ?? option.group_code ?? "",
            option.column_data_source?.value ?? option.code ?? option.name
          ) === key
      );
      if (existing) return existing;

      const { group: groupCode, value: itemCode } = parseSourceKey(key);
      const group = selectionGroups.find((entry) => entry.code === groupCode);
      const item = group?.data.find((entry) => entry.code === itemCode);
      const itemName = item?.name ?? itemCode;

      return createEmptyMultiChartOption({
        name: itemName,
        text: itemName,
        code: itemCode,
        group_code: groupCode,
        column_data_source: { group: groupCode, value: itemCode },
      });
    });
    onChange(nextOptions);
  };

  const updateOption = (index: number, patch: Partial<MultiChartOption>) => {
    onChange(options.map((option, i) => (i === index ? { ...option, ...patch } : option)));
  };

  const moveOption = (from: number, to: number) => {
    if (to < 0 || to >= options.length || from === to) return;
    const next = [...options];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    onChange(next);
  };

  return (
    <div className="lt-fmt__chart-multi">
      <FormField label="Select Data" htmlFor="lt-chart-multi-data">
        <MultiSelect
          id="lt-chart-multi-data"
          value={selectedKeys}
          options={dataOptions}
          placeholder="Select Data"
          search
          searchPlaceholder="Search data options…"
          onChange={handleSelectionChange}
        />
      </FormField>

      {options.length > 0 ? (
        <div className="lt-fmt__chart-series">
          <div
            className={`lt-fmt__chart-series-head${
              isScatter ? " is-scatter" : isBar ? " is-bar" : ""
            }`}
          >
            <span className="lt-fmt__chart-series-cell is-reorder" />
            <span className="lt-fmt__chart-series-cell">Name</span>
            <span className="lt-fmt__chart-series-cell">Data</span>
            <span className="lt-fmt__chart-series-cell">Line</span>
            <span className="lt-fmt__chart-series-cell">Line Color</span>
            <span className="lt-fmt__chart-series-cell">Line Type</span>
            {isBar ? (
              <>
                <span className="lt-fmt__chart-series-cell">Fill</span>
                <span className="lt-fmt__chart-series-cell">Fill Content</span>
              </>
            ) : null}
            {isScatter ? (
              <>
                <span className="lt-fmt__chart-series-cell">Symbol</span>
                <span className="lt-fmt__chart-series-cell">Symbol Color</span>
              </>
            ) : null}
            <span className="lt-fmt__chart-series-cell">Transparency</span>
          </div>

          {options.map((option, index) => {
            const showTransparency =
              option.line_visibility !== false || option.symbol_visibility !== false;
            return (
              <div
                key={`${option.column_data_source?.value ?? option.name}-${index}`}
                className={`lt-fmt__chart-series-row${
                  isScatter ? " is-scatter" : isBar ? " is-bar" : ""
                }${dragIndex === index ? " is-dragging" : ""}`}
                draggable
                onDragStart={() => setDragIndex(index)}
                onDragOver={(event) => {
                  event.preventDefault();
                }}
                onDrop={(event) => {
                  event.preventDefault();
                  if (dragIndex === null) return;
                  moveOption(dragIndex, index);
                  setDragIndex(null);
                }}
                onDragEnd={() => setDragIndex(null)}
              >
                <div className="lt-fmt__chart-series-cell is-reorder">
                  <button
                    type="button"
                    className="lt-fmt__chart-drag"
                    aria-label="Reorder chart item"
                    title="Drag to reorder"
                  >
                    ⋮⋮
                  </button>
                </div>
                <div className="lt-fmt__chart-series-cell">
                  <Input
                    type="text"
                    variant="ui"
                    placeholder="Enter name"
                    value={String(option.text ?? "")}
                    onChange={(event) => updateOption(index, { text: event.target.value })}
                  />
                </div>
                <div className="lt-fmt__chart-series-cell is-data">
                  <span title={option.name}>{option.name}</span>
                </div>
                <div className="lt-fmt__chart-series-cell">
                  <LtSwitch
                    label="Line"
                    checked={option.line_visibility !== false}
                    onChange={(checked) => updateOption(index, { line_visibility: checked })}
                  />
                </div>
                <div className="lt-fmt__chart-series-cell">
                  <input
                    type="color"
                    className="lt-fmt__color"
                    value={String(option.line_color ?? "#83BEEC")}
                    onChange={(event) => updateOption(index, { line_color: event.target.value })}
                  />
                </div>
                <div className="lt-fmt__chart-series-cell">
                  <ChartLineTypeSelect
                    value={String(option.line_type ?? "dashed-end")}
                    onChange={(next) => updateOption(index, { line_type: next })}
                  />
                </div>
                {isBar ? (
                  <>
                    <div className="lt-fmt__chart-series-cell">
                      <LtSwitch
                        label="Fill"
                        checked={option.symbol_visibility !== false}
                        onChange={(checked) =>
                          updateOption(index, { symbol_visibility: checked })
                        }
                      />
                    </div>
                    <div className="lt-fmt__chart-series-cell">
                      <input
                        type="color"
                        className="lt-fmt__color"
                        value={String(option.fill_color ?? "#83BEEC")}
                        onChange={(event) =>
                          updateOption(index, { fill_color: event.target.value })
                        }
                      />
                    </div>
                  </>
                ) : null}
                {isScatter ? (
                  <>
                    <div className="lt-fmt__chart-series-cell">
                      <LtSwitch
                        label="Symbol"
                        checked={option.symbol_visibility !== false}
                        onChange={(checked) =>
                          updateOption(index, { symbol_visibility: checked })
                        }
                      />
                    </div>
                    <div className="lt-fmt__chart-series-cell">
                      <input
                        type="color"
                        className="lt-fmt__color"
                        value={String(option.symbol_color ?? option.fill_color ?? "#83BEEC")}
                        onChange={(event) =>
                          updateOption(index, { symbol_color: event.target.value })
                        }
                      />
                    </div>
                  </>
                ) : null}
                <div className="lt-fmt__chart-series-cell is-transparency">
                  {showTransparency ? (
                    <>
                      <input
                        type="range"
                        min={0}
                        max={100}
                        className="lt-fmt__slider-input"
                        value={Number(option.chart_transparency_width ?? 80)}
                        onChange={(event) =>
                          updateOption(index, {
                            chart_transparency_width: Number(event.target.value),
                          })
                        }
                      />
                      <span className="lt-fmt__chart-transparency-value">
                        {Number(option.chart_transparency_width ?? 80)}%
                      </span>
                    </>
                  ) : (
                    <span className="lt-fmt__section-note">—</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

export function LtChartDisplaySection({
  column,
  selectionGroups,
  onColumnChange,
}: LtChartDisplaySectionProps) {
  const charts = readCharts(column);
  const [activeIndex, setActiveIndex] = useState(0);
  const safeIndex = Math.min(activeIndex, Math.max(0, charts.length - 1));
  const chart = charts[safeIndex] ?? createEmptyChartSeries();

  const dataOptions = useMemo(
    () =>
      selectionGroups.flatMap((group) =>
        group.data.map((item) => ({
          value: sourceKey(group.code, item.code),
          label: `${group.name} / ${item.name}`,
        }))
      ),
    [selectionGroups]
  );

  const selectedSource = chart.column_data_source ?? { group: "", value: "" };
  const selectedKey = selectedSource.value
    ? sourceKey(selectedSource.group, selectedSource.value)
    : "";

  const commitCharts = (next: LogTemplateChartSeries[], patch?: Partial<LogTemplateColumn>) => {
    const primary = next[0];
    onColumnChange({
      chart_data: next,
      chart_type: primary?.chart_type ?? "bar_chart",
      column_data_source: primary?.column_data_source ?? column.column_data_source,
      fill_color: primary?.fill_color,
      line_color: primary?.line_color,
      line_type: primary?.line_type,
      axis_bounds_min: primary?.axis_bounds_min,
      axis_bounds_max: primary?.axis_bounds_max,
      axis_units_minor: primary?.axis_units_minor,
      axis_units_major: primary?.axis_units_major,
      axis_label: primary?.axis_label,
      ...patch,
    });
  };

  const updateChart = (index: number, patch: Partial<LogTemplateChartSeries>) => {
    const next = charts.map((entry, i) => (i === index ? { ...entry, ...patch } : entry));
    commitCharts(next);
  };

  const setMultiOptions = (chartIndex: number, nextOptions: MultiChartOption[]) => {
    const primarySource = nextOptions[0]?.column_data_source ?? { group: "", value: "" };
    updateChart(chartIndex, {
      selectedMultiChartOptions: nextOptions,
      column_data_source: primarySource,
    });
  };

  const moveChart = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= charts.length) return;
    const next = [...charts];
    const [moved] = next.splice(index, 1);
    next.splice(target, 0, moved);
    commitCharts(next);
    setActiveIndex(target);
  };

  const addChart = () => {
    const next = [...charts, createEmptyChartSeries()];
    commitCharts(next);
    setActiveIndex(next.length - 1);
  };

  const removeChart = (index: number) => {
    if (charts.length <= 1) return;
    const next = charts.filter((_, i) => i !== index);
    commitCharts(next);
    setActiveIndex(Math.max(0, index - 1));
  };

  return (
    <div className="lt-fmt__section lt-fmt__chart-display">
      {charts.map((entry, index) => {
        const isActive = index === safeIndex;
        const chartType = String(entry.chart_type ?? "bar_chart");
        const multiOptions = getMultiChartOptions(entry);
        const useMulti = supportsMultiChartData(chartType);
        return (
          <div
            key={`chart-${index}`}
            className={`lt-fmt__chart-card${isActive ? " is-active" : ""}`}
            onClick={() => setActiveIndex(index)}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                setActiveIndex(index);
              }
            }}
            role="button"
            tabIndex={0}
          >
            <div className="lt-fmt__chart-hide-row">
              <div className="lt-fmt__chart-hide-left">
                <span>Hide Chart</span>
                <LtSwitch
                  label="Hide Chart"
                  checked={Boolean(entry.hidden)}
                  onChange={(checked) => updateChart(index, { hidden: checked })}
                />
              </div>
              <div className="lt-fmt__chart-reorder">
                <button
                  type="button"
                  className="lt-fmt__chart-reorder-btn"
                  disabled={index === 0}
                  onClick={(event) => {
                    event.stopPropagation();
                    moveChart(index, -1);
                  }}
                >
                  ↑
                </button>
                <button
                  type="button"
                  className="lt-fmt__chart-reorder-btn"
                  disabled={index >= charts.length - 1}
                  onClick={(event) => {
                    event.stopPropagation();
                    moveChart(index, 1);
                  }}
                >
                  ↓
                </button>
              </div>
            </div>

            <div className="lt-fmt__chart-type-grid">
              {CHART_TYPE_OPTIONS.map((option) => {
                const selected = chartType === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    title={`Set Chart ${index + 1} to ${option.label}`}
                    className={`lt-fmt__chart-type-card${selected ? " is-active" : ""}`}
                    onClick={(event) => {
                      event.stopPropagation();
                      updateChart(index, { chart_type: option.value });
                      setActiveIndex(index);
                    }}
                  >
                    <img
                      src={getChartTypeImageUrl(option.value, selected)}
                      alt={option.label}
                      className="lt-fmt__chart-type-img"
                    />
                    <span>{option.label}</span>
                  </button>
                );
              })}
            </div>

            {isActive ? (
              <div
                className="lt-fmt__chart-settings"
                onClick={(event) => event.stopPropagation()}
                onKeyDown={(event) => event.stopPropagation()}
              >
                {useMulti ? (
                  <ChartMultiDataSelect
                    chartType={chartType}
                    options={multiOptions}
                    selectionGroups={selectionGroups}
                    onChange={(next) => setMultiOptions(index, next)}
                  />
                ) : (
                  <FormField label="Select Data" htmlFor={`lt-chart-data-${index}`}>
                    <Select
                      id={`lt-chart-data-${index}`}
                      value={selectedKey}
                      options={dataOptions}
                      placeholder="Select Data"
                      search
                      searchPlaceholder="Search data options…"
                      onChange={(key) => {
                        const { group, value } = parseSourceKey(key);
                        updateChart(index, {
                          column_data_source: { group, value },
                        });
                      }}
                    />
                  </FormField>
                )}

                <div className="lt-fmt__option-group">
                  <h4 className="lt-fmt__group-heading">Header Display</h4>
                  <div className="lt-fmt__options-row">
                    <LtSwitch
                      showLabel
                      label="Axis Label"
                      checked={Boolean(entry.axis_label)}
                      onChange={(checked) => updateChart(index, { axis_label: checked })}
                    />
                    <LtSwitch
                      showLabel
                      label="Axis"
                      checked={entry.show_axis !== false}
                      onChange={(checked) => updateChart(index, { show_axis: checked })}
                    />
                    <LtSwitch
                      showLabel
                      label="Show Name in Legend"
                      checked={entry.show_name_in_legend !== false}
                      onChange={(checked) =>
                        updateChart(index, { show_name_in_legend: checked })
                      }
                    />
                    <LtSwitch
                      showLabel
                      label="Show Symbol in Legend"
                      checked={Boolean(entry.show_symbol_in_legend)}
                      onChange={(checked) =>
                        updateChart(index, { show_symbol_in_legend: checked })
                      }
                    />
                  </div>
                  <div className="lt-fmt__options-row" style={{ marginTop: 10 }}>
                    <LtSwitch
                      showLabel
                      label="Hide legend and axis if no data present"
                      checked={Boolean(
                        entry.hide_legend_if_no_data ?? column.hide_chart_name_graphic
                      )}
                      onChange={(checked) => {
                        updateChart(index, { hide_legend_if_no_data: checked });
                        if (index === 0) {
                          onColumnChange({ hide_chart_name_graphic: checked });
                        }
                      }}
                    />
                  </div>
                </div>

                <div className="lt-fmt__option-group">
                  <h4 className="lt-fmt__group-heading">Grid Lines</h4>
                  <div className="lt-fmt__grid-lines">
                    <div className="lt-fmt__grid-lines-head">
                      <span>Axis</span>
                      <span>Line</span>
                      <span>Line Color</span>
                      <span>Line Type</span>
                      <span>Min</span>
                      <span>Max</span>
                      <span>Strike Intervals</span>
                    </div>
                    <div className="lt-fmt__grid-lines-row">
                      <span className="lt-fmt__grid-axis">X</span>
                      <LtSwitch
                        label="X grid line"
                        checked={Boolean(entry.x_grid_line)}
                        onChange={(checked) => updateChart(index, { x_grid_line: checked })}
                      />
                      <input
                        type="color"
                        className="lt-fmt__color"
                        value={String(entry.x_grid_line_color ?? entry.line_color ?? "#83BEEC")}
                        onChange={(event) =>
                          updateChart(index, { x_grid_line_color: event.target.value })
                        }
                      />
                      <Select
                        value={String(entry.x_grid_line_type ?? entry.line_type ?? "")}
                        options={LINE_TYPE_OPTIONS}
                        onChange={(value) =>
                          updateChart(index, { x_grid_line_type: value })
                        }
                      />
                      <Input
                        type="number"
                        variant="ui"
                        value={String(entry.axis_bounds_min ?? 0)}
                        onChange={(event) =>
                          updateChart(index, { axis_bounds_min: Number(event.target.value) })
                        }
                      />
                      <Input
                        type="number"
                        variant="ui"
                        value={String(entry.axis_bounds_max ?? 10)}
                        onChange={(event) =>
                          updateChart(index, { axis_bounds_max: Number(event.target.value) })
                        }
                      />
                      <Input
                        type="number"
                        variant="ui"
                        value={String(entry.axis_units_major ?? 2)}
                        onChange={(event) =>
                          updateChart(index, { axis_units_major: Number(event.target.value) })
                        }
                      />
                    </div>
                    <div className="lt-fmt__grid-lines-x-options">
                      <LtSwitch
                        showLabel
                        label="Show max/min bounds"
                        checked={Boolean(entry.show_max_min_bounds)}
                        onChange={(checked) =>
                          updateChart(index, { show_max_min_bounds: checked })
                        }
                      />
                      <LtSwitch
                        showLabel
                        label="Vertical X-axis Labels"
                        checked={Boolean(entry.vertical_x_axis_labels)}
                        onChange={(checked) =>
                          updateChart(index, { vertical_x_axis_labels: checked })
                        }
                      />
                      <FormField label="X-axis Scale" htmlFor={`lt-x-scale-${index}`}>
                        <Select
                          id={`lt-x-scale-${index}`}
                          value={String(entry.x_axis_scale ?? "linear")}
                          options={X_AXIS_SCALE_OPTIONS}
                          onChange={(value) => updateChart(index, { x_axis_scale: value })}
                        />
                      </FormField>
                    </div>
                    <div className="lt-fmt__grid-lines-row">
                      <span className="lt-fmt__grid-axis">Y</span>
                      <LtSwitch
                        label="Y grid line"
                        checked={Boolean(entry.y_grid_line)}
                        onChange={(checked) => updateChart(index, { y_grid_line: checked })}
                      />
                      <input
                        type="color"
                        className="lt-fmt__color"
                        value={String(entry.y_grid_line_color ?? "#CBD5E1")}
                        onChange={(event) =>
                          updateChart(index, { y_grid_line_color: event.target.value })
                        }
                      />
                      <Select
                        value={String(entry.y_grid_line_type ?? "")}
                        options={LINE_TYPE_OPTIONS}
                        onChange={(value) =>
                          updateChart(index, { y_grid_line_type: value })
                        }
                      />
                      <div className="lt-fmt__grid-depth">
                        <Input
                          type="number"
                          min={0}
                          step={0.1}
                          variant="ui"
                          placeholder="Depth interval"
                          value={String(entry.y_depth_interval ?? "")}
                          onChange={(event) =>
                            updateChart(index, { y_depth_interval: event.target.value })
                          }
                        />
                        <Select
                          value={String(entry.y_depth_unit ?? "units_of_data")}
                          options={Y_DEPTH_UNIT_OPTIONS}
                          onChange={(value) =>
                            updateChart(index, { y_depth_unit: value })
                          }
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="lt-fmt__option-group">
                  <h4 className="lt-fmt__group-heading">Data point labels</h4>
                  <div className="lt-fmt__chart-labels">
                    <div className="lt-fmt__chart-label-format">
                      <span className="lt-fmt__chart-label-a">A</span>
                      <Input
                        type="number"
                        min={1}
                        variant="ui"
                        className="lt-fmt__font-size"
                        value={String(entry.data_label_font_size ?? 8)}
                        onChange={(event) =>
                          updateChart(index, {
                            data_label_font_size: Number(event.target.value),
                          })
                        }
                      />
                      <button
                        type="button"
                        className={`lt-fmt__icon-btn${entry.data_label_bold ? " is-active" : ""}`}
                        onClick={() =>
                          updateChart(index, { data_label_bold: !entry.data_label_bold })
                        }
                      >
                        B
                      </button>
                      <button
                        type="button"
                        className={`lt-fmt__icon-btn${entry.data_label_italic ? " is-active" : ""}`}
                        onClick={() =>
                          updateChart(index, { data_label_italic: !entry.data_label_italic })
                        }
                      >
                        I
                      </button>
                    </div>
                    <div className="lt-fmt__options-row">
                      <LtSwitch
                        showLabel
                        label="Include depth"
                        checked={Boolean(entry.include_depth)}
                        onChange={(checked) => updateChart(index, { include_depth: checked })}
                      />
                      <LtSwitch
                        showLabel
                        label="Include data text"
                        checked={Boolean(entry.include_data_text)}
                        onChange={(checked) =>
                          updateChart(index, { include_data_text: checked })
                        }
                      />
                    </div>
                    <div style={{ marginTop: 8 }}>
                      <FormField label="Show labels" htmlFor={`lt-label-mode-${index}`}>
                        <Select
                          id={`lt-label-mode-${index}`}
                          value={String(entry.data_label_mode ?? "always")}
                          options={LABEL_MODE_OPTIONS}
                          onChange={(value) => updateChart(index, { data_label_mode: value })}
                        />
                      </FormField>
                    </div>
                    <div
                      className="lt-fmt__chart-label-pos"
                      role="group"
                      aria-label="Data label position"
                    >
                      {LABEL_POSITION_OPTIONS.map((option) => (
                        <button
                          key={option.value}
                          type="button"
                          title={option.label}
                          aria-label={option.label}
                          className={`lt-fmt__icon-btn${
                            (entry.data_label_position ?? "right") === option.value
                              ? " is-active"
                              : ""
                          }`}
                          onClick={() =>
                            updateChart(index, { data_label_position: option.value })
                          }
                        >
                          {option.icon}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="lt-fmt__chart-remove">
                  <UiButton
                    variant="danger"
                    disabled={charts.length <= 1}
                    onClick={() => removeChart(index)}
                  >
                    Remove Chart
                  </UiButton>
                </div>
              </div>
            ) : null}
          </div>
        );
      })}

      <div className="lt-fmt__chart-add">
        <UiButton variant="primary" onClick={addChart}>
          + Add Chart
        </UiButton>
      </div>
    </div>
  );
}
