"use client";

import { IconButton, UiButton } from "@/shared/components/ui";
import type { LogTemplateLogType } from "../../types/logTemplate";
import { DocumentIcon } from "./LtIcons";

export type LtBuilderTab = "columns" | "report";

export const LT_BUILDER_TABS: Array<{ id: LtBuilderTab; label: string }> = [
  { id: "columns", label: "Column Settings" },
  { id: "report", label: "Report Settings" },
];

type LtBuilderHeaderProps = Readonly<{
  templateName: string;
  logType: LogTemplateLogType;
  dirty: boolean;
  jsonOpen: boolean;
  activeTab: LtBuilderTab;
  onToggleJson: () => void;
  onTabChange: (tab: LtBuilderTab) => void;
  onClose: () => void;
}>;

export function LtBuilderHeader({
  templateName,
  logType,
  dirty,
  jsonOpen,
  activeTab,
  onToggleJson,
  onTabChange,
  onClose,
}: LtBuilderHeaderProps) {
  return (
    <>
      <header className="lt-fmt__header">
        <span className="lt-fmt__logo">
          <DocumentIcon size={20} />
          Log Format
        </span>

        <div className="lt-fmt__template-info">
          <strong>{templateName || "Untitled template"}</strong>
          <span className={`lt-fmt__badge lt-fmt__badge--${logType}`}>
            {logType === "corelog" ? "Corelog" : "Borelog"}
          </span>
          {dirty ? <span className="lt-fmt__badge lt-fmt__badge--dirty">Unsaved</span> : null}
        </div>

        <div className="lt-fmt__header-actions">
          <UiButton
            type="button"
            variant={jsonOpen ? "secondary" : "outline"}
            size="sm"
            aria-pressed={jsonOpen}
            onClick={onToggleJson}
          >
            {"{ } JSON"}
          </UiButton>
          <IconButton label="Close builder" onClick={onClose}>
            ×
          </IconButton>
        </div>
      </header>

      <nav className="lt-fmt__tabs" role="tablist" aria-label="Template builder sections">
        {LT_BUILDER_TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={activeTab === tab.id}
            className={`lt-fmt__tab${activeTab === tab.id ? " is-active" : ""}`}
            onClick={() => onTabChange(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </nav>
    </>
  );
}
