type BadgeVariant = "success" | "neutral" | "warning" | "danger";

type BadgeProps = Readonly<{
  children: React.ReactNode;
  variant?: BadgeVariant;
}>;

export function Badge({ children, variant = "neutral" }: BadgeProps) {
  return <span className={`ui-badge ui-badge--${variant}`}>{children}</span>;
}
