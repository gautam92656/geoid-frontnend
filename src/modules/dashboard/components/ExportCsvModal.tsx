"use client";

import { useEffect, useId, useMemo, useState } from "react";
import { Checkbox, UiButton, ProjectModalPortal } from "@/shared/components/ui";
import { showApiSuccess } from "@/shared/utils/apiToast";
import { exportRowsToCsv, type ExportColumnDef } from "@/shared/utils/exportCsv";

type ExportCsvModalProps<T> = Readonly<{
  open: boolean;
  onClose: () => void;
  title: string;
  filename: string;
  columns: ExportColumnDef<T>[];
  data: T[];
  selectedCount?: number;
}>;

export function ExportCsvModal<T>({
  open,
  onClose,
  title,
  filename,
  columns,
  data,
  selectedCount = 0,
}: ExportCsvModalProps<T>) {
  const titleId = useId();
  const [selectedColumnIds, setSelectedColumnIds] = useState<Set<string>>(() => new Set());

  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, onClose]);

  useEffect(() => {
    if (!open) return;
    setSelectedColumnIds(new Set(columns.map((column) => column.id)));
  }, [open, columns]);

  const selectedColumns = useMemo(
    () => columns.filter((column) => selectedColumnIds.has(column.id)),
    [columns, selectedColumnIds]
  );

  const allColumnsSelected = columns.length > 0 && selectedColumnIds.size === columns.length;
  const someColumnsSelected = selectedColumnIds.size > 0 && !allColumnsSelected;

  const toggleColumn = (columnId: string) => {
    setSelectedColumnIds((current) => {
      const next = new Set(current);
      if (next.has(columnId)) next.delete(columnId);
      else next.add(columnId);
      return next;
    });
  };

  const toggleAllColumns = () => {
    setSelectedColumnIds(
      allColumnsSelected ? new Set() : new Set(columns.map((column) => column.id))
    );
  };

  const handleExport = () => {
    if (selectedColumns.length === 0 || data.length === 0) return;

    const timestamp = new Date().toISOString().slice(0, 10);
    exportRowsToCsv(`${filename}-${timestamp}`, selectedColumns, data);
    showApiSuccess(undefined, `Exported ${data.length} row${data.length === 1 ? "" : "s"} to CSV.`);
    onClose();
  };

  const scopeLabel =
    selectedCount > 0
      ? `${selectedCount} selected row${selectedCount === 1 ? "" : "s"}`
      : `${data.length} row${data.length === 1 ? "" : "s"}`;

  return (
    <ProjectModalPortal open={open}>
      <div className="project-modal" role="presentation">
      <button
        type="button"
        className="project-modal__backdrop"
        aria-label="Close export dialog"
        onClick={onClose}
      />

      <div
        className="project-modal__dialog project-modal__dialog--scroll"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <div className="project-modal__header">
          <h2 id={titleId} className="project-modal__title">
            {title}
          </h2>
          <p className="project-modal__subtitle">
            Choose columns to include, then export {scopeLabel} as CSV.
          </p>
        </div>

        <div className="project-modal__body ui-scrollbar">
          <div className="export-csv-modal__toolbar">
            <label className="export-csv-modal__select-all">
              <Checkbox
                checked={allColumnsSelected}
                indeterminate={someColumnsSelected}
                onChange={toggleAllColumns}
                aria-label="Select all columns"
              />
              <span>Select all columns</span>
            </label>
            <span className="export-csv-modal__count">
              {selectedColumnIds.size} of {columns.length} selected
            </span>
          </div>

          <div className="export-csv-modal__columns">
            {columns.map((column) => (
              <label key={column.id} className="export-csv-modal__column">
                <Checkbox
                  checked={selectedColumnIds.has(column.id)}
                  onChange={() => toggleColumn(column.id)}
                  aria-label={`Include ${column.label}`}
                />
                <span>{column.label}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="project-modal__footer">
          <UiButton type="button" variant="ghost" onClick={onClose}>
            Cancel
          </UiButton>
          <UiButton
            type="button"
            variant="primary"
            onClick={handleExport}
            disabled={selectedColumns.length === 0 || data.length === 0}
          >
            Export CSV
          </UiButton>
        </div>
      </div>
    </div>
    </ProjectModalPortal>
  );
}
