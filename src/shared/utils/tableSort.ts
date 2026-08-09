export type SortOrder = "asc" | "desc";

export type SortState = {
  field: string | null;
  order: SortOrder;
};

export function toggleSortState(current: SortState, field: string): SortState {
  if (current.field !== field) {
    return { field, order: "asc" };
  }

  if (current.order === "asc") {
    return { field, order: "desc" };
  }

  return { field: null, order: "asc" };
}

export function sortTableData<T>(
  data: T[],
  sort: SortState,
  getValue: (row: T, field: string) => string | number
): T[] {
  if (!sort.field) {
    return data;
  }

  const field = sort.field;
  const direction = sort.order === "asc" ? 1 : -1;

  return [...data].sort((left, right) => {
    const leftValue = getValue(left, field);
    const rightValue = getValue(right, field);

    if (typeof leftValue === "number" && typeof rightValue === "number") {
      return (leftValue - rightValue) * direction;
    }

    return String(leftValue).localeCompare(String(rightValue), undefined, {
      numeric: true,
      sensitivity: "base",
    }) * direction;
  });
}
