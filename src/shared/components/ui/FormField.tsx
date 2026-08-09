import type { ReactNode } from "react";

type FormFieldProps = Readonly<{
  label: string;
  htmlFor?: string;
  required?: boolean;
  hint?: string;
  error?: string;
  className?: string;
  children: ReactNode;
}>;

export function FormField({
  label,
  htmlFor,
  required,
  hint,
  error,
  className = "",
  children,
}: FormFieldProps) {
  return (
    <div className={["ui-field", error ? "ui-field--error" : "", className].filter(Boolean).join(" ")}>
      <label className="ui-field__label" htmlFor={htmlFor}>
        {label}
        {required ? <span className="ui-field__required"> *</span> : null}
      </label>
      {children}
      {hint ? <p className="ui-field__hint">{hint}</p> : null}
      {error ? <p className="ui-field__error">{error}</p> : null}
    </div>
  );
}
