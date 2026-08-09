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
  createClient,
  deleteClient,
  formToClientPayload,
  listClients,
  updateClient,
} from "../services/clientApi";
import type { Client, ClientFormState } from "../types/client";
import { CLIENT_EXPORT_COLUMNS } from "../data/exportColumns";
import { AddClientModal } from "./AddClientModal";
import { ExportCsvModal } from "./ExportCsvModal";

const CLIENT_GRID =
  "40px minmax(140px, 1.2fr) minmax(130px, 1fr) minmax(160px, 1.2fr) minmax(120px, 0.9fr) minmax(90px, 0.7fr) minmax(80px, 0.6fr) minmax(130px, 0.8fr) minmax(130px, 0.8fr) 48px";

type DeleteConfirmState =
  | { open: false }
  | { open: true; mode: "single"; client: Client }
  | { open: true; mode: "bulk"; count: number };

function getClientSortValue(client: Client, field: string): string | number {
  switch (field) {
    case "id":
      return client.id;
    case "companyName":
      return client.companyName;
    case "companyContact":
      return client.companyContact ?? "";
    case "email":
      return client.email ?? "";
    case "phone":
      return client.phone ?? "";
    case "externalId":
      return client.externalId ?? "";
    case "status":
      return client.status;
    case "createdAt":
      return client.createdAt;
    case "updatedAt":
      return client.updatedAt;
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
  sortable = true,
}: Readonly<{
  children: ReactNode;
  field: string;
  sortField: string | null;
  sortOrder: "asc" | "desc";
  onSort: (field: string) => void;
  sortable?: boolean;
}>) {
  return (
    <SortableColumnHeader
      field={field}
      activeField={sortField}
      activeOrder={sortOrder}
      onSort={onSort}
      sortable={sortable}
    >
      {children}
    </SortableColumnHeader>
  );
}

