import type { Metadata } from "next";
import {
  HeroSection,
  JourneyStepsSection,
  FeaturesSection,
  CtaSection,
  FaqSection,
} from "@/modules/landing/components";

export const metadata: Metadata = {
  title: "GeoLog — Boring Log Software",
  description:
    "Transform your geotechnical workflows with GeoLog. From field capture to final report, seamlessly.",
};

export default function HomePage() {
  return (
    <main className="discovery-page">
      <HeroSection />
      <JourneyStepsSection />
      <FeaturesSection />
      {/* <CtaSection />
      <FaqSection /> */}
    </main>
  );
}
