import type { ReactNode } from "react";

type PageHeaderProps = Readonly<{
  title: string;
  subtitle?: string;
  action?: ReactNode;
}>;

export function PageHeader({ title, subtitle, action }: PageHeaderProps) {
  return (
    <header className="page-header">
      <div className="page-header__copy">
        <h1 className="page-header__title">{title}</h1>
        {subtitle ? <p className="page-header__subtitle">{subtitle}</p> : null}
      </div>
      {action ? <div className="page-header__action">{action}</div> : null}
    </header>
  );
}
