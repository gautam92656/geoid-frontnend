"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";

type PageTransitionProps = Readonly<{
  children: ReactNode;
  className?: string;
}>;

export function PageTransition({ children, className = "" }: PageTransitionProps) {
  const pathname = usePathname();

  return (
    <div key={pathname} className={["page-enter", className].filter(Boolean).join(" ")}>
      {children}
    </div>
  );
}
