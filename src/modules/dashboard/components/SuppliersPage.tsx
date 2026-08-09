"use client";

import type { ReactNode } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Container } from "react-bootstrap";
import {
  Badge,
  Checkbox,
  ConfirmDialog,
  DataTable,
  EditIcon,
  PageHeader,
  SortableColumnHeader,
  TableRowActionsMenu,
  TableToolbar,
  TablePagination,
  TableSearch,
  DownloadIcon,
  PlusIcon,
  RefreshIcon,
  TrashIcon,
  UiButton,
  type ColumnDef,
  type ToolbarAction,
} from "@/shared/components/ui";
import { useTableSort } from "@/shared/hooks/useTableSort";
import { useDebouncedValue } from "@/shared/hooks/useDebouncedValue";
import { formatDisplayDate } from "@/shared/utils/formatDate";
import { API_ERROR_MESSAGES, API_MESSAGES } from "@/shared/constants/apiMessages";
import { showApiError, showApiSuccess } from "@/shared/utils/apiToast";
import { DEFAULT_TABLE_PAGE_SIZE, TABLE_PAGE_SIZE_OPTIONS } from "@/shared/constants/pagination";
import {
  createSupplier,
  deleteSupplier,
  formToSupplierPayload,
  listSuppliers,
  updateSupplier,
} from "../services/supplierApi";
import type { Supplier, SupplierFormState } from "../types/supplier";
import { SUPPLIER_EXPORT_COLUMNS } from "../data/exportColumns";
import { AddSupplierModal } from "./AddSupplierModal";
import { ExportCsvModal } from "./ExportCsvModal";

const SUPPLIER_GRID =
  "40px 160px 120px 150px 140px 160px 110px 110px 200px 180px 130px 120px 90px 140px 140px 72px";

type DeleteConfirmState =
  | { open: false }
  | { open: true; mode: "single"; supplier: Supplier }
  | { open: true; mode: "bulk"; count: number };

function formatLabTestTypes(types: string[]): string {
  return types.length > 0 ? types.join(", ") : "—";
}

function getSupplierSortValue(supplier: Supplier, field: string): string | number {
  switch (field) {
    case "id":
      return supplier.id;
    case "businessName":
      return supplier.businessName;
    case "supplierType":
      return supplier.supplierType;
    case "supplierRelationship":
      return supplier.supplierRelationship ?? "";
    case "supplierExternalId":
      return supplier.supplierExternalId ?? "";
    case "labTestTypes":
      return formatLabTestTypes(supplier.labTestTypes);
    case "firstName":
      return supplier.firstName ?? "";
    case "lastName":
      return supplier.lastName ?? "";
    case "address":
      return supplier.address ?? "";
    case "email":
      return supplier.email ?? "";
    case "phone":
      return supplier.phone ?? "";
    case "abn":
      return supplier.abn ?? "";
    case "status":
      return supplier.status;
    case "createdAt":
      return supplier.createdAt;
    case "updatedAt":
      return supplier.updatedAt;
    default:
      return "";
  }
}

function ColumnHeader({
  children,
  field,
  sortField,
  sortOrder,
  onSort,
}: Readonly<{
  children: ReactNode;
  field: string;
  sortField: string | null;
  sortOrder: "asc" | "desc";
  onSort: (field: string) => void;
}>) {
  return (
    <SortableColumnHeader
      field={field}
      activeField={sortField}
      activeOrder={sortOrder}
      onSort={onSort}
    >
      {children}
    </SortableColumnHeader>
  );
}

