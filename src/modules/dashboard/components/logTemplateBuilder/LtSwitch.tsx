"use client";

import { useId } from "react";
import { Toggle } from "@/shared/components/ui";

type LtSwitchProps = Readonly<{
  checked: boolean;
  disabled?: boolean;
  label: string;
  /** Renders the label next to the switch; otherwise it is screen-reader only. */
  showLabel?: boolean;
  onChange: (checked: boolean) => void;
}>;

export function LtSwitch({
  checked,
  disabled,
  label,
  showLabel = false,
  onChange,
}: LtSwitchProps) {
  const id = useId();

  if (!showLabel) {
    return (
      <Toggle
        id={id}
        checked={checked}
        disabled={disabled}
        aria-label={label}
        onChange={onChange}
      />
    );
  }

  return (
    <div className="lt-fmt__option">
      <Toggle id={id} checked={checked} disabled={disabled} onChange={onChange} />
      <label className="lt-fmt__option-label" htmlFor={id}>
        {label}
      </label>
    </div>
  );
}
