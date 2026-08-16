"use client";

import { useState } from "react";
import { DrillingCasingsList } from "./DrillingCasingsList";
import { DrillingMethodsList } from "./DrillingMethodsList";
import { DrillingObservationsList } from "./DrillingObservationsList";
import { DrillingResistancesList } from "./DrillingResistancesList";

const DRILLING_OBSERVATION_TABS = [
  { id: "methods", label: "Drilling Methods" },
  { id: "resistances", label: "Drilling Resistances" },
  { id: "casings", label: "Drilling Casings" },
  { id: "observations", label: "Drilling Observations" },
] as const;

type DrillingObservationTabId = (typeof DRILLING_OBSERVATION_TABS)[number]["id"];

type DrillingObservationsSectionProps = Readonly<{
  projectId: number;
  logId: number;
  logConfigurationId: string;
}>;

export function DrillingObservationsSection({
  projectId,
  logId,
  logConfigurationId,
}: DrillingObservationsSectionProps) {
  const [activeTab, setActiveTab] = useState<DrillingObservationTabId>("methods");

  const activeLabel =
    DRILLING_OBSERVATION_TABS.find((tab) => tab.id === activeTab)?.label ?? "Drilling Methods";

  return (
    <section className="drilling-observations-section" aria-label="Drilling Observations">
      <div
        className="drilling-observations-section__tabs ui-scrollbar"
        role="tablist"
        aria-label="Drilling observation types"
      >
        {DRILLING_OBSERVATION_TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={activeTab === tab.id}
            className={`drilling-observations-section__tab${activeTab === tab.id ? " is-active" : ""}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div
        className="drilling-observations-section__panel"
        role="tabpanel"
        aria-label={activeLabel}
      >
        {activeTab === "methods" ? (
          <DrillingMethodsList
            projectId={projectId}
            logId={logId}
            logConfigurationId={logConfigurationId}
          />
        ) : activeTab === "resistances" ? (
          <DrillingResistancesList
            projectId={projectId}
            logId={logId}
            logConfigurationId={logConfigurationId}
          />
        ) : activeTab === "casings" ? (
          <DrillingCasingsList
            projectId={projectId}
            logId={logId}
            logConfigurationId={logConfigurationId}
          />
        ) : (
          <DrillingObservationsList
            projectId={projectId}
            logId={logId}
            logConfigurationId={logConfigurationId}
          />
        )}
      </div>
    </section>
  );
}
