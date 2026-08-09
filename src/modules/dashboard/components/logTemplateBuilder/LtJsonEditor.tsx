"use client";

import { useEffect, useState } from "react";
import { UiButton } from "@/shared/components/ui";
import type { LogTemplateConfig, LogTemplateLogType } from "../../types/logTemplate";
import { normalizeLogTemplateConfig } from "./contentSchema";

type LtJsonEditorProps = Readonly<{
  config: LogTemplateConfig;
  templateName: string;
  logType: LogTemplateLogType;
  saving: boolean;
  onApply: (next: {
    config: LogTemplateConfig;
    name?: string;
    logType?: LogTemplateLogType;
  }) => void;
  onSave: () => void;
  onSaveAsNew?: (next: {
    config: LogTemplateConfig;
    name: string;
    logType: LogTemplateLogType;
  }) => void;
}>;

type ParsedPayload = {
  config: LogTemplateConfig;
  name?: string;
  logType?: LogTemplateLogType;
};

function buildEditorDocument(
  config: LogTemplateConfig,
  templateName: string,
  logType: LogTemplateLogType
) {
  return {
    name: templateName,
    type: logType,
    logType,
    config,
  };
}

function parseEditorText(raw: string): ParsedPayload {
  const parsed = JSON.parse(raw) as unknown;
  if (!parsed || typeof parsed !== "object") {
    throw new Error("JSON must be an object");
  }

  const root = parsed as Record<string, unknown>;

  // Full Tablogs update payload / our editor document
  if (root.config && typeof root.config === "object") {
    const config = normalizeLogTemplateConfig(root.config);
    const name = typeof root.name === "string" ? root.name : undefined;
    const typeRaw = root.logType ?? root.type;
    const logType =
      typeRaw === "corelog" || typeRaw === "borelog" ? typeRaw : undefined;
    return { config, name, logType };
  }

  // Bare config object (columnData present)
  if (Array.isArray(root.columnData)) {
    return { config: normalizeLogTemplateConfig(root) };
  }

  throw new Error(
    'JSON must include a "config" object or a bare template config with "columnData".'
  );
}

export function LtJsonEditor({
  config,
  templateName,
  logType,
  saving,
  onApply,
  onSave,
  onSaveAsNew,
}: LtJsonEditorProps) {
  const [text, setText] = useState(() =>
    JSON.stringify(buildEditorDocument(config, templateName, logType), null, 2)
  );
  const [error, setError] = useState<string | null>(null);
  const [dirtyJson, setDirtyJson] = useState(false);

  useEffect(() => {
    if (dirtyJson) return;
    setText(JSON.stringify(buildEditorDocument(config, templateName, logType), null, 2));
  }, [config, templateName, logType, dirtyJson]);

  const applyJson = () => {
    try {
      const payload = parseEditorText(text);
      onApply(payload);
      setError(null);
      setDirtyJson(false);
      setText(
        JSON.stringify(
          buildEditorDocument(
            payload.config,
            payload.name ?? templateName,
            payload.logType ?? logType
          ),
          null,
          2
        )
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Invalid JSON");
    }
  };

  const formatJson = () => {
    try {
      const payload = parseEditorText(text);
      setText(
        JSON.stringify(
          buildEditorDocument(
            payload.config,
            payload.name ?? templateName,
            payload.logType ?? logType
          ),
          null,
          2
        )
      );
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Invalid JSON");
    }
  };

  const resetJson = () => {
    setText(JSON.stringify(buildEditorDocument(config, templateName, logType), null, 2));
    setDirtyJson(false);
    setError(null);
  };

  const saveAsNew = () => {
    if (!onSaveAsNew) return;
    try {
      const payload = parseEditorText(text);
      onSaveAsNew({
        config: payload.config,
        name: (payload.name ?? templateName).trim() || "New Template",
        logType: payload.logType ?? logType,
      });
      setError(null);
      setDirtyJson(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Invalid JSON");
    }
  };

  return (
    <section className="lt-fmt__json-panel">
      <div className="lt-fmt__json-toolbar">
        <div>
          <h3 className="lt-fmt__section-title" style={{ margin: 0 }}>
            Template JSON
          </h3>
          <p className="lt-fmt__section-note" style={{ marginTop: 4 }}>
            Edit JSON to update this template, or use <strong>Save as new</strong> to create
            another template from the payload. Accepts{" "}
            <code>{"{ name, type, config }"}</code> or a bare config with{" "}
            <code>columnData</code>.
          </p>
        </div>
        <div className="lt-fmt__json-actions">
          <UiButton type="button" variant="outline" size="sm" onClick={formatJson}>
            Format
          </UiButton>
          <UiButton type="button" variant="outline" size="sm" onClick={resetJson}>
            Reset
          </UiButton>
          <UiButton type="button" variant="secondary" size="sm" onClick={applyJson}>
            Apply to builder
          </UiButton>
          <UiButton type="button" size="sm" disabled={saving} onClick={onSave}>
            {saving ? "Saving…" : "Save template"}
          </UiButton>
          {onSaveAsNew ? (
            <UiButton type="button" variant="outline" size="sm" disabled={saving} onClick={saveAsNew}>
              Save as new
            </UiButton>
          ) : null}
        </div>
      </div>

      {error ? <p className="lt-fmt__json-error">{error}</p> : null}

      <textarea
        className="lt-fmt__json-editor ui-scrollbar"
        spellCheck={false}
        value={text}
        aria-label="Template JSON"
        onChange={(event) => {
          setText(event.target.value);
          setDirtyJson(true);
          if (error) setError(null);
        }}
      />
    </section>
  );
}
