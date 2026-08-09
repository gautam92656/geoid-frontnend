import type { InputHTMLAttributes } from "react";

type InputVariant = "ui" | "legacy";

type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  variant?: InputVariant;
};

export function Input({ className = "", variant = "legacy", ...props }: InputProps) {
  const variantClass = variant === "ui" ? "ui-input" : "";

  return <input className={[variantClass, className].filter(Boolean).join(" ")} {...props} />;
}
