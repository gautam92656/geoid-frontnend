"use client";

import type { DragEvent } from "react";
import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { ProjectModalPortal, UiButton } from "@/shared/components/ui";
import {
  findRendererPlaceholder,
  mergeAdjacentTextTokens,
  parseDynamicString,
  previewDynamicString,
  serializeDynamicString,
  type DynamicStringToken,
} from "./dynamicString";
import { RENDERER_PLACEHOLDERS, type RendererPlaceholder } from "./rendererRegistry";

type DynamicStringBuilderModalProps = Readonly<{
  open: boolean;
  value: string;
  onClose: () => void;
  onSave: (value: string) => void;
}>;

type BuilderItem =
  | { id: string; kind: "variable"; token: string; label: string }
  | { id: string; kind: "text"; value: string };

const CATEGORIES = ["System", "Company", "Project", "Log", "Location"] as const;

function createItemId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `dsb-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function tokensToItems(tokens: readonly DynamicStringToken[]): BuilderItem[] {
  return tokens.map((token) =>
    token.kind === "variable"
      ? { id: createItemId(), kind: "variable", token: token.token, label: token.label }
      : { id: createItemId(), kind: "text", value: token.value }
  );
}

function itemsToTokens(items: readonly BuilderItem[]): DynamicStringToken[] {
  return items.map((item) =>
    item.kind === "variable"
      ? { kind: "variable", token: item.token, label: item.label }
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
    if (item.kind === "text" && item.value.length === 0) continue;
    merged.push({ ...item });
  }
  return merged;
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

export function DynamicStringBuilderModal({
  open,
  value,
  onClose,
  onSave,
}: DynamicStringBuilderModalProps) {
  if (!open) return null;
  return <DynamicStringBuilder value={value} onClose={onClose} onSave={onSave} />;
}

function DynamicStringBuilder({
  value,
  onClose,
  onSave,
}: Omit<DynamicStringBuilderModalProps, "open">) {
  const titleId = useId();
  const literalInputRef = useRef<HTMLInputElement | null>(null);
  const [items, setItems] = useState<BuilderItem[]>(() =>
    tokensToItems(parseDynamicString(value))
  );
  const [initialValue] = useState(value);
  const [literalDraft, setLiteralDraft] = useState("");
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<(typeof CATEGORIES)[number] | "All">("All");
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);

  const filteredVariables = useMemo(() => {
    const query = search.trim().toLowerCase();
    return RENDERER_PLACEHOLDERS.filter((entry) => {
      if (category !== "All" && entry.category !== category) return false;
      if (!query) return true;
      return (
        entry.label.toLowerCase().includes(query) ||
        entry.token.toLowerCase().includes(query) ||
        entry.category.toLowerCase().includes(query)
      );
    });
  }, [category, search]);

  const serialized = useMemo(() => {
    const base = serializeDynamicString(
      mergeAdjacentTextTokens(itemsToTokens(items))
    );
    return `${base}${literalDraft}`;
  }, [items, literalDraft]);

  const preview = useMemo(() => previewDynamicString(serialized), [serialized]);

  const resetFromValue = useCallback((nextValue: string) => {
    setItems(tokensToItems(parseDynamicString(nextValue)));
    setLiteralDraft("");
  }, []);

  useEffect(() => {
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
  }, [onClose]);

  const commitLiteralDraft = useCallback(() => {
    if (!literalDraft) return;
    setItems((current) =>
      mergeAdjacentText([...current, { id: createItemId(), kind: "text", value: literalDraft }])
    );
    setLiteralDraft("");
  }, [literalDraft]);

  const insertVariable = (placeholder: RendererPlaceholder) => {
    setItems((current) => {
      const withLiteral =
        literalDraft.length > 0
          ? mergeAdjacentText([
              ...current,
              { id: createItemId(), kind: "text", value: literalDraft },
            ])
          : current;
      return mergeAdjacentText([
        ...withLiteral,
        {
          id: createItemId(),
          kind: "variable",
          token: placeholder.token,
          label: placeholder.label,
        },
      ]);
    });
    setLiteralDraft("");
    literalInputRef.current?.focus();
  };

  const removeItem = (itemId: string) => {
    setItems((current) => mergeAdjacentText(current.filter((item) => item.id !== itemId)));
  };

  const handleVariableDragStart = (
    event: DragEvent<HTMLButtonElement>,
    placeholder: RendererPlaceholder
  ) => {
    event.dataTransfer.effectAllowed = "copy";
    event.dataTransfer.setData("application/x-hf-variable", placeholder.token);
    event.dataTransfer.setData("text/plain", placeholder.token);
  };

  const handleChipDragStart = (event: DragEvent<HTMLSpanElement>, itemId: string) => {
    setDraggingId(itemId);
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("application/x-hf-item", itemId);
  };

  const handleChipDragOver = (event: DragEvent<HTMLSpanElement>, itemId: string) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
    if (dragOverId !== itemId) setDragOverId(itemId);
  };

  const handleChipDrop = (event: DragEvent<HTMLSpanElement>, targetId: string) => {
    event.preventDefault();
    const sourceId = event.dataTransfer.getData("application/x-hf-item") || draggingId;
    if (!sourceId) return;
    setItems((current) => reorderItems(current, sourceId, targetId));
    setDraggingId(null);
    setDragOverId(null);
  };

  const handleAreaDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const token = event.dataTransfer.getData("application/x-hf-variable");
    const placeholder = token ? findRendererPlaceholder(token) : undefined;
    if (placeholder) insertVariable(placeholder);
    setDraggingId(null);
    setDragOverId(null);
  };

  const handleSave = () => {
    onSave(serialized);
    onClose();
  };

  return (
    <ProjectModalPortal open>
      <div className="project-modal project-modal--stacked project-modal--nested" role="presentation">
        <button
          type="button"
          className="project-modal__backdrop"
          aria-label="Close Dynamic String Builder"
          onClick={onClose}
        />

        <div
          className="project-modal__dialog project-modal__dialog--scroll project-modal__dialog--wide sample-id-string-builder hf-dynamic-string-builder"
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
        >
          <div className="project-modal__header">
            <h2 id={titleId} className="project-modal__title">
              Dynamic String Builder
            </h2>
          </div>

          <div className="project-modal__body ui-scrollbar">
            <div className="sample-id-string-builder__layout">
              <aside className="sample-id-string-builder__sidebar">
                <div className="sample-id-string-builder__sidebar-head">
                  <h3 className="sample-id-string-builder__sidebar-title">Available Variables</h3>
                </div>

                <div className="hf-dynamic-string-builder__categories" role="tablist">
                  <button
                    type="button"
                    className={category === "All" ? "is-active" : ""}
                    onClick={() => setCategory("All")}
                  >
                    All
                  </button>
                  {CATEGORIES.map((entry) => (
                    <button
                      key={entry}
                      type="button"
                      className={category === entry ? "is-active" : ""}
                      onClick={() => setCategory(entry)}
                    >
                      {entry}
                    </button>
                  ))}
                </div>

                <label className="sample-id-string-builder__search" htmlFor={`${titleId}-search`}>
                  <span className="sample-id-string-builder__search-icon" aria-hidden="true">
                    ⌕
                  </span>
                  <input
                    id={`${titleId}-search`}
                    type="search"
                    placeholder="Search variables…"
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                  />
                </label>

                <div className="sample-id-string-builder__variable-list" role="list">
                  {filteredVariables.map((placeholder) => (
                    <button
                      key={placeholder.token}
                      type="button"
                      className="sample-id-string-builder__variable"
                      draggable
                      onClick={() => insertVariable(placeholder)}
                      onDragStart={(event) => handleVariableDragStart(event, placeholder)}
                    >
                      <span className="sample-id-string-builder__variable-handle" aria-hidden="true">
                        <DragHandleIcon />
                      </span>
                      <span className="sample-id-string-builder__variable-copy">
                        <span className="sample-id-string-builder__variable-name">
                          {placeholder.label}
                        </span>
                        <span className="sample-id-string-builder__variable-hint">
                          {placeholder.token}
                        </span>
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
                    onClick={() => resetFromValue(initialValue)}
                  >
                    Reset
                  </UiButton>
                </div>

                <div
                  className="sample-id-string-builder__editor"
                  onDragOver={(event) => {
                    event.preventDefault();
                    event.dataTransfer.dropEffect = "copy";
                  }}
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
                        draggable
                        onDragStart={(event) => handleChipDragStart(event, item.id)}
                        onDragOver={(event) => handleChipDragOver(event, item.id)}
                        onDrop={(event) => handleChipDrop(event, item.id)}
                        onDragEnd={() => {
                          setDraggingId(null);
                          setDragOverId(null);
                        }}
                      >
                        <DragHandleIcon size={6} />
                        <span>{item.label}</span>
                        <button
                          type="button"
                          className="sample-id-string-builder__chip-delete"
                          aria-label={`Remove ${item.label}`}
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
                    placeholder={
                      items.length === 0 ? "Type text, or insert variables…" : ""
                    }
                    aria-label="Literal text"
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
                  {preview || "—"}
                </div>
              </div>
            </div>
          </div>

          <div className="project-modal__footer">
            <UiButton type="button" variant="ghost" onClick={onClose}>
              Cancel
            </UiButton>
            <UiButton type="button" variant="primary" onClick={handleSave}>
              Apply
            </UiButton>
          </div>
        </div>
      </div>
    </ProjectModalPortal>
  );
}
