"use client";

type PageLoaderProps = Readonly<{
  label?: string;
  variant?: "page" | "section" | "inline";
  className?: string;
}>;

export function PageLoader({
  label = "Loading…",
  variant = "section",
  className = "",
}: PageLoaderProps) {
  return (
    <div
      className={["page-loader", `page-loader--${variant}`, className].filter(Boolean).join(" ")}
      role="status"
      aria-live="polite"
      aria-busy="true"
      aria-label={label}
    >
      <div className="page-loader__visual" aria-hidden="true">
        <div className="page-loader__spinner">
          <span className="page-loader__ring page-loader__ring--outer" />
          <span className="page-loader__ring page-loader__ring--middle" />
          <span className="page-loader__core" />
        </div>
        <span className="page-loader__orbit page-loader__orbit--one" />
        <span className="page-loader__orbit page-loader__orbit--two" />
        <span className="page-loader__orbit page-loader__orbit--three" />
      </div>

      {label ? <p className="page-loader__label">{label}</p> : null}
    </div>
  );
}
