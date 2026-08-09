import type { ButtonHTMLAttributes } from "react";

export type UiButtonVariant = "primary" | "secondary" | "outline" | "ghost" | "link" | "danger";

type UiButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: UiButtonVariant;
  size?: "md" | "sm";
  block?: boolean;
};

export function UiButton({
  variant = "primary",
  size = "md",
  block = false,
  className = "",
  type = "button",
  ...props
}: UiButtonProps) {
  return (
    <button
      type={type}
      className={[
        "ui-btn",
        `ui-btn--${variant}`,
        size === "sm" ? "ui-btn--sm" : "",
        block ? "ui-btn--block" : "",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      {...props}
    />
  );
}
