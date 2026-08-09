"use client";

import { useState, type DragEvent } from "react";
import { FormField, Input, UiButton } from "@/shared/components/ui";
import type { LogTemplateColumn } from "../../types/logTemplate";
import { isColumnVisible } from "./contentSchema";
import { DragIcon } from "./LtIcons";
import { LtSwitch } from "./LtSwitch";

type LtColumnListProps = Readonly<{
  width: number;
  templateName: string;
  columns: LogTemplateColumn[];
  selectedCode: string | null;
  saving: boolean;
  onTemplateNameChange: (name: string) => void;
  onSelect: (code: string) => void;
  onToggleVisibility: (code: string, visible: boolean) => void;
  onReorder: (sourceCode: string, targetCode: string) => void;
  onAddColumn: (name: string) => void;
  onSave: () => void;
}>;

export function LtColumnList({
  width,
  templateName,
  columns,
  selectedCode,
  saving,
  onTemplateNameChange,
  onSelect,
  onToggleVisibility,
  onReorder,
  onAddColumn,
  onSave,
}: LtColumnListProps) {
  const [newColumnName, setNewColumnName] = useState("");
  const [draggingCode, setDraggingCode] = useState<string | null>(null);
  const [dragOverCode, setDragOverCode] = useState<string | null>(null);
  const [expandedCodes, setExpandedCodes] = useState<string[]>([]);

  const submitNewColumn = () => {
    const name = newColumnName.trim() || "New Column";
    onAddColumn(name);
    setNewColumnName("");
  };

  const toggleExpanded = (code: string) => {
    setExpandedCodes((current) =>
      current.includes(code) ? current.filter((entry) => entry !== code) : [...current, code]
    );
  };

  return (
    <aside className="lt-fmt__list" style={{ width, flex: `0 0 ${width}px` }}>
      <div className="lt-fmt__list-top">
        <FormField label="Template Name" htmlFor="lt-template-name">
          <Input
            id="lt-template-name"
            variant="ui"
            value={templateName}
            placeholder="Template name"
            onChange={(event) => onTemplateNameChange(event.target.value)}
          />
        </FormField>

        <FormField label="Add config column" htmlFor="lt-add-column">
          <div className="lt-fmt__add-row">
            <Input
              id="lt-add-column"
              variant="ui"
              value={newColumnName}
              placeholder="Add config column"
              onChange={(event) => setNewColumnName(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  submitNewColumn();
                }
              }}
            />
            <UiButton type="button" onClick={submitNewColumn}>
              Add
            </UiButton>
          </div>
        </FormField>

        <UiButton type="button" block disabled={saving} onClick={onSave}>
          {saving ? "Saving…" : "Update Log"}
        </UiButton>
      </div>

      <ul className="lt-fmt__columns ui-scrollbar">
        {columns.map((column) => {
          const visible = isColumnVisible(column);
          const children = column.child_columns ?? [];
          const expanded = expandedCodes.includes(column.code);

          return (
            <li key={column.code}>
              <div
                className={[
                  "lt-fmt__column",
                  selectedCode === column.code ? "is-selected" : "",
                  visible ? "" : "is-off",
                  dragOverCode === column.code ? "is-drag-over" : "",
                  draggingCode === column.code ? "is-dragging" : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
                onDragOver={(event: DragEvent<HTMLDivElement>) => {
                  event.preventDefault();
                  event.dataTransfer.dropEffect = "move";
                  setDragOverCode(column.code);
                }}
                onDragLeave={() => setDragOverCode(null)}
                onDrop={(event: DragEvent<HTMLDivElement>) => {
                  event.preventDefault();
                  const sourceCode = event.dataTransfer.getData("text/plain");
                  if (sourceCode) onReorder(sourceCode, column.code);
                  setDraggingCode(null);
                  setDragOverCode(null);
                }}
              >
                <button
                  type="button"
                  className="lt-fmt__drag"
                  draggable
                  aria-label={`Reorder ${column.text}`}
                  title="Drag to reorder"
                  onDragStart={(event: DragEvent<HTMLButtonElement>) => {
                    event.dataTransfer.setData("text/plain", column.code);
                    event.dataTransfer.effectAllowed = "move";
                    setDraggingCode(column.code);
                  }}
                  onDragEnd={() => {
                    setDraggingCode(null);
                    setDragOverCode(null);
                  }}
                >
                  <DragIcon size={16} />
                </button>

                {children.length > 0 ? (
                  <button
                    type="button"
                    className="lt-fmt__expand"
                    aria-expanded={expanded}
                    aria-label={`${expanded ? "Collapse" : "Expand"} ${column.text}`}
                    onClick={() => toggleExpanded(column.code)}
                  >
                    {expanded ? "−" : "+"}
                  </button>
                ) : null}

                <button
                  type="button"
                  className="lt-fmt__column-name"
                  onClick={() => onSelect(column.code)}
                >
                  {column.text}
                </button>

                <LtSwitch
                  checked={visible}
                  label={`${visible ? "Hide" : "Show"} ${column.text}`}
                  onChange={(checked) => onToggleVisibility(column.code, checked)}
                />
              </div>

              {children.length > 0 && expanded ? (
                <ul className="lt-fmt__child-list">
                  {children.map((child) => (
                    <li key={child.code} className="lt-fmt__child">
                      {child.text}
                    </li>
                  ))}
                </ul>
              ) : null}
            </li>
          );
        })}
      </ul>
    </aside>
  );
}
