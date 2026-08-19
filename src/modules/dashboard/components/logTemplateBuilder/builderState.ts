import type { LogTemplateColumn, LogTemplateConfig } from "../../types/logTemplate";
import { createBlankColumn, isColumnVisible } from "./contentSchema";

function clone(config: LogTemplateConfig): LogTemplateConfig {
  return structuredClone(config);
}

export function updateTemplateMeta(
  config: LogTemplateConfig,
  patch: Partial<
    Pick<
      LogTemplateConfig,
      | "depth_per_page"
      | "template_page_size"
      | "templatePageSizeId"
      | "template_orientation"
      | "hide_all_column_headings"
      | "hide_watermark"
      | "finish_log_target_column_id"
      | "extend_column_boundaries_type"
    >
  >
): LogTemplateConfig {
  const next = clone(config);
  Object.assign(next, patch);
  if (patch.template_page_size) {
    next.templatePageSizeId = patch.template_page_size;
  }
  return next;
}

export function selectColumnIndex(columns: LogTemplateColumn[], code: string): number {
  return columns.findIndex((column) => column.code === code);
}

export function updateColumn(
  config: LogTemplateConfig,
  code: string,
  patch: Partial<LogTemplateColumn>
): LogTemplateConfig {
  const next = clone(config);
  const index = selectColumnIndex(next.columnData, code);
  if (index < 0) return config;
  next.columnData[index] = {
    ...next.columnData[index],
    ...patch,
    code: next.columnData[index].code,
  };
  if (typeof patch.hidden === "boolean") {
    next.columnData[index].visibility = !patch.hidden;
  }
  if (typeof patch.visibility === "boolean") {
    next.columnData[index].hidden = !patch.visibility;
  }
  return next;
}

export function setColumnVisibility(
  config: LogTemplateConfig,
  code: string,
  visible: boolean
): LogTemplateConfig {
  return updateColumn(config, code, { visibility: visible, hidden: !visible });
}

export function reorderColumns(
  config: LogTemplateConfig,
  sourceCode: string,
  targetCode: string
): LogTemplateConfig {
  if (sourceCode === targetCode) return config;
  const next = clone(config);
  const sourceIndex = selectColumnIndex(next.columnData, sourceCode);
  const targetIndex = selectColumnIndex(next.columnData, targetCode);
  if (sourceIndex < 0 || targetIndex < 0) return config;
  const [moved] = next.columnData.splice(sourceIndex, 1);
  // Removing the source shifts every later index down by one, so a target
  // that came after it must be adjusted to land the moved column in the
  // target's original slot regardless of drag direction.
  const insertIndex = targetIndex > sourceIndex ? targetIndex - 1 : targetIndex;
  next.columnData.splice(insertIndex, 0, moved);
  return next;
}

export function addColumn(
  config: LogTemplateConfig,
  column?: Partial<LogTemplateColumn> & Pick<LogTemplateColumn, "text">
): LogTemplateConfig {
  const next = clone(config);
  const code = `column_${Date.now()}`;
  next.columnData.push(
    createBlankColumn({
      text: column?.text ?? "New Column",
      code,
      ...column,
    })
  );
  return next;
}

export function addColumnFromCatalog(
  config: LogTemplateConfig,
  catalogColumn: LogTemplateColumn
): LogTemplateConfig {
  const next = clone(config);
  const existing = next.columnData.find((column) => column.code === catalogColumn.code);
  if (existing) {
    return setColumnVisibility(next, existing.code, true);
  }
  next.columnData.push({
    ...structuredClone(catalogColumn),
    hidden: false,
    visibility: true,
  });
  return next;
}

export function deleteColumn(config: LogTemplateConfig, code: string): LogTemplateConfig {
  const next = clone(config);
  const index = selectColumnIndex(next.columnData, code);
  if (index < 0) return config;
  const column = next.columnData[index];
  if (column.default_column) {
    next.columnData[index] = {
      ...column,
      hidden: true,
      visibility: false,
    };
    return next;
  }
  next.columnData.splice(index, 1);
  return next;
}

export function moveColumn(config: LogTemplateConfig, code: string, direction: -1 | 1): LogTemplateConfig {
  const next = clone(config);
  const index = selectColumnIndex(next.columnData, code);
  if (index < 0) return config;
  const target = index + direction;
  if (target < 0 || target >= next.columnData.length) return config;
  const [moved] = next.columnData.splice(index, 1);
  next.columnData.splice(target, 0, moved);
  return next;
}

export function getVisibleColumns(config: LogTemplateConfig): LogTemplateColumn[] {
  return config.columnData.filter(isColumnVisible);
}

export function getUsedWidthPercent(config: LogTemplateConfig): number {
  return getVisibleColumns(config).reduce((sum, column) => {
    const width = Number(column.width);
    return sum + (Number.isFinite(width) ? width : 0);
  }, 0);
}
