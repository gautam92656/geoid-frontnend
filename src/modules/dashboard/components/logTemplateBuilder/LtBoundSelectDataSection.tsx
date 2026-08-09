"use client";

import { FormField, MultiSelect, Select } from "@/shared/components/ui";
import type { LogTemplateColumn, LogTemplateSelectionGroup } from "../../types/logTemplate";
import { LtSwitch } from "./LtSwitch";
import {
  asDataSourceObject,
  buildBoundMultiPatch,
  getBoundSelectDataGroupCode,
  getBoundSelectDataKind,
  getBoundSelectOptions,
  getDataSourceValue,
  readBoundMultiValues,
  type BoundSelectDataKind,
} from "./selectDataBinding";

type LtBoundSelectDataSectionProps = Readonly<{
  column: LogTemplateColumn;
  selectionGroups: LogTemplateSelectionGroup[];
  selectDataOverrides?: Partial<
    Record<BoundSelectDataKind, Array<{ value: string; label: string }>>
  >;
  /** When true, string builders already own Select Data — skip generic panel. */
  suppressGeneric?: boolean;
  onColumnChange: (patch: Partial<LogTemplateColumn>) => void;
}>;

export function LtBoundSelectDataSection({
  column,
  selectionGroups,
  selectDataOverrides,
  suppressGeneric = false,
  onColumnChange,
}: LtBoundSelectDataSectionProps) {
  const kind = getBoundSelectDataKind(column);
  if (!kind) return null;
  if (kind === "generic" && suppressGeneric) return null;

  const options = getBoundSelectOptions(column, selectionGroups, selectDataOverrides);
  const isMulti = kind === "remarks" || kind === "samples" || kind === "testing";
  const lockedGroup = getBoundSelectDataGroupCode(column);

  return (
    <div className="lt-fmt__section">
      <h3 className="lt-fmt__section-title">Select Data</h3>
      <p className="lt-fmt__section-note">
        {kind === "remarks"
          ? "Remark types from the Remarks module for this column type."
          : kind === "samples"
            ? "Sample types from the Samples module for this column type."
            : kind === "testing"
              ? "In-situ test types from the Testing module for this column type."
              : lockedGroup
                ? "Fields for the selected column type data group."
                : "Binds this column to live log data when the report is generated."}
      </p>

      {isMulti ? (
        <div className="lt-fmt__logic-row" style={{ alignItems: "flex-end" }}>
          <FormField label="Select Data" htmlFor="lt-bound-multi-data" className="lt-fmt__field--grow">
            <MultiSelect
              id="lt-bound-multi-data"
              value={readBoundMultiValues(column)}
              options={options}
              placeholder="Please choose data..."
              search
              onChange={(values) => onColumnChange(buildBoundMultiPatch(column, values))}
            />
          </FormField>
          <LtSwitch
            showLabel
            label="Hide name"
            checked={Boolean(column.hide_multiple_data_name)}
            onChange={(checked) => onColumnChange({ hide_multiple_data_name: checked })}
          />
          {kind === "samples" ? (
            <LtSwitch
              showLabel
              label="Only Show Sample Id"
              checked={Boolean(column.only_show_sample_id)}
              onChange={(checked) => onColumnChange({ only_show_sample_id: checked })}
            />
          ) : null}
        </div>
      ) : (
        <FormField label="Select Data" htmlFor="lt-bound-single-data">
          <Select
            id="lt-bound-single-data"
            value={
              kind === "generic"
                ? (() => {
                    const source = asDataSourceObject(column.column_data_source);
                    return source.group && source.value
                      ? `${source.group}::${source.value}`
                      : "";
                  })()
                : getDataSourceValue(column)
            }
            options={[{ value: "", label: "Please choose data..." }, ...options]}
            placeholder="Please choose data..."
            search={options.length > 8}
            onChange={(value) => {
              if (kind === "generic") {
                const sep = value.indexOf("::");
                onColumnChange({
                  column_data_source:
                    sep < 0
                      ? { group: "", value }
                      : { group: value.slice(0, sep), value: value.slice(sep + 2) },
                });
                return;
              }
              onColumnChange({
                column_data_source: {
                  group: lockedGroup,
                  value,
                },
              });
            }}
          />
        </FormField>
      )}
    </div>
  );
}
