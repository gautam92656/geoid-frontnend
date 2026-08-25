import type { ReactNode } from "react";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { ToastProvider } from "@/shared/components/ui/ToastProvider";
import { StoreProvider } from "@/store/StoreProvider";
import "bootstrap/dist/css/bootstrap.min.css";
import "@/assets/css/style.css";
import "@/assets/css/animations.css";
import "@/assets/css/scrollbars.css";
import "@/assets/css/landing.css";
import "@/assets/css/responsive.css";
import "@/assets/css/dashboard.css";
import "@/assets/css/logTemplateBuilder.css";
import "@/assets/css/forms.css";
import "@/assets/css/buttons.css";
import "@/assets/css/toast.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: {
    default: "Book a Discovery Call | GeoLog",
    template: "%s | GeoLog",
  },
  description:
    "See GeoLog working on your data. Each session is run by one of our in-house geotechnical professionals.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html lang="en" className={inter.variable} data-scroll-behavior="smooth">
      <body>
        <StoreProvider>{children}</StoreProvider>
        <ToastProvider />
      </body>
    </html>
  );
}
