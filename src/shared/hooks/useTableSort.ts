import { useCallback, useMemo, useState } from "react";
import { sortTableData, toggleSortState, type SortState } from "@/shared/utils/tableSort";

export function useTableSort<T>(
  data: T[],
  getSortValue: (row: T, field: string) => string | number,
  initialSort: SortState = { field: "id", order: "desc" }
) {
  const [sort, setSort] = useState<SortState>(initialSort);

  const toggleSort = useCallback((field: string) => {
    setSort((current) => toggleSortState(current, field));
  }, []);

  const sortedData = useMemo(
    () => sortTableData(data, sort, getSortValue),
    [data, getSortValue, sort]
  );

  return { sort, toggleSort, sortedData };
}
