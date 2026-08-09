"use client";

import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

type ProjectModalPortalProps = Readonly<{
  open: boolean;
  children: ReactNode;
}>;

export function ProjectModalPortal({ open, children }: ProjectModalPortalProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!open || !mounted) return null;

  return createPortal(children, document.body);
}
