"use client";

import { Select, UiButton } from "@/shared/components/ui";

type TablePaginationProps = Readonly<{
  page: number;
  pageSize: number;
  total: number;
  pageSizeOptions: readonly number[];
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
  loading?: boolean;
}>;

export function TablePagination({
  page,
  pageSize,
  total,
  pageSizeOptions,
  onPageChange,
  onPageSizeChange,
  loading = false,
}: TablePaginationProps) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, totalPages);
  const rangeStart = total === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const rangeEnd = total === 0 ? 0 : Math.min(safePage * pageSize, total);

  return (
    <div className="table-pagination">
      <div className="table-pagination__page-size" role="group" aria-labelledby="table-page-size-label">
        <span id="table-page-size-label" className="table-pagination__page-size-label">
          Rows per page
        </span>
        <Select
          value={String(pageSize)}
          onChange={(value) => onPageSizeChange(Number(value))}
          options={pageSizeOptions.map((size) => String(size))}
          className="table-pagination__page-size-select"
          floatingMenu
          disabled={loading}
        />
      </div>

      <div className="table-pagination__meta">
        <span className="table-pagination__total">
          {total === 0 ? "0 records" : `${total} ${total === 1 ? "record" : "records"}`}
        </span>
        <span className="table-pagination__range">
          {total === 0 ? "No rows to display" : `Showing ${rangeStart}–${rangeEnd}`}
        </span>
      </div>

      <div className="table-pagination__nav">
        <UiButton
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => onPageChange(safePage - 1)}
          disabled={loading || safePage <= 1}
        >
          Previous
        </UiButton>
        <span className="table-pagination__page-info">
          Page {safePage} of {totalPages}
        </span>
        <UiButton
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => onPageChange(safePage + 1)}
          disabled={loading || safePage >= totalPages}
        >
          Next
        </UiButton>
      </div>
    </div>
  );
}
