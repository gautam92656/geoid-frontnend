import type { ReactNode } from "react";
import { Navbar } from "@/shared/components/layout/Navbar";
import { Footer } from "@/shared/components/layout/Footer";
import { ScrollToTop } from "@/shared/components/layout/ScrollToTop";

export default function MainLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <>
      <ScrollToTop />
      <Navbar />
      {children}
      <Footer />
    </>
  );
}
