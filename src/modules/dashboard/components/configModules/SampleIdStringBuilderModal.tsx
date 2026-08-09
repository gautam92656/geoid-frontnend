"use client";

import type { DragEvent } from "react";
import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { ProjectModalPortal, UiButton } from "@/shared/components/ui";
import {
  DEFAULT_AUTO_SAMPLE_ID_FORMAT_STRING,
  SAMPLE_ID_FORMAT_VARIABLES,
  findSampleIdFormatVariable,
  parseSampleIdFormatString,
  previewSampleIdFormatString,
  serializeSampleIdFormatTokens,
  type SampleIdFormatToken,
  type SampleIdFormatVariable,
} from "../../utils/configModules/sampleIdFormat";

type SampleIdStringBuilderModalProps = Readonly<{
  open: boolean;
  formatString: string;
  onClose: () => void;
  onSave: (formatString: string) => void | Promise<void>;
}>;

type BuilderItem =
  | { id: string; kind: "variable"; value: string; name: string }
  | { id: string; kind: "text"; value: string };

function DragHandleIcon({ size = 10 }: Readonly<{ size?: number }>) {
  const height = Math.round((size / 10) * 16);
  return (
    <svg width={size} height={height} viewBox="0 0 10 16" fill="none" aria-hidden="true">
      {[2.55556, 8.77777, 15].flatMap((cy, row) =>
        [1.77778, 8].map((cx, col) => (
          <path
            key={`${row}-${col}`}
            d={`M${cx} ${cy}C${cx + 0.42955} ${cy} ${cx + 0.77778} ${cy - 0.34823} ${cx + 0.77778} ${cy - 0.77778}C${cx + 0.77778} ${cy - 1.20734} ${cx + 0.42955} ${cy - 1.55556} ${cx} ${cy - 1.55556}C${cx - 0.42956} ${cy - 1.55556} ${cx - 0.77778} ${cy - 1.20734} ${cx - 0.77778} ${cy - 0.77778}C${cx - 0.77778} ${cy - 0.34823} ${cx - 0.42956} ${cy} ${cx} ${cy}Z`}
            stroke="currentColor"
            strokeWidth="1.55556"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ))
      )}
    </svg>
  );
}

function DeleteChipIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 9 8" fill="none" aria-hidden="true">
      <path
        d="M6.39846 2.37962L3.15771 5.62036M3.15771 2.37962L6.39846 5.62036"
        stroke="currentColor"
        strokeWidth="1"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function InfoIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
    </svg>
  );
}

