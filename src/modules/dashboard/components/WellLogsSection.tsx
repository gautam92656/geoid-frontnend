"use client";

import { useState } from "react";
import { WellBackfillsList } from "./WellBackfillsList";
import { WellCasingTopsList } from "./WellCasingTopsList";
import { WellCasingsList } from "./WellCasingsList";
import { WellCoversList } from "./WellCoversList";
import { WellLogsList } from "./WellLogsList";
import { WellProbesList } from "./WellProbesList";

const WELL_LOG_TABS = [
  { id: "well-logs", label: "Well Logs" },
  { id: "well-covers", label: "Well Covers" },
  { id: "well-probes", label: "Well Probes & Instruments" },
  { id: "well-backfills", label: "Well Backfills" },
  { id: "well-casings", label: "Well Casings" },
  { id: "well-casing-tops", label: "Well Casing Tops" },
] as const;

type WellLogTabId = (typeof WELL_LOG_TABS)[number]["id"];

type WellLogsSectionProps = Readonly<{
  projectId: number;
  logId: number;
  logConfigurationId: string;
}>;

export function WellLogsSection({
  projectId: _projectId,
  logId: _logId,
  logConfigurationId: _logConfigurationId,
}: WellLogsSectionProps) {
  const [activeTab, setActiveTab] = useState<WellLogTabId>("well-logs");

  const activeLabel =
    WELL_LOG_TABS.find((tab) => tab.id === activeTab)?.label ?? "Well Logs";

  return (
    <section className="well-logs-section" aria-label="Well Logs">
      <div
        className="well-logs-section__tabs ui-scrollbar"
        role="tablist"
        aria-label="Well log types"
      >
        {WELL_LOG_TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={activeTab === tab.id}
            className={`well-logs-section__tab${activeTab === tab.id ? " is-active" : ""}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div
        className="well-logs-section__panel"
        role="tabpanel"
        aria-label={activeLabel}
      >
        {activeTab === "well-logs" ? (
          <WellLogsList />
        ) : activeTab === "well-covers" ? (
          <WellCoversList />
        ) : activeTab === "well-probes" ? (
          <WellProbesList />
        ) : activeTab === "well-backfills" ? (
          <WellBackfillsList />
        ) : activeTab === "well-casings" ? (
          <WellCasingsList />
        ) : (
          <WellCasingTopsList />
        )}
      </div>
    </section>
  );
}