export function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(DEFAULT_TABLE_PAGE_SIZE);
  const [total, setTotal] = useState(0);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [modalOpen, setModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [exportOpen, setExportOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<DeleteConfirmState>({ open: false });
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search.trim());
  const hasMounted = useRef(false);
  const { sort, toggleSort, sortedData } = useTableSort(clients, getClientSortValue);

  const exportRows = useMemo(() => {
    if (selectedIds.size === 0) return sortedData;
    return sortedData.filter((client) => selectedIds.has(client.id));
  }, [selectedIds, sortedData]);

  const loadClients = useCallback(async (nextPage: number, nextPageSize: number, nextSearch = debouncedSearch) => {
    setLoading(true);
    try {
      const result = await listClients(nextPage, nextPageSize, nextSearch || undefined);
      setClients(result.data);
      setTotal(result.total);
      setPage(nextPage);
      setPageSize(nextPageSize);
    } catch (err) {
      showApiError(err, API_ERROR_MESSAGES.LOAD_CLIENTS);
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch]);

  useEffect(() => {
    if (!hasMounted.current) {
      hasMounted.current = true;
      void loadClients(1, DEFAULT_TABLE_PAGE_SIZE, "");
      return;
    }

    setSelectedIds(new Set());
    void loadClients(1, pageSize);
  }, [debouncedSearch, loadClients]);

  const allSelected = clients.length > 0 && selectedIds.size === clients.length;
  const someSelected = selectedIds.size > 0 && !allSelected;

  const toggleAll = useCallback(() => {
    setSelectedIds((current) =>
      current.size === clients.length ? new Set() : new Set(clients.map((c) => c.id))
    );
  }, [clients]);

  const toggleOne = useCallback((id: number) => {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const openAddModal = useCallback(() => {
    setEditingClient(null);
    setModalOpen(true);
  }, []);

  const openEditModal = useCallback((client: Client) => {
    setEditingClient(client);
    setModalOpen(true);
  }, []);

  const closeModal = useCallback(() => {
    setModalOpen(false);
    setEditingClient(null);
  }, []);

  const handleAddClient = useCallback(async (form: ClientFormState) => {
    setSubmitting(true);
    try {
      const { message } = await createClient(formToClientPayload(form));
      setModalOpen(false);
      setEditingClient(null);
      setSelectedIds(new Set());
      await loadClients(1, pageSize);
      showApiSuccess(message, API_MESSAGES.CLIENT_ADDED);
    } catch (err) {
      showApiError(err, API_ERROR_MESSAGES.ADD_CLIENT);
      throw err;
    } finally {
      setSubmitting(false);
    }
  }, [loadClients, pageSize]);

  const handleEditClient = useCallback(async (form: ClientFormState) => {
    if (!editingClient) return;

    setSubmitting(true);
    try {
      const { message } = await updateClient(
        editingClient.id,
        formToClientPayload(form)
      );
      setModalOpen(false);
      setEditingClient(null);
      await loadClients(page, pageSize);
      showApiSuccess(message, API_MESSAGES.CLIENT_UPDATED);
    } catch (err) {
      showApiError(err, API_ERROR_MESSAGES.UPDATE_CLIENT);
      throw err;
    } finally {
      setSubmitting(false);
    }
  }, [editingClient, loadClients, page, pageSize]);

  const performDelete = useCallback(async (ids: number[]) => {
    if (ids.length === 0) return;

    setDeleting(true);
    try {
      const results = await Promise.all(ids.map((id) => deleteClient(id)));
      setSelectedIds(new Set());

      const nextTotal = Math.max(0, total - ids.length);
      const nextTotalPages = Math.max(1, Math.ceil(nextTotal / pageSize));
      const nextPage = Math.min(page, nextTotalPages);
      await loadClients(nextPage, pageSize);

      const message = results.find((result) => result.message)?.message;
      showApiSuccess(
        message,
        ids.length === 1 ? API_MESSAGES.CLIENT_DELETED : API_MESSAGES.CLIENTS_DELETED
      );
      setDeleteConfirm({ open: false });
    } catch (err) {
      showApiError(err, API_ERROR_MESSAGES.DELETE_CLIENTS);
    } finally {
      setDeleting(false);
    }
  }, [loadClients, page, pageSize, total]);

  const requestDeleteClient = useCallback((client: Client) => {
    setDeleteConfirm({ open: true, mode: "single", client });
  }, []);

  const requestDeleteSelected = useCallback(() => {
    if (selectedIds.size === 0) return;
    setDeleteConfirm({ open: true, mode: "bulk", count: selectedIds.size });
  }, [selectedIds.size]);

  const handleConfirmDelete = useCallback(async () => {
    if (!deleteConfirm.open) return;

    if (deleteConfirm.mode === "single") {
      await performDelete([deleteConfirm.client.id]);
      return;
    }

    await performDelete([...selectedIds]);
  }, [deleteConfirm, performDelete, selectedIds]);

  const handleRefresh = useCallback(() => {
    setSelectedIds(new Set());
    void loadClients(page, pageSize);
  }, [loadClients, page, pageSize]);

  const handleSearchChange = useCallback((value: string) => {
    setSearch(value);
  }, []);

  const handlePageChange = useCallback((nextPage: number) => {
    setSelectedIds(new Set());
    void loadClients(nextPage, pageSize);
  }, [loadClients, pageSize]);

  const handlePageSizeChange = useCallback((nextPageSize: number) => {
    setSelectedIds(new Set());
    void loadClients(1, nextPageSize);
  }, [loadClients]);

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

  const columns: ColumnDef<Client>[] = useMemo(
    () => [
      {
        id: "select",
        header: (
          <Checkbox
            checked={allSelected}
            indeterminate={someSelected}
            onChange={toggleAll}
            aria-label="Select all clients"
          />
        ),
        cell: (client) => (
          <Checkbox
            checked={selectedIds.has(client.id)}
            onChange={() => toggleOne(client.id)}
            aria-label={`Select ${client.companyName}`}
          />
        ),
        className: "data-table__col--checkbox",
      },
      {
        id: "companyName",
        header: (
          <ColumnHeader field="companyName" sortField={sort.field} sortOrder={sort.order} onSort={toggleSort}>
            Company Name
          </ColumnHeader>
        ),
        cell: (client) => <span className="data-table__text">{client.companyName}</span>,
      },
      {
        id: "companyContact",
        header: (
          <ColumnHeader
            field="companyContact"
            sortField={sort.field}
            sortOrder={sort.order}
            onSort={toggleSort}
          >
            Company Contact
          </ColumnHeader>
        ),
        cell: (client) => <span className="data-table__text">{client.companyContact || "—"}</span>,
      },
      {
        id: "email",
        header: (
          <ColumnHeader field="email" sortField={sort.field} sortOrder={sort.order} onSort={toggleSort}>
            Email
          </ColumnHeader>
        ),
        cell: (client) => <span className="data-table__text">{client.email || "—"}</span>,
      },
      {
        id: "phone",
        header: (
          <ColumnHeader field="phone" sortField={sort.field} sortOrder={sort.order} onSort={toggleSort}>
            Phone
          </ColumnHeader>
        ),
        cell: (client) => <span className="data-table__text">{client.phone || "—"}</span>,
      },
      {
        id: "externalId",
        header: (
          <ColumnHeader field="externalId" sortField={sort.field} sortOrder={sort.order} onSort={toggleSort}>
            External ID
          </ColumnHeader>
        ),
        cell: (client) => <span className="data-table__text">{client.externalId || "—"}</span>,
      },
      {
        id: "status",
        header: (
          <ColumnHeader field="status" sortField={sort.field} sortOrder={sort.order} onSort={toggleSort}>
            Status
          </ColumnHeader>
        ),
        cell: (client) => (
          <Badge variant={client.status === "active" ? "success" : "neutral"}>
            {client.status === "active" ? "Active" : "Inactive"}
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
        cell: (client) => (
          <span className="data-table__text data-table__text--muted">
            {formatDisplayDate(client.createdAt)}
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
        cell: (client) => (
          <span className="data-table__text data-table__text--muted">
            {formatDisplayDate(client.updatedAt)}
          </span>
        ),
      },
      {
        id: "actions",
        header: (
          <ColumnHeader
            field="actions"
            sortField={sort.field}
            sortOrder={sort.order}
            onSort={toggleSort}
            sortable={false}
          >
            Actions
          </ColumnHeader>
        ),
        cell: (client) => (
          <TableRowActionsMenu
            label={`Actions for ${client.companyName}`}
            actions={[
              {
                id: "edit",
                label: "Edit",
                icon: <EditIcon />,
                onClick: () => openEditModal(client),
              },
              {
                id: "delete",
                label: "Delete",
                icon: <TrashIcon />,
                tone: "danger",
                onClick: () => requestDeleteClient(client),
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
      requestDeleteClient,
    ]
  );

  const deleteDialogTitle =
    deleteConfirm.open && deleteConfirm.mode === "bulk"
      ? `Delete ${deleteConfirm.count} clients?`
      : "Delete client?";

  const deleteDialogMessage =
    deleteConfirm.open && deleteConfirm.mode === "bulk"
      ? `This will permanently remove ${deleteConfirm.count} selected clients. This action cannot be undone.`
      : deleteConfirm.open
        ? `This will permanently remove "${deleteConfirm.client.companyName}". This action cannot be undone.`
        : "";

  return (
    <section className="asset-page asset-page--clients">
      <Container fluid className="asset-page__container">
        <PageHeader
          title="Clients"
          subtitle="Manage client records"
          action={
            <UiButton variant="primary" size="sm" onClick={openAddModal}>
              <PlusIcon />
              Add Client
            </UiButton>
          }
        />

        <div className="asset-card asset-card--table">
          <div className="asset-card__toolbar">
            <div className="asset-card__filters">
              <TableSearch
                value={search}
                onChange={handleSearchChange}
                placeholder="Search clients…"
                ariaLabel="Search clients"
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
              getRowId={(client) => String(client.id)}
              gridTemplateColumns={CLIENT_GRID}
              emptyMessage={
                loading
                  ? "Loading clients…"
                  : debouncedSearch
                    ? "No clients match your search."
                    : "No clients yet. Add your first client to get started."
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

      <AddClientModal
        open={modalOpen}
        onClose={closeModal}
        onSubmit={editingClient ? handleEditClient : handleAddClient}
        clients={clients}
        editingClient={editingClient}
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
        title="Export Clients"
        filename="clients"
        columns={CLIENT_EXPORT_COLUMNS}
        data={exportRows}
        selectedCount={selectedIds.size}
      />
    </section>
  );
}
