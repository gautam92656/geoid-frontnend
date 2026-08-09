import type { InputHTMLAttributes } from "react";

type ToggleProps = Omit<InputHTMLAttributes<HTMLInputElement>, "type" | "onChange"> & {
  onChange: (checked: boolean) => void;
};

export function Toggle({ className = "", checked, onChange, disabled, id, ...props }: ToggleProps) {
  return (
    <label className={["ui-toggle", className].filter(Boolean).join(" ")}>
      <input
        id={id}
        type="checkbox"
        role="switch"
        className="ui-toggle__input"
        checked={checked}
        disabled={disabled}
        onChange={(event) => onChange(event.target.checked)}
        {...props}
      />
      <span className="ui-toggle__track" aria-hidden="true">
        <span className="ui-toggle__thumb" />
      </span>
    </label>
  );
}
