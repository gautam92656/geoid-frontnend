export type ExportColumnDef<T> = Readonly<{
  id: string;
  label: string;
  getValue: (row: T) => string;
}>;

function escapeCsvCell(value: string): string {
  const normalized = value.replace(/\r?\n/g, " ").trim();
  if (/[",\n\r]/.test(normalized)) {
    return `"${normalized.replace(/"/g, '""')}"`;
  }
  return normalized;
}

export function buildCsvContent(headers: string[], rows: string[][]): string {
  const lines = [
    headers.map(escapeCsvCell).join(","),
    ...rows.map((row) => row.map(escapeCsvCell).join(",")),
  ];
  return lines.join("\r\n");
}

export function downloadCsv(filename: string, headers: string[], rows: string[][]): void {
  const content = buildCsvContent(headers, rows);
  const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename.endsWith(".csv") ? filename : `${filename}.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export function exportRowsToCsv<T>(
  filename: string,
  columns: ExportColumnDef<T>[],
  rows: T[]
): void {
  const headers = columns.map((column) => column.label);
  const values = rows.map((row) => columns.map((column) => column.getValue(row)));
  downloadCsv(filename, headers, values);
}
