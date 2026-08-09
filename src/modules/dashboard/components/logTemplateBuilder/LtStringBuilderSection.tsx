"use client";

import { useMemo, useState } from "react";
import { FormField, MultiSelect, Select, UiButton } from "@/shared/components/ui";
import type { LogTemplateColumn, LogTemplateSelectionGroup } from "../../types/logTemplate";
import {
  createEmptyStringBuilderColumn,
  getStringBuilderColumns,
  getStringBuilderTokens,
  isMultiModuleBoundColumn,
  usesGraphicStringBuilders,
  type StringBuilderColumn,
  type StringBuilderItem,
} from "./columnTypeFields";
import { LtSwitch } from "./LtSwitch";
import {
  asDataSourceObject,
  buildBoundMultiPatch,
  getBoundSelectDataKind,
  getBoundSelectOptions,
  readBoundMultiValues,
  type BoundSelectDataKind,
} from "./selectDataBinding";

type SelectOption = { value: string; label: string };

type LtStringBuilderSectionProps = Readonly<{
  column: LogTemplateColumn;
  selectionGroups: LogTemplateSelectionGroup[];
  selectDataOverrides?: Partial<Record<BoundSelectDataKind, SelectOption[]>>;
  onColumnChange: (patch: Partial<LogTemplateColumn>) => void;
}>;

function sourceKey(group: string, value: string) {
  return `${group}::${value}`;
}

function parseSourceKey(key: string): { group: string; value: string } {
  const sep = key.indexOf("::");
  if (sep < 0) return { group: "", value: key };
  return { group: key.slice(0, sep), value: key.slice(sep + 2) };
}

function readFilterOptions(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((entry) => String(entry));
}

function MultiBoundSelectData({
  column,
  selectionGroups,
  selectDataOverrides,
  onColumnChange,
}: Readonly<{
  column: LogTemplateColumn;
  selectionGroups: LogTemplateSelectionGroup[];
  selectDataOverrides?: Partial<Record<BoundSelectDataKind, SelectOption[]>>;
  onColumnChange: (patch: Partial<LogTemplateColumn>) => void;
}>) {
  const kind = getBoundSelectDataKind(column);
  const options = getBoundSelectOptions(column, selectionGroups, selectDataOverrides);

  return (
    <div className="lt-fmt__logic-row" style={{ alignItems: "flex-end", marginBottom: 12 }}>
      <FormField label="Select Data" htmlFor="lt-sb-multi-data" className="lt-fmt__field--grow">
        <MultiSelect
          id="lt-sb-multi-data"
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
  );
}

function TextBuilderCard({
  title,
  canRemove,
  dataSource,
  tokens,
  draftText,
  dataSourceOptions,
  dataSourceId,
  hideSelectData,
  onDataSourceChange,
  onTokensChange,
  onDraftTextChange,
  onRemove,
}: Readonly<{
  title: string;
  canRemove: boolean;
  dataSource: { group: string; value: string };
  tokens: StringBuilderItem[];
  draftText: string;
  dataSourceOptions: SelectOption[];
  dataSourceId: string;
  hideSelectData?: boolean;
  onDataSourceChange: (next: { group: string; value: string }) => void;
  onTokensChange: (next: StringBuilderItem[]) => void;
  onDraftTextChange: (next: string) => void;
  onRemove?: () => void;
}>) {
  const selectedKey = dataSource.value
    ? sourceKey(dataSource.group, dataSource.value)
    : "";

  const commitDraft = () => {
    const text = draftText.trim();
    if (!text) return;
    onTokensChange([...tokens, { text, type: "freeText" }]);
    onDraftTextChange("");
  };

  return (
    <div className="lt-fmt__sb-card">
      <div className="lt-fmt__sb-card-head">
        <span className="lt-fmt__sb-card-title">{title}</span>
        {canRemove && onRemove ? (
          <UiButton type="button" variant="danger" size="sm" onClick={onRemove}>
            Remove
          </UiButton>
        ) : null}
      </div>

      {!hideSelectData ? (
        <FormField label="Select Data" htmlFor={dataSourceId}>
          <Select
            id={dataSourceId}
            value={selectedKey}
            placeholder="Select Data"
            options={dataSourceOptions}
            search
            onChange={(raw) => onDataSourceChange(parseSourceKey(raw))}
          />
        </FormField>
      ) : null}

      <div style={{ marginTop: hideSelectData ? 0 : 12 }}>
        <FormField label="String">
          <div className="lt-fmt__sb-string-area">
            {tokens.map((token, index) => (
              <span key={`${token.text}-${index}`} className="lt-fmt__sb-chip">
                {token.text}
                <button
                  type="button"
                  aria-label={`Remove ${token.text}`}
                  onClick={() => onTokensChange(tokens.filter((_, i) => i !== index))}
                >
                  ×
                </button>
              </span>
            ))}
            <input
              type="text"
              className="lt-fmt__sb-string-input"
              value={draftText}
              placeholder="Type text or select columns"
              onChange={(event) => onDraftTextChange(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  commitDraft();
                }
              }}
              onBlur={commitDraft}
            />
          </div>
        </FormField>
      </div>
    </div>
  );
}