export function SuppliersPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(DEFAULT_TABLE_PAGE_SIZE);
  const [total, setTotal] = useState(0);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [modalOpen, setModalOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [exportOpen, setExportOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<DeleteConfirmState>({ open: false });
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search.trim());
  const hasMounted = useRef(false);

  const { sort, toggleSort, sortedData } = useTableSort(suppliers, getSupplierSortValue);

  const exportRows = useMemo(() => {
    if (selectedIds.size === 0) return sortedData;
    return sortedData.filter((supplier) => selectedIds.has(supplier.id));
  }, [selectedIds, sortedData]);

  const loadSuppliers = useCallback(async (nextPage: number, nextPageSize: number, nextSearch = debouncedSearch) => {
    setLoading(true);
    try {
      const result = await listSuppliers(nextPage, nextPageSize, {
        search: nextSearch || undefined,
      });
      setSuppliers(result.data);
      setTotal(result.total);
      setPage(nextPage);
      setPageSize(nextPageSize);
    } catch (err) {
      showApiError(err, API_ERROR_MESSAGES.LOAD_SUPPLIERS);
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch]);

  useEffect(() => {
    if (!hasMounted.current) {
      hasMounted.current = true;
      void loadSuppliers(1, DEFAULT_TABLE_PAGE_SIZE, "");
      return;
    }

    setSelectedIds(new Set());
    void loadSuppliers(1, pageSize);
  }, [debouncedSearch, loadSuppliers]);

  const allSelected = suppliers.length > 0 && selectedIds.size === suppliers.length;
  const someSelected = selectedIds.size > 0 && !allSelected;

  const toggleAll = useCallback(() => {
    setSelectedIds((current) =>
      current.size === suppliers.length ? new Set() : new Set(suppliers.map((s) => s.id))
    );
  }, [suppliers]);

  const toggleOne = useCallback((id: number) => {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const handleAddSupplier = useCallback(async (form: SupplierFormState) => {
    setSubmitting(true);
    try {
      const { message } = await createSupplier(formToSupplierPayload(form));
      setModalOpen(false);
      setEditingSupplier(null);
      setSelectedIds(new Set());
      await loadSuppliers(1, pageSize);
      showApiSuccess(message, API_MESSAGES.SUPPLIER_ADDED);
    } catch (err) {
      showApiError(err, API_ERROR_MESSAGES.ADD_SUPPLIER);
      throw err;
    } finally {
      setSubmitting(false);
    }
  }, [loadSuppliers, pageSize]);

  const handleEditSupplier = useCallback(async (form: SupplierFormState) => {
    if (!editingSupplier) return;

    setSubmitting(true);
    try {
      const { message } = await updateSupplier(
        editingSupplier.id,
        formToSupplierPayload(form)
      );
      setModalOpen(false);
      setEditingSupplier(null);
      await loadSuppliers(page, pageSize);
      showApiSuccess(message, API_MESSAGES.SUPPLIER_UPDATED);
    } catch (err) {
      console.error("Failed to update supplier", err);
      showApiError(err, API_ERROR_MESSAGES.UPDATE_SUPPLIER);
      throw err;
    } finally {
      setSubmitting(false);
    }
  }, [editingSupplier, loadSuppliers, page, pageSize]);

  const openAddModal = useCallback(() => {
    setEditingSupplier(null);
    setModalOpen(true);
  }, []);

  const openEditModal = useCallback((supplier: Supplier) => {
    setEditingSupplier(supplier);
    setModalOpen(true);
  }, []);

  const closeModal = useCallback(() => {
    setModalOpen(false);
    setEditingSupplier(null);
  }, []);

  const performDelete = useCallback(async (ids: number[]) => {
    if (ids.length === 0) return;

    setDeleting(true);
    try {
      const results = await Promise.all(ids.map((id) => deleteSupplier(id)));
      setSelectedIds(new Set());

      const nextTotal = Math.max(0, total - ids.length);
      const nextTotalPages = Math.max(1, Math.ceil(nextTotal / pageSize));
      const nextPage = Math.min(page, nextTotalPages);
      await loadSuppliers(nextPage, pageSize);

      const message = results.find((result) => result.message)?.message;
      showApiSuccess(
        message,
        ids.length === 1 ? API_MESSAGES.SUPPLIER_DELETED : API_MESSAGES.SUPPLIERS_DELETED
      );
      setDeleteConfirm({ open: false });
    } catch (err) {
      showApiError(err, API_ERROR_MESSAGES.DELETE_SUPPLIERS);
    } finally {
      setDeleting(false);
    }
  }, [loadSuppliers, page, pageSize, total]);

  const requestDeleteSupplier = useCallback((supplier: Supplier) => {
    setDeleteConfirm({ open: true, mode: "single", supplier });
  }, []);

  const requestDeleteSelected = useCallback(() => {
    if (selectedIds.size === 0) return;
    setDeleteConfirm({ open: true, mode: "bulk", count: selectedIds.size });
  }, [selectedIds.size]);

  const handleConfirmDelete = useCallback(async () => {
    if (!deleteConfirm.open) return;

    if (deleteConfirm.mode === "single") {
      await performDelete([deleteConfirm.supplier.id]);
      return;
    }

    await performDelete([...selectedIds]);
  }, [deleteConfirm, performDelete, selectedIds]);

  const handleRefresh = useCallback(() => {
    setSelectedIds(new Set());
    void loadSuppliers(page, pageSize);
  }, [loadSuppliers, page, pageSize]);

  const handleSearchChange = useCallback((value: string) => {
    setSearch(value);
  }, []);

  const handlePageChange = useCallback((nextPage: number) => {
    setSelectedIds(new Set());
    void loadSuppliers(nextPage, pageSize);
  }, [loadSuppliers, pageSize]);

  const handlePageSizeChange = useCallback((nextPageSize: number) => {
    setSelectedIds(new Set());
    void loadSuppliers(1, nextPageSize);
  }, [loadSuppliers]);

  const toolbarActions: ToolbarAction[] = useMemo(
    () => [
      {
        id: "delete",
        label: "Delete",
        icon: <TrashIcon />,
        onClick: requestDeleteSelected,
        disabled: selectedIds.size === 0,
      },
      { id: "export", label: "Export", icon: <DownloadIcon />, onClick: () => setExportOpen(true) },
      { id: "refresh", label: "Refresh", icon: <RefreshIcon />, onClick: handleRefresh },
    ],
    [handleRefresh, requestDeleteSelected, selectedIds.size]
  );

  const columns: ColumnDef<Supplier>[] = useMemo(
    () => [
      {
        id: "select",
        header: (
          <Checkbox
            checked={allSelected}
            indeterminate={someSelected}
            onChange={toggleAll}
            aria-label="Select all suppliers"
          />
        ),
        cell: (supplier) => (
          <Checkbox
            checked={selectedIds.has(supplier.id)}
            onChange={() => toggleOne(supplier.id)}
            aria-label={`Select ${supplier.businessName}`}
          />
        ),
        className: "data-table__col--checkbox",
      },
      {
        id: "businessName",
        header: (
          <ColumnHeader field="businessName" sortField={sort.field} sortOrder={sort.order} onSort={toggleSort}>
            Business Name
          </ColumnHeader>
        ),
        cell: (supplier) => <span className="data-table__text">{supplier.businessName}</span>,
      },
      {
        id: "supplierType",
        header: (
          <ColumnHeader field="supplierType" sortField={sort.field} sortOrder={sort.order} onSort={toggleSort}>
            Supplier Type
          </ColumnHeader>
        ),
        cell: (supplier) => <span className="data-table__text">{supplier.supplierType || "—"}</span>,
      },
      {
        id: "supplierRelationship",
        header: (
          <ColumnHeader
            field="supplierRelationship"
            sortField={sort.field}
            sortOrder={sort.order}
            onSort={toggleSort}
          >
            Supplier Relationship
          </ColumnHeader>
        ),
        cell: (supplier) => (
          <span className="data-table__text">{supplier.supplierRelationship || "—"}</span>
        ),
      },
      {
        id: "supplierExternalId",
        header: (
          <ColumnHeader
            field="supplierExternalId"
            sortField={sort.field}
            sortOrder={sort.order}
            onSort={toggleSort}
          >
            Supplier External ID
          </ColumnHeader>
        ),
        cell: (supplier) => (
          <span className="data-table__text">{supplier.supplierExternalId || "—"}</span>
        ),
      },
      {
        id: "labTestTypes",
        header: (
          <ColumnHeader field="labTestTypes" sortField={sort.field} sortOrder={sort.order} onSort={toggleSort}>
            Lab Test Types
          </ColumnHeader>
        ),
        cell: (supplier) => (
          <span className="data-table__text">{formatLabTestTypes(supplier.labTestTypes)}</span>
        ),
      },
      {
        id: "firstName",
        header: (
          <ColumnHeader field="firstName" sortField={sort.field} sortOrder={sort.order} onSort={toggleSort}>
            First Name
          </ColumnHeader>
        ),
        cell: (supplier) => <span className="data-table__text">{supplier.firstName || "—"}</span>,
      },
      {
        id: "lastName",
        header: (
          <ColumnHeader field="lastName" sortField={sort.field} sortOrder={sort.order} onSort={toggleSort}>
            Last Name
          </ColumnHeader>
        ),
        cell: (supplier) => <span className="data-table__text">{supplier.lastName || "—"}</span>,
      },
      {
        id: "address",
        header: (
          <ColumnHeader field="address" sortField={sort.field} sortOrder={sort.order} onSort={toggleSort}>
            Address
          </ColumnHeader>
        ),
        cell: (supplier) => <span className="data-table__text">{supplier.address || "—"}</span>,
      },
      {
        id: "email",
        header: (
          <ColumnHeader field="email" sortField={sort.field} sortOrder={sort.order} onSort={toggleSort}>
            Email
          </ColumnHeader>
        ),
        cell: (supplier) => <span className="data-table__text">{supplier.email || "—"}</span>,
      },
      {
        id: "phone",
        header: (
          <ColumnHeader field="phone" sortField={sort.field} sortOrder={sort.order} onSort={toggleSort}>
            Phone
          </ColumnHeader>
        ),
        cell: (supplier) => <span className="data-table__text">{supplier.phone || "—"}</span>,
      },
      {
        id: "abn",
        header: (
          <ColumnHeader field="abn" sortField={sort.field} sortOrder={sort.order} onSort={toggleSort}>
            ABN
          </ColumnHeader>
        ),
        cell: (supplier) => <span className="data-table__text">{supplier.abn || "—"}</span>,
      },
      {
        id: "status",
        header: (
          <ColumnHeader field="status" sortField={sort.field} sortOrder={sort.order} onSort={toggleSort}>
            Status
          </ColumnHeader>
        ),
        cell: (supplier) => (
          <Badge variant={supplier.status === "active" ? "success" : "neutral"}>
            {supplier.status === "active" ? "Active" : "Inactive"}
          </Badge>
        ),
      },
      {
        id: "createdAt",
        header: (
          <ColumnHeader field="createdAt" sortField={sort.field} sortOrder={sort.order} onSort={toggleSort}>
            Created At
          </ColumnHeader>
        ),
        cell: (supplier) => (
          <span className="data-table__text data-table__text--muted">
            {formatDisplayDate(supplier.createdAt)}
          </span>
        ),
      },
      {
        id: "updatedAt",
        header: (
          <ColumnHeader field="updatedAt" sortField={sort.field} sortOrder={sort.order} onSort={toggleSort}>
            Updated At
          </ColumnHeader>
        ),
        cell: (supplier) => (
          <span className="data-table__text data-table__text--muted">
            {formatDisplayDate(supplier.updatedAt)}
          </span>
        ),
      },
      {
        id: "actions",
        header: "Actions",
        cell: (supplier) => (
          <TableRowActionsMenu
            label={`Actions for ${supplier.businessName}`}
            actions={[
              {
                id: "edit",
                label: "Edit",
                icon: <EditIcon />,
                onClick: () => openEditModal(supplier),
              },
              {
                id: "delete",
                label: "Delete",
                icon: <TrashIcon />,
                tone: "danger",
                onClick: () => requestDeleteSupplier(supplier),
              },
            ]}
          />
        ),
        className: "data-table__col--actions",
      },
    ],
    [
      allSelected,
      someSelected,
      selectedIds,
      sort.field,
      sort.order,
      toggleAll,
      toggleOne,
      toggleSort,
      openEditModal,
      requestDeleteSupplier,
    ]
  );

  const deleteDialogTitle =
    deleteConfirm.open && deleteConfirm.mode === "bulk"
      ? `Delete ${deleteConfirm.count} suppliers?`
      : "Delete supplier?";

  const deleteDialogMessage =
    deleteConfirm.open && deleteConfirm.mode === "bulk"
      ? `This will permanently remove ${deleteConfirm.count} selected suppliers. This action cannot be undone.`
      : deleteConfirm.open
        ? `This will permanently remove "${deleteConfirm.supplier.businessName}". This action cannot be undone.`
        : "";

  return (
    <section className="asset-page asset-page--suppliers">
      <Container fluid className="asset-page__container">
        <PageHeader
          title="Suppliers"
          subtitle="Manage supplier records"
          action={
            <UiButton variant="primary" size="sm" onClick={openAddModal}>
              <PlusIcon />
              Add Supplier
            </UiButton>
          }
        />

        <div className="asset-card asset-card--table">
          <div className="asset-card__toolbar">
            <div className="asset-card__filters">
              <TableSearch
                value={search}
                onChange={handleSearchChange}
                placeholder="Search suppliers…"
                ariaLabel="Search suppliers"
                disabled={loading}
              />
            </div>
            <TableToolbar actions={toolbarActions} />
            {selectedIds.size > 0 ? (
              <span className="asset-card__selection">{selectedIds.size} selected</span>
            ) : null}
          </div>

          <div className="asset-card__table-wrap ui-scrollbar">
            <DataTable
              columns={columns}
              data={sortedData}
              getRowId={(supplier) => String(supplier.id)}
              gridTemplateColumns={SUPPLIER_GRID}
              emptyMessage={
                loading
                  ? "Loading suppliers…"
                  : debouncedSearch
                    ? "No suppliers match your search."
                    : "No suppliers yet. Add your first supplier to get started."
              }
            />
          </div>

          <TablePagination
            page={page}
            pageSize={pageSize}
            total={total}
            pageSizeOptions={TABLE_PAGE_SIZE_OPTIONS}
            onPageChange={handlePageChange}
            onPageSizeChange={handlePageSizeChange}
            loading={loading}
          />
        </div>
      </Container>

      <AddSupplierModal
        open={modalOpen}
        onClose={closeModal}
        onSubmit={editingSupplier ? handleEditSupplier : handleAddSupplier}
        suppliers={suppliers}
        editingSupplier={editingSupplier}
        submitting={submitting}
      />

      <ConfirmDialog
        open={deleteConfirm.open}
        title={deleteDialogTitle}
        message={deleteDialogMessage}
        confirmLabel="Delete"
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteConfirm({ open: false })}
        loading={deleting}
        variant="danger"
      />

      <ExportCsvModal
        open={exportOpen}
        onClose={() => setExportOpen(false)}
        title="Export Suppliers"
        filename="suppliers"
        columns={SUPPLIER_EXPORT_COLUMNS}
        data={exportRows}
        selectedCount={selectedIds.size}
      />
    </section>
  );
}
