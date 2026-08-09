"use client";

import type { ComponentType, ReactNode } from "react";
import { Input, Select } from "@/shared/components/ui";
import {
  LOG_TEMPLATE_FONT_FAMILIES,
  TEXT_ALIGN_OPTIONS,
  VERTICAL_ALIGN_OPTIONS,
  type TextAlign,
  type TextFormatValue,
  type VerticalAlign,
} from "./columnFormat";
import {
  AlignBottomIcon,
  AlignCenterIcon,
  AlignJustifyIcon,
  AlignLeftIcon,
  AlignMiddleIcon,
  AlignRightIcon,
  AlignTopIcon,
  BoldIcon,
  FontSizeIcon,
  ItalicIcon,
  TextHorizontalIcon,
  TextVerticalIcon,
  WrapTextIcon,
} from "./LtIcons";

const ALIGN_ICONS: Record<TextAlign, ComponentType> = {
  left: AlignLeftIcon,
  center: AlignCenterIcon,
  right: AlignRightIcon,
  justify: AlignJustifyIcon,
};

const ALIGN_LABELS: Record<TextAlign, string> = {
  left: "Align left",
  center: "Align center",
  right: "Align right",
  justify: "Justify",
};

const VERTICAL_ICONS: Record<VerticalAlign, ComponentType> = {
  top: AlignTopIcon,
  middle: AlignMiddleIcon,
  bottom: AlignBottomIcon,
};

const VERTICAL_LABELS: Record<VerticalAlign, string> = {
  top: "Align top",
  middle: "Align middle",
  bottom: "Align bottom",
};

const FONT_OPTIONS = LOG_TEMPLATE_FONT_FAMILIES.map((font) => ({
  value: font,
  label: font === "sans-serif" ? "Sans-serif" : font,
}));

type LtTextFormatRowProps = Readonly<{
  label: string;
  value: TextFormatValue;
  onChange: (patch: Partial<TextFormatValue>) => void;
  /** Hide the vertical/horizontal text-direction control (Angular Body row for Photo). */
  showTextDirection?: boolean;
}>;

export function LtTextFormatRow({
  label,
  value,
  onChange,
  showTextDirection = true,
}: LtTextFormatRowProps) {
  return (
    <div className="lt-fmt__format-row">
      <span className="lt-fmt__format-label">{label}</span>

      <Select
        id={`lt-font-${label.toLowerCase()}`}
        className="lt-fmt__format-select"
        value={value.fontFamily}
        options={FONT_OPTIONS}
        onChange={(next) => onChange({ fontFamily: next })}
      />

      <span className="lt-fmt__icon-btn" aria-hidden="true">
        <FontSizeIcon />
      </span>
      <Input
        type="number"
        min={1}
        max={72}
        variant="ui"
        className="lt-fmt__font-size"
        value={value.fontSize}
        aria-label={`${label} font size`}
        onChange={(event) => onChange({ fontSize: Number(event.target.value) || 1 })}
      />

      <div className="lt-fmt__icon-group">
        <IconToggle
          active={value.bold}
          label={`${label} bold`}
          onClick={() => onChange({ bold: !value.bold })}
        >
          <BoldIcon />
        </IconToggle>
        <IconToggle
          active={value.italic}
          label={`${label} italic`}
          onClick={() => onChange({ italic: !value.italic })}
        >
          <ItalicIcon />
        </IconToggle>
      </div>

      <div className="lt-fmt__icon-group">
        {TEXT_ALIGN_OPTIONS.map((align) => {
          const AlignIcon = ALIGN_ICONS[align];
          return (
            <IconToggle
              key={align}
              active={value.align === align}
              label={`${label} ${ALIGN_LABELS[align].toLowerCase()}`}
              onClick={() => onChange({ align })}
            >
              <AlignIcon />
            </IconToggle>
          );
        })}
      </div>

      <div className="lt-fmt__icon-group">
        {VERTICAL_ALIGN_OPTIONS.map((verticalAlign) => {
          const VerticalIcon = VERTICAL_ICONS[verticalAlign];
          return (
            <IconToggle
              key={verticalAlign}
              active={value.verticalAlign === verticalAlign}
              label={`${label} ${VERTICAL_LABELS[verticalAlign].toLowerCase()}`}
              onClick={() => onChange({ verticalAlign })}
            >
              <VerticalIcon />
            </IconToggle>
          );
        })}
      </div>

      <div className="lt-fmt__icon-group">
        <IconToggle
          active={value.wrap}
          label={`${label} wrap text`}
          onClick={() => onChange({ wrap: !value.wrap })}
        >
          <WrapTextIcon />
        </IconToggle>
        {showTextDirection ? (
          <IconToggle
            active={value.vertical}
            label={`${label} text direction`}
            onClick={() => onChange({ vertical: !value.vertical })}
          >
            {value.vertical ? <TextVerticalIcon /> : <TextHorizontalIcon />}
          </IconToggle>
        ) : null}
      </div>
    </div>
  );
}

function IconToggle({
  active,
  label,
  onClick,
  children,
}: Readonly<{
  active: boolean;
  label: string;
  onClick: () => void;
  children: ReactNode;
}>) {
  return (
    <button
      type="button"
      className={`lt-fmt__icon-btn${active ? " is-active" : ""}`}
      aria-pressed={active}
      aria-label={label}
      title={label}
      onClick={onClick}
    >
      {children}
    </button>
  );
}