function GraphicBuilderCard({
  canRemove,
  dataSource,
  filters,
  filterOptions,
  dataSourceOptions,
  dataSourceId,
  filterId,
  onDataSourceChange,
  onFiltersChange,
  onRemove,
}: Readonly<{
  canRemove: boolean;
  dataSource: { group: string; value: string };
  filters: string[];
  filterOptions: string[];
  dataSourceOptions: { value: string; label: string }[];
  dataSourceId: string;
  filterId: string;
  onDataSourceChange: (next: { group: string; value: string }) => void;
  onFiltersChange: (next: string[]) => void;
  onRemove?: () => void;
}>) {
  const selectedKey = dataSource.value
    ? sourceKey(dataSource.group, dataSource.value)
    : "";

  const filterSelectOptions = useMemo(
    () => filterOptions.map((option) => ({ value: option, label: option })),
    [filterOptions]
  );

  return (
    <div className="lt-fmt__sb-instance">
      <FormField label="Select Data" htmlFor={dataSourceId}>
        <Select
          id={dataSourceId}
          value={selectedKey}
          placeholder="Select Data"
          options={dataSourceOptions}
          search
          onChange={(raw) => onDataSourceChange(parseSourceKey(raw))}
        />
      </FormField>
      <div style={{ marginTop: 12 }}>
        <FormField label="Filter Data" htmlFor={filterId}>
          <MultiSelect
            id={filterId}
            value={filters}
            options={filterSelectOptions}
            placeholder="Filter by..."
            search
            searchPlaceholder="Search filters…"
            onChange={onFiltersChange}
          />
        </FormField>
      </div>
      {canRemove && onRemove ? (
        <UiButton
          type="button"
          variant="danger"
          size="sm"
          title="Remove this string builder"
          onClick={onRemove}
        >
          −
        </UiButton>
      ) : null}
    </div>
  );
}