function createItemId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `sid-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function tokensToItems(tokens: readonly SampleIdFormatToken[]): BuilderItem[] {
  return tokens.map((token) =>
    token.kind === "variable"
      ? { id: createItemId(), kind: "variable", value: token.value, name: token.name }
      : { id: createItemId(), kind: "text", value: token.value }
  );
}

function itemsToTokens(items: readonly BuilderItem[]): SampleIdFormatToken[] {
  return items.map((item) =>
    item.kind === "variable"
      ? { kind: "variable", value: item.value, name: item.name }
      : { kind: "text", value: item.value }
  );
}

function mergeAdjacentText(items: BuilderItem[]): BuilderItem[] {
  const merged: BuilderItem[] = [];
  for (const item of items) {
    const last = merged[merged.length - 1];
    if (item.kind === "text" && last?.kind === "text") {
      last.value += item.value;
      continue;
    }
    merged.push({ ...item });
  }
  return merged.filter((item) => item.kind === "variable" || item.value.length > 0);
}

function reorderItems(items: BuilderItem[], sourceId: string, targetId: string): BuilderItem[] {
  if (sourceId === targetId) return items;
  const sourceIndex = items.findIndex((item) => item.id === sourceId);
  const targetIndex = items.findIndex((item) => item.id === targetId);
  if (sourceIndex < 0 || targetIndex < 0) return items;
  const next = [...items];
  const [moved] = next.splice(sourceIndex, 1);
  next.splice(targetIndex, 0, moved);
  return next;
}

function variableToItem(variable: SampleIdFormatVariable): BuilderItem {
  return {
    id: createItemId(),
    kind: "variable",
    value: variable.value,
    name: variable.name,
  };
}

export function SampleIdStringBuilderModal({
  open,
  formatString,
  onClose,
  onSave,
}: SampleIdStringBuilderModalProps) {
  const titleId = useId();
  const literalInputRef = useRef<HTMLInputElement | null>(null);
  const [items, setItems] = useState<BuilderItem[]>([]);
  const [initialFormat, setInitialFormat] = useState(DEFAULT_AUTO_SAMPLE_ID_FORMAT_STRING);
  const [literalDraft, setLiteralDraft] = useState("");
  const [search, setSearch] = useState("");
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const filteredVariables = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return SAMPLE_ID_FORMAT_VARIABLES;
    return SAMPLE_ID_FORMAT_VARIABLES.filter(
      (entry) =>
        entry.name.toLowerCase().includes(query) ||
        entry.value.toLowerCase().includes(query) ||
        (entry.hint?.toLowerCase().includes(query) ?? false)
    );
  }, [search]);

  const serializedFormat = useMemo(() => {
    const base = serializeSampleIdFormatTokens(itemsToTokens(items));
    return `${base}${literalDraft}`;
  }, [items, literalDraft]);

  const formatPreview = useMemo(
    () => previewSampleIdFormatString(serializedFormat),
    [serializedFormat]
  );

  const resetFromFormat = useCallback((nextFormat: string) => {
    const normalized = nextFormat.trim() || DEFAULT_AUTO_SAMPLE_ID_FORMAT_STRING;
    setItems(tokensToItems(parseSampleIdFormatString(normalized)));
    setInitialFormat(normalized);
    setLiteralDraft("");
  }, []);

  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.stopImmediatePropagation();
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown, true);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown, true);
    };
  }, [onClose, open]);

  useEffect(() => {
    if (!open) {
      setSearch("");
      setLiteralDraft("");
      setDraggingId(null);
      setDragOverId(null);
      setSubmitting(false);
      return;
    }
    resetFromFormat(formatString || DEFAULT_AUTO_SAMPLE_ID_FORMAT_STRING);
  }, [formatString, open, resetFromFormat]);

  const commitLiteralDraft = useCallback(() => {
    const text = literalDraft;
    if (!text) return;
    setItems((current) => mergeAdjacentText([...current, { id: createItemId(), kind: "text", value: text }]));
    setLiteralDraft("");
  }, [literalDraft]);

  const insertVariable = (variable: SampleIdFormatVariable) => {
    setItems((current) => {
      const withLiteral =
        literalDraft.length > 0
          ? mergeAdjacentText([
              ...current,
              { id: createItemId(), kind: "text", value: literalDraft },
            ])
          : current;
      return mergeAdjacentText([...withLiteral, variableToItem(variable)]);
    });
    setLiteralDraft("");
    literalInputRef.current?.focus();
  };

  const removeItem = (itemId: string) => {
    setItems((current) => mergeAdjacentText(current.filter((item) => item.id !== itemId)));
  };

  const handleReset = () => {
    resetFromFormat(initialFormat);
  };

  const handleVariableDragStart = (
    event: DragEvent<HTMLButtonElement>,
    variable: SampleIdFormatVariable
  ) => {
    event.dataTransfer.effectAllowed = "copy";
    event.dataTransfer.setData("application/x-sample-id-variable", variable.value);
    event.dataTransfer.setData("text/plain", variable.value);
  };

  const handleChipDragStart = (event: DragEvent<HTMLSpanElement>, itemId: string) => {
    setDraggingId(itemId);
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("application/x-sample-id-item", itemId);
    event.dataTransfer.setData("text/plain", itemId);
  };

  const handleChipDragOver = (event: DragEvent<HTMLSpanElement>, itemId: string) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
    if (dragOverId !== itemId) setDragOverId(itemId);
  };

  const handleChipDrop = (event: DragEvent<HTMLSpanElement>, targetId: string) => {
    event.preventDefault();
    const sourceId = event.dataTransfer.getData("application/x-sample-id-item") || draggingId;
    if (!sourceId) return;
    setItems((current) => reorderItems(current, sourceId, targetId));
    setDraggingId(null);
    setDragOverId(null);
  };

  const handleAreaDragOver = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "copy";
  };

  const handleAreaDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const variableValue = event.dataTransfer.getData("application/x-sample-id-variable");
    if (!variableValue) return;
    const variable = findSampleIdFormatVariable(variableValue);
    if (variable) insertVariable(variable);
    setDraggingId(null);
    setDragOverId(null);
  };

  const handleSave = async () => {
    if (submitting) return;
    setSubmitting(true);
    try {
      const next = serializedFormat.trim() || DEFAULT_AUTO_SAMPLE_ID_FORMAT_STRING;
      await onSave(next);
      onClose();
    } catch {
      // Parent surfaces errors; keep modal open for retry.
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ProjectModalPortal open={open}>
      <div className="project-modal project-modal--stacked project-modal--nested" role="presentation">
        <button
          type="button"
          className="project-modal__backdrop"
          aria-label="Close Auto Sample ID Format dialog"
          onClick={onClose}
        />

        <div
          className="project-modal__dialog project-modal__dialog--scroll project-modal__dialog--wide sample-id-string-builder"
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
        >
          <div className="project-modal__header">
            <h2 id={titleId} className="project-modal__title">
              Auto Sample ID Format
            </h2>
          </div>

          <div className="project-modal__body ui-scrollbar">
            <div className="sample-id-string-builder__layout">
              <aside className="sample-id-string-builder__sidebar">
                <div className="sample-id-string-builder__sidebar-head">
                  <h3 className="sample-id-string-builder__sidebar-title">Available Variables</h3>
                  <span
                    className="sample-id-string-builder__info"
                    title="Variables you can drag or click to insert into the string, including log data, project info, and more."
                  >
                    <InfoIcon />
                  </span>
                </div>

                <label className="sample-id-string-builder__search" htmlFor={`${titleId}-search`}>
                  <span className="sample-id-string-builder__search-icon" aria-hidden="true">
                    ⌕
                  </span>
                  <input
                    id={`${titleId}-search`}
                    type="search"
                    placeholder="Search item..."
                    value={search}
                    disabled={submitting}
                    onChange={(event) => setSearch(event.target.value)}
                  />
                </label>

                <div className="sample-id-string-builder__variable-list" role="list">
                  {filteredVariables.map((variable) => (
                    <button
                      key={variable.value}
                      type="button"
                      className="sample-id-string-builder__variable"
                      draggable={!submitting}
                      disabled={submitting}
                      onClick={() => insertVariable(variable)}
                      onDragStart={(event) => handleVariableDragStart(event, variable)}
                    >
                      <span className="sample-id-string-builder__variable-handle" aria-hidden="true">
                        <DragHandleIcon />
                      </span>
                      <span className="sample-id-string-builder__variable-copy">
                        <span className="sample-id-string-builder__variable-name">
                          {variable.name}
                        </span>
                        {variable.hint ? (
                          <span className="sample-id-string-builder__variable-hint">
                            {variable.hint}
                          </span>
                        ) : null}
                      </span>
                    </button>
                  ))}
                  {filteredVariables.length === 0 ? (
                    <p className="sample-id-string-builder__empty">No variables match your search.</p>
                  ) : null}
                </div>
              </aside>

              <div className="sample-id-string-builder__main">
                <div className="sample-id-string-builder__section-head">
                  <h3 className="sample-id-string-builder__section-title">String Area</h3>
                  <UiButton
                    type="button"
                    variant="secondary"
                    size="sm"
                    disabled={submitting}
                    onClick={handleReset}
                  >
                    Reset
                  </UiButton>
                </div>

                <div
                  className="sample-id-string-builder__editor"
                  onDragOver={handleAreaDragOver}
                  onDrop={handleAreaDrop}
                  onClick={() => literalInputRef.current?.focus()}
                >
                  {items.map((item) =>
                    item.kind === "variable" ? (
                      <span
                        key={item.id}
                        className={[
                          "sample-id-string-builder__chip",
                          draggingId === item.id ? "is-dragging" : "",
                          dragOverId === item.id ? "is-drag-over" : "",
                        ]
                          .filter(Boolean)
                          .join(" ")}
                        draggable={!submitting}
                        onDragStart={(event) => handleChipDragStart(event, item.id)}
                        onDragOver={(event) => handleChipDragOver(event, item.id)}
                        onDrop={(event) => handleChipDrop(event, item.id)}
                        onDragEnd={() => {
                          setDraggingId(null);
                          setDragOverId(null);
                        }}
                      >
                        <DragHandleIcon size={6} />
                        <span>{item.name}</span>
                        <button
                          type="button"
                          className="sample-id-string-builder__chip-delete"
                          aria-label={`Remove ${item.name}`}
                          disabled={submitting}
                          onClick={(event) => {
                            event.stopPropagation();
                            removeItem(item.id);
                          }}
                        >
                          <DeleteChipIcon />
                        </button>
                      </span>
                    ) : (
                      <span key={item.id} className="sample-id-string-builder__text">
                        {item.value}
                      </span>
                    )
                  )}

                  <input
                    ref={literalInputRef}
                    type="text"
                    className="sample-id-string-builder__literal-input"
                    value={literalDraft}
                    disabled={submitting}
                    placeholder={items.length === 0 ? "Type literal text, or insert variables…" : ""}
                    aria-label="Literal text for sample ID format"
                    onChange={(event) => setLiteralDraft(event.target.value)}
                    onBlur={commitLiteralDraft}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.preventDefault();
                        commitLiteralDraft();
                      }
                      if (event.key === "Backspace" && !literalDraft && items.length > 0) {
                        event.preventDefault();
                        const last = items[items.length - 1];
                        if (last.kind === "text") {
                          setItems((current) => current.slice(0, -1));
                          setLiteralDraft(last.value.slice(0, -1));
                        } else {
                          removeItem(last.id);
                        }
                      }
                    }}
                  />
                </div>

                <h3 className="sample-id-string-builder__section-title">Preview</h3>
                <div className="sample-id-string-builder__preview" aria-live="polite">
                  {formatPreview || "—"}
                </div>
              </div>
            </div>
          </div>

          <div className="project-modal__footer">
            <UiButton type="button" variant="ghost" disabled={submitting} onClick={onClose}>
              Cancel
            </UiButton>
            <UiButton type="button" variant="primary" disabled={submitting} onClick={handleSave}>
              {submitting ? "Saving…" : "Save"}
            </UiButton>
          </div>
        </div>
      </div>
    </ProjectModalPortal>
  );
}
