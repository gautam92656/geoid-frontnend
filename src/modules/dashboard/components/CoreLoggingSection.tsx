"use client";

import { useState } from "react";
import { CoreDefectsList } from "./CoreDefectsList";
import { RqdTcrList } from "./RqdTcrList";

const CORE_LOGGING_TABS = [
  { id: "core-defects", label: "Core Defects" },
  { id: "rqd-tcr", label: "RQD / TCR" },
] as const;

type CoreLoggingTabId = (typeof CORE_LOGGING_TABS)[number]["id"];

type CoreLoggingSectionProps = Readonly<{
  projectId: number;
  logId: number;
  logConfigurationId: string;
}>;

export function CoreLoggingSection({
  projectId,
  logId,
  logConfigurationId,
}: CoreLoggingSectionProps) {
  const [activeTab, setActiveTab] = useState<CoreLoggingTabId>("core-defects");

  const activeLabel =
    CORE_LOGGING_TABS.find((tab) => tab.id === activeTab)?.label ?? "Core Defects";

  return (
    <section className="core-logging-section" aria-label="Core Logging">
      <div
        className="core-logging-section__tabs ui-scrollbar"
        role="tablist"
        aria-label="Core logging types"
      >
        {CORE_LOGGING_TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={activeTab === tab.id}
            className={`core-logging-section__tab${activeTab === tab.id ? " is-active" : ""}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div
        className="core-logging-section__panel"
        role="tabpanel"
        aria-label={activeLabel}
      >
        {activeTab === "core-defects" ? (
          <CoreDefectsList
            projectId={projectId}
            logId={logId}
            logConfigurationId={logConfigurationId}
          />
        ) : (
          <RqdTcrList
            projectId={projectId}
            logId={logId}
            logConfigurationId={logConfigurationId}
          />
        )}
      </div>
    </section>
  );
}