export function LtStringBuilderSection({
  column,
  selectionGroups,
  selectDataOverrides,
  onColumnChange,
}: LtStringBuilderSectionProps) {
  const [primaryDraft, setPrimaryDraft] = useState("");
  const [extraDrafts, setExtraDrafts] = useState<Record<number, string>>({});
  const graphicMode = usesGraphicStringBuilders(column);
  const multiBound = isMultiModuleBoundColumn(column);

  const dataSourceOptions = useMemo(
    () =>
      selectionGroups.flatMap((group) =>
        group.data.map((item) => ({
          value: `${group.code}::${item.code}`,
          label: `${group.name} — ${item.name}`,
        }))
      ),
    [selectionGroups]
  );

  const extras = getStringBuilderColumns(column);

  const graphicBuilders = useMemo(() => {
    if (extras.length > 0) return extras;
    const source = asDataSourceObject(column.column_data_source);
    return [
      createEmptyStringBuilderColumn({
        column_data_source: {
          group: source.group,
          value: source.value,
        },
        selectedFilterOptions: readFilterOptions(column.selectedFilterOptions),
        column_type: column.column_type,
      }),
    ];
  }, [
    extras,
    column.column_data_source,
    column.selectedFilterOptions,
    column.column_type,
  ]);

  const updateExtras = (next: StringBuilderColumn[]) => {
    const primary = next[0];
    onColumnChange({
      stringBuilderColumns: next,
      ...(primary
        ? {
            column_data_source: primary.column_data_source,
            selectedFilterOptions: primary.selectedFilterOptions ?? [],
          }
        : {}),
    });
  };

  const filterOptionsFor = (groupCode: string) => {
    if (!groupCode) return [];
    const group = selectionGroups.find((entry) => entry.code === groupCode);
    return group ? group.data.map((item) => item.name) : [];
  };

  const addBuilder = () => {
    if (graphicMode) {
      updateExtras([...graphicBuilders, createEmptyStringBuilderColumn({
        column_type: column.column_type,
      })]);
      return;
    }
    onColumnChange({
      stringBuilderColumns: [...extras, createEmptyStringBuilderColumn()],
    });
  };

  if (graphicMode) {
    return (
      <div className="lt-fmt__section lt-fmt__graphic-display">
        <div className="lt-fmt__sb-list">
          {graphicBuilders.map((builder, index) => (
            <GraphicBuilderCard
              key={`graphic-sb-${index}`}
              canRemove={graphicBuilders.length > 1}
              dataSource={{
                group: builder.column_data_source?.group ?? "",
                value: builder.column_data_source?.value ?? "",
              }}
              filters={readFilterOptions(builder.selectedFilterOptions)}
              filterOptions={filterOptionsFor(builder.column_data_source?.group ?? "")}
              dataSourceOptions={dataSourceOptions}
              dataSourceId={`lt-graphic-sb-data-${index}`}
              filterId={`lt-graphic-sb-filter-${index}`}
              onDataSourceChange={(next) => {
                updateExtras(
                  graphicBuilders.map((entry, i) =>
                    i === index
                      ? { ...entry, column_data_source: next, selectedFilterOptions: [] }
                      : entry
                  )
                );
              }}
              onFiltersChange={(next) => {
                updateExtras(
                  graphicBuilders.map((entry, i) =>
                    i === index ? { ...entry, selectedFilterOptions: next } : entry
                  )
                );
              }}
              onRemove={() => updateExtras(graphicBuilders.filter((_, i) => i !== index))}
            />
          ))}
        </div>
        <div className="lt-fmt__sb-add">
          <button
            type="button"
            className="lt-fmt__sb-add-btn"
            onClick={addBuilder}
            title="Add string builder"
          >
            +
          </button>
        </div>
      </div>
    );
  }

  const primaryTokens = getStringBuilderTokens(column);

  return (
    <div className="lt-fmt__section">
      {multiBound ? (
        <MultiBoundSelectData
          column={column}
          selectionGroups={selectionGroups}
          selectDataOverrides={selectDataOverrides}
          onColumnChange={onColumnChange}
        />
      ) : null}
      <div className="lt-fmt__sb-list">
        <TextBuilderCard
          title="String builder"
          canRemove={false}
          dataSource={asDataSourceObject(column.column_data_source)}
          tokens={primaryTokens}
          draftText={primaryDraft}
          dataSourceOptions={dataSourceOptions}
          dataSourceId="lt-text-sb-data-primary"
          hideSelectData={multiBound}
          onDataSourceChange={(next) => onColumnChange({ column_data_source: next })}
          onTokensChange={(next) =>
            onColumnChange({
              stringBuilder: next,
              string_builder_text: next.map((token) => token.text).join(""),
            })
          }
          onDraftTextChange={setPrimaryDraft}
        />

        {extras.map((builder, index) => (
          <TextBuilderCard
            key={`sb-extra-${index}`}
            title={`String builder ${index + 2}`}
            canRemove
            dataSource={{
              group: builder.column_data_source?.group ?? "",
              value: builder.column_data_source?.value ?? "",
            }}
            tokens={Array.isArray(builder.stringBuilder) ? builder.stringBuilder : []}
            draftText={extraDrafts[index] ?? ""}
            dataSourceOptions={dataSourceOptions}
            dataSourceId={`lt-text-sb-data-${index}`}
            hideSelectData={multiBound}
            onDataSourceChange={(next) => {
              updateExtras(
                extras.map((entry, i) =>
                  i === index ? { ...entry, column_data_source: next } : entry
                )
              );
            }}
            onTokensChange={(next) => {
              updateExtras(
                extras.map((entry, i) =>
                  i === index ? { ...entry, stringBuilder: next } : entry
                )
              );
            }}
            onDraftTextChange={(next) =>
              setExtraDrafts((current) => ({ ...current, [index]: next }))
            }
            onRemove={() => {
              updateExtras(extras.filter((_, i) => i !== index));
              setExtraDrafts((current) => {
                const next: Record<number, string> = {};
                Object.entries(current).forEach(([key, value]) => {
                  const idx = Number(key);
                  if (idx < index) next[idx] = value;
                  if (idx > index) next[idx - 1] = value;
                });
                return next;
              });
            }}
          />
        ))}
      </div>

      <div className="lt-fmt__sb-add">
        <button
          type="button"
          className="lt-fmt__sb-add-btn"
          onClick={addBuilder}
          title="Add string builder"
        >
          +
        </button>
      </div>
    </div>
  );
}
