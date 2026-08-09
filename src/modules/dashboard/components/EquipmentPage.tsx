"use client";

import type { ReactNode } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Container } from "react-bootstrap";
import {
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
  type ToolbarMenuAction,
} from "@/shared/components/ui";
import { useTableSort } from "@/shared/hooks/useTableSort";
import { useDebouncedValue } from "@/shared/hooks/useDebouncedValue";
import { DEFAULT_TABLE_PAGE_SIZE, MAX_TABLE_PAGE_SIZE, TABLE_PAGE_SIZE_OPTIONS } from "@/shared/constants/pagination";
import { formatDisplayDate } from "@/shared/utils/formatDate";
import { API_ERROR_MESSAGES, API_MESSAGES } from "@/shared/constants/apiMessages";
import { showApiError, showApiSuccess } from "@/shared/utils/apiToast";
import {
  createEquipment,
  deleteEquipment,
  formToEquipmentPayload,
  listEquipment,
  updateEquipment,
} from "../services/equipmentApi";
import {
  listEquipmentFieldDefinitions,
  listEquipmentTypes,
} from "../services/equipmentTypeApi";
import { listSuppliers } from "../services/supplierApi";
import type { Equipment, EquipmentFormState } from "../types/equipment";
import type { EquipmentFieldDefinition, EquipmentType } from "../types/equipmentType";
import { AddEquipmentModal } from "./AddEquipmentModal";
import { ExportCsvModal } from "./ExportCsvModal";
import { ManageEquipmentTypesModal } from "./ManageEquipmentTypesModal";
import { EQUIPMENT_EXPORT_COLUMNS } from "../data/exportColumns";

const EQUIPMENT_GRID =
  "40px 140px 120px 180px 200px 120px 120px 90px 140px 120px 160px 200px 130px 100px 120px 220px 160px 140px 140px 150px 120px 72px";

type DeleteConfirmState =
  | { open: false }
  | { open: true; mode: "single"; equipment: Equipment }
  | { open: true; mode: "bulk"; count: number };

function formatSuppliers(suppliers: string[]): string {
  return suppliers.length > 0 ? suppliers.join(", ") : "—";
}

function formatCell(value: string): string {
  return value.trim() || "—";
}

function getEquipmentSortValue(item: Equipment, field: string): string | number {
  switch (field) {
    case "id":
      return item.id;
    case "equipmentType":
      return item.equipmentType;
    case "equipmentNo":
      return item.equipmentNo;
    case "equipmentName":
      return item.equipmentName;
    case "suppliers":
      return formatSuppliers(item.suppliers);
    case "mounting":
      return item.mounting;
    case "driveWeight":
      return item.driveWeight;
    case "drop":
      return item.drop;
    case "manufacturer":
      return item.manufacturer;
    case "model":
      return item.model;
    case "energyTransferRatio":
      return item.energyTransferRatio;
    case "hammerEfficiencyCorrection":
      return item.hammerEfficiencyCorrection;
    case "netAreaRatio":
      return item.netAreaRatio;
    case "tipArea":
      return item.tipArea;
    case "frictionRatio":
      return item.frictionRatio;
    case "porePressureTransducerLocation":
      return item.porePressureTransducerLocation;
    case "frictionReducerType":
      return item.frictionReducerType;
    case "frictionReducer":
      return item.frictionReducer;
    case "calibratedBy":
      return item.calibratedBy;
    case "dateOfCalibration":
      return item.dateOfCalibration ?? "";
    case "bucketWidth":
      return item.bucketWidth;
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

export function EquipmentPage() {
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(DEFAULT_TABLE_PAGE_SIZE);
  const [total, setTotal] = useState(0);
  const [equipmentTypes, setEquipmentTypes] = useState<EquipmentType[]>([]);
  const [fieldDefinitions, setFieldDefinitions] = useState<EquipmentFieldDefinition[]>([]);
  const [supplierOptions, setSupplierOptions] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search.trim());
  const hasMounted = useRef(false);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [equipmentModalOpen, setEquipmentModalOpen] = useState(false);
  const [editingEquipment, setEditingEquipment] = useState<Equipment | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<DeleteConfirmState>({ open: false });
  const [manageTypesOpen, setManageTypesOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);

  const { sort, toggleSort, sortedData } = useTableSort(equipment, getEquipmentSortValue);

  const exportRows = useMemo(() => {
    if (selectedIds.size === 0) return sortedData;
    return sortedData.filter((item) => selectedIds.has(item.id));
  }, [selectedIds, sortedData]);

  const loadReferenceData = useCallback(async () => {
    try {
      const [typesResult, fields, suppliersResult] = await Promise.all([
        listEquipmentTypes(1, MAX_TABLE_PAGE_SIZE),
        listEquipmentFieldDefinitions(),
        listSuppliers(1, MAX_TABLE_PAGE_SIZE),
      ]);

      setEquipmentTypes(typesResult.data);
      setFieldDefinitions(fields);
      setSupplierOptions(
        suppliersResult.data
          .filter(
            (supplier) => supplier.status === "active" && supplier.supplierType === "Equipment"
          )
          .map((supplier) => supplier.businessName)
      );
    } catch (err) {
      showApiError(err, API_ERROR_MESSAGES.LOAD_EQUIPMENT_REFERENCE);
    }
  }, []);

  const loadEquipment = useCallback(async (nextPage: number, nextPageSize: number, nextSearch = debouncedSearch) => {
    setLoading(true);
    try {
      const equipmentResult = await listEquipment(nextPage, nextPageSize, nextSearch || undefined);
      setEquipment(equipmentResult.data);
      setTotal(equipmentResult.total);
      setPage(nextPage);
      setPageSize(nextPageSize);
    } catch (err) {
      showApiError(err, API_ERROR_MESSAGES.LOAD_EQUIPMENT);
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch]);

  useEffect(() => {
    void loadReferenceData();
  }, [loadReferenceData]);

  useEffect(() => {
    if (!hasMounted.current) {
      hasMounted.current = true;
      void loadEquipment(1, DEFAULT_TABLE_PAGE_SIZE, "");
      return;
    }

    setSelectedIds(new Set());
    void loadEquipment(1, pageSize);
  }, [debouncedSearch, loadEquipment]);

  const allSelected = equipment.length > 0 && selectedIds.size === equipment.length;
  const someSelected = selectedIds.size > 0 && !allSelected;

  const toggleAll = useCallback(() => {
    setSelectedIds((current) =>
      current.size === equipment.length ? new Set() : new Set(equipment.map((item) => item.id))
    );
  }, [equipment]);

  const toggleOne = useCallback((id: number) => {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const handleAddEquipment = useCallback(async (form: EquipmentFormState) => {
    setSubmitting(true);
    try {
      const { message } = await createEquipment(formToEquipmentPayload(form));
      setEquipmentModalOpen(false);
      setEditingEquipment(null);
      setSelectedIds(new Set());
      await loadEquipment(1, pageSize);
      showApiSuccess(message, API_MESSAGES.EQUIPMENT_ADDED);
    } catch (err) {
      showApiError(err, API_ERROR_MESSAGES.ADD_EQUIPMENT);
      throw err;
    } finally {
      setSubmitting(false);
    }
  }, [loadEquipment, pageSize]);

  const handleEditEquipment = useCallback(async (form: EquipmentFormState) => {
    if (!editingEquipment) return;

    setSubmitting(true);
    try {
      const { message } = await updateEquipment(
        editingEquipment.id,
        formToEquipmentPayload(form)
      );
      setEquipmentModalOpen(false);
      setEditingEquipment(null);
      await loadEquipment(page, pageSize);
      showApiSuccess(message, API_MESSAGES.EQUIPMENT_UPDATED);
    } catch (err) {
      showApiError(err, API_ERROR_MESSAGES.UPDATE_EQUIPMENT);
      throw err;
    } finally {
      setSubmitting(false);
    }
  }, [editingEquipment, loadEquipment, page, pageSize]);

  const openAddModal = useCallback(() => {
    setEditingEquipment(null);
    setEquipmentModalOpen(true);
  }, []);

  const openEditModal = useCallback((item: Equipment) => {
    setEditingEquipment(item);
    setEquipmentModalOpen(true);
  }, []);

  const closeEquipmentModal = useCallback(() => {
    setEquipmentModalOpen(false);
    setEditingEquipment(null);
  }, []);

  const performDelete = useCallback(async (ids: number[]) => {
    if (ids.length === 0) return;

    setDeleting(true);
    try {
      const results = await Promise.all(ids.map((id) => deleteEquipment(id)));
      setSelectedIds(new Set());

      const nextTotal = Math.max(0, total - ids.length);
      const nextTotalPages = Math.max(1, Math.ceil(nextTotal / pageSize));
      const nextPage = Math.min(page, nextTotalPages);
      await loadEquipment(nextPage, pageSize);

      const message = results.find((result) => result.message)?.message;
      showApiSuccess(
        message,
        ids.length === 1 ? API_MESSAGES.EQUIPMENT_DELETED : API_MESSAGES.EQUIPMENT_ITEMS_DELETED
      );
      setDeleteConfirm({ open: false });
    } catch (err) {
      showApiError(err, API_ERROR_MESSAGES.DELETE_EQUIPMENT);
    } finally {
      setDeleting(false);
    }
  }, [loadEquipment, page, pageSize, total]);

  const requestDeleteEquipment = useCallback((item: Equipment) => {
    setDeleteConfirm({ open: true, mode: "single", equipment: item });
  }, []);

  const requestDeleteSelected = useCallback(() => {
    if (selectedIds.size === 0) return;
    setDeleteConfirm({ open: true, mode: "bulk", count: selectedIds.size });
  }, [selectedIds.size]);

  const handleConfirmDelete = useCallback(async () => {
    if (!deleteConfirm.open) return;

    if (deleteConfirm.mode === "single") {
      await performDelete([deleteConfirm.equipment.id]);
      return;
    }

    await performDelete([...selectedIds]);
  }, [deleteConfirm, performDelete, selectedIds]);

  const handleRefresh = useCallback(() => {
    setSelectedIds(new Set());
    void loadEquipment(page, pageSize);
    void loadReferenceData();
  }, [loadEquipment, loadReferenceData, page, pageSize]);

  const handleSearchChange = useCallback((value: string) => {
    setSearch(value);
  }, []);

  const handlePageChange = useCallback((nextPage: number) => {
    setSelectedIds(new Set());
    void loadEquipment(nextPage, pageSize);
  }, [loadEquipment, pageSize]);

  const handlePageSizeChange = useCallback((nextPageSize: number) => {
    setSelectedIds(new Set());
    void loadEquipment(1, nextPageSize);
  }, [loadEquipment]);

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

  const toolbarMenuActions: ToolbarMenuAction[] = useMemo(
    () => [
      {
        id: "add-equipment",
        label: "Add Equipments",
        onClick: openAddModal,
      },
      {
        id: "manage-types",
        label: "Manage Types",
        onClick: () => setManageTypesOpen(true),
      },
    ],
    []
  );

  const columns: ColumnDef<Equipment>[] = useMemo(
    () => [
      {
        id: "select",
        header: (
          <Checkbox
            checked={allSelected}
            indeterminate={someSelected}
            onChange={toggleAll}
            aria-label="Select all equipment"
          />
        ),
        cell: (item) => (
          <Checkbox
            checked={selectedIds.has(item.id)}
            onChange={() => toggleOne(item.id)}
            aria-label={`Select ${item.equipmentName}`}
          />
        ),
        className: "data-table__col--checkbox",
      },
      {
        id: "equipmentType",
        header: (
          <ColumnHeader field="equipmentType" sortField={sort.field} sortOrder={sort.order} onSort={toggleSort}>
            Equipment Type
          </ColumnHeader>
        ),
        cell: (item) => <span className="data-table__text">{formatCell(item.equipmentType)}</span>,
      },
      {
        id: "equipmentNo",
        header: (
          <ColumnHeader field="equipmentNo" sortField={sort.field} sortOrder={sort.order} onSort={toggleSort}>
            Equipment No
          </ColumnHeader>
        ),
        cell: (item) => <span className="data-table__text">{formatCell(item.equipmentNo)}</span>,
      },
      {
        id: "equipmentName",
        header: (
          <ColumnHeader field="equipmentName" sortField={sort.field} sortOrder={sort.order} onSort={toggleSort}>
            Equipment Name
          </ColumnHeader>
        ),
        cell: (item) => <span className="data-table__text">{formatCell(item.equipmentName)}</span>,
      },
      {
        id: "suppliers",
        header: (
          <ColumnHeader field="suppliers" sortField={sort.field} sortOrder={sort.order} onSort={toggleSort}>
            Supplier(s)
          </ColumnHeader>
        ),
        cell: (item) => (
          <span className="data-table__text">{formatSuppliers(item.suppliers)}</span>
        ),
      },
      {
        id: "mounting",
        header: (
          <ColumnHeader field="mounting" sortField={sort.field} sortOrder={sort.order} onSort={toggleSort}>
            Mounting
          </ColumnHeader>
        ),
        cell: (item) => <span className="data-table__text">{formatCell(item.mounting)}</span>,
      },
      {
        id: "driveWeight",
        header: (
          <ColumnHeader field="driveWeight" sortField={sort.field} sortOrder={sort.order} onSort={toggleSort}>
            Drive Weight
          </ColumnHeader>
        ),
        cell: (item) => <span className="data-table__text">{formatCell(item.driveWeight)}</span>,
      },
      {
        id: "drop",
        header: (
          <ColumnHeader field="drop" sortField={sort.field} sortOrder={sort.order} onSort={toggleSort}>
            Drop
          </ColumnHeader>
        ),
        cell: (item) => <span className="data-table__text">{formatCell(item.drop)}</span>,
      },
      {
        id: "manufacturer",
        header: (
          <ColumnHeader field="manufacturer" sortField={sort.field} sortOrder={sort.order} onSort={toggleSort}>
            Manufacturer
          </ColumnHeader>
        ),
        cell: (item) => <span className="data-table__text">{formatCell(item.manufacturer)}</span>,
      },
      {
        id: "model",
        header: (
          <ColumnHeader field="model" sortField={sort.field} sortOrder={sort.order} onSort={toggleSort}>
            Model
          </ColumnHeader>
        ),
        cell: (item) => <span className="data-table__text">{formatCell(item.model)}</span>,
      },
      {
        id: "energyTransferRatio",
        header: (
          <ColumnHeader
            field="energyTransferRatio"
            sortField={sort.field}
            sortOrder={sort.order}
            onSort={toggleSort}
          >
            Energy Transfer Ratio
          </ColumnHeader>
        ),
        cell: (item) => (
          <span className="data-table__text">{formatCell(item.energyTransferRatio)}</span>
        ),
      },
      {
        id: "hammerEfficiencyCorrection",
        header: (
          <ColumnHeader
            field="hammerEfficiencyCorrection"
            sortField={sort.field}
            sortOrder={sort.order}
            onSort={toggleSort}
          >
            Hammer Efficiency Correction
          </ColumnHeader>
        ),
        cell: (item) => (
          <span className="data-table__text">{formatCell(item.hammerEfficiencyCorrection)}</span>
        ),
      },
      {
        id: "netAreaRatio",
        header: (
          <ColumnHeader field="netAreaRatio" sortField={sort.field} sortOrder={sort.order} onSort={toggleSort}>
            Net Area Ratio
          </ColumnHeader>
        ),
        cell: (item) => <span className="data-table__text">{formatCell(item.netAreaRatio)}</span>,
      },
      {
        id: "tipArea",
        header: (
          <ColumnHeader field="tipArea" sortField={sort.field} sortOrder={sort.order} onSort={toggleSort}>
            Tip Area
          </ColumnHeader>
        ),
        cell: (item) => <span className="data-table__text">{formatCell(item.tipArea)}</span>,
      },
      {
        id: "frictionRatio",
        header: (
          <ColumnHeader field="frictionRatio" sortField={sort.field} sortOrder={sort.order} onSort={toggleSort}>
            Friction Ratio
          </ColumnHeader>
        ),
        cell: (item) => <span className="data-table__text">{formatCell(item.frictionRatio)}</span>,
      },
      {
        id: "porePressureTransducerLocation",
        header: (
          <ColumnHeader
            field="porePressureTransducerLocation"
            sortField={sort.field}
            sortOrder={sort.order}
            onSort={toggleSort}
          >
            Pore Pressure Transducer Location
          </ColumnHeader>
        ),
        cell: (item) => (
          <span className="data-table__text">{formatCell(item.porePressureTransducerLocation)}</span>
        ),
      },
      {
        id: "frictionReducerType",
        header: (
          <ColumnHeader
            field="frictionReducerType"
            sortField={sort.field}
            sortOrder={sort.order}
            onSort={toggleSort}
          >
            Friction Reducer Type
          </ColumnHeader>
        ),
        cell: (item) => (
          <span className="data-table__text">{formatCell(item.frictionReducerType)}</span>
        ),
      },
      {
        id: "frictionReducer",
        header: (
          <ColumnHeader field="frictionReducer" sortField={sort.field} sortOrder={sort.order} onSort={toggleSort}>
            Friction Reducer
          </ColumnHeader>
        ),
        cell: (item) => <span className="data-table__text">{formatCell(item.frictionReducer)}</span>,
      },
      {
        id: "calibratedBy",
        header: (
          <ColumnHeader field="calibratedBy" sortField={sort.field} sortOrder={sort.order} onSort={toggleSort}>
            Calibrated By
          </ColumnHeader>
        ),
        cell: (item) => <span className="data-table__text">{formatCell(item.calibratedBy)}</span>,
      },
      {
        id: "dateOfCalibration",
        header: (
          <ColumnHeader
            field="dateOfCalibration"
            sortField={sort.field}
            sortOrder={sort.order}
            onSort={toggleSort}
          >
            Date of Calibration
          </ColumnHeader>
        ),
        cell: (item) => (
          <span className="data-table__text data-table__text--muted">
            {item.dateOfCalibration ? formatDisplayDate(item.dateOfCalibration) : "—"}
          </span>
        ),
      },
      {
        id: "bucketWidth",
        header: (
          <ColumnHeader field="bucketWidth" sortField={sort.field} sortOrder={sort.order} onSort={toggleSort}>
            Bucket Width
          </ColumnHeader>
        ),
        cell: (item) => <span className="data-table__text">{formatCell(item.bucketWidth)}</span>,
      },
      {
        id: "actions",
        header: "Actions",
        cell: (item) => (
          <TableRowActionsMenu
            label={`Actions for ${item.equipmentName || item.equipmentNo || "equipment"}`}
            actions={[
              {
                id: "edit",
                label: "Edit",
                icon: <EditIcon />,
                onClick: () => openEditModal(item),
              },
              {
                id: "delete",
                label: "Delete",
                icon: <TrashIcon />,
                tone: "danger",
                onClick: () => requestDeleteEquipment(item),
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
      requestDeleteEquipment,
    ]
  );

  const deleteDialogTitle =
    deleteConfirm.open && deleteConfirm.mode === "bulk"
      ? `Delete ${deleteConfirm.count} equipment items?`
      : "Delete equipment?";

  const deleteDialogMessage =
    deleteConfirm.open && deleteConfirm.mode === "bulk"
      ? `This will permanently remove ${deleteConfirm.count} selected equipment items. This action cannot be undone.`
      : deleteConfirm.open
        ? `This will permanently remove "${deleteConfirm.equipment.equipmentName || deleteConfirm.equipment.equipmentNo}". This action cannot be undone.`
        : "";

  return (
    <section className="asset-page asset-page--equipment">
      <Container fluid className="asset-page__container">
        <PageHeader
          title="Equipment"
          subtitle="Browse and manage project equipment"
          action={
            <UiButton variant="primary" size="sm" onClick={openAddModal}>
              <PlusIcon />
              Add Equipment
            </UiButton>
          }
        />

        <div className="asset-card asset-card--table">
          <div className="asset-card__toolbar">
            <div className="asset-card__filters">
              <TableSearch
                value={search}
                onChange={handleSearchChange}
                placeholder="Search equipment…"
                ariaLabel="Search equipment"
                disabled={loading}
              />
            </div>
            <TableToolbar actions={toolbarActions} menuActions={toolbarMenuActions} />
            {selectedIds.size > 0 ? (
              <span className="asset-card__selection">{selectedIds.size} selected</span>
            ) : null}
          </div>

          <div className="asset-card__table-wrap ui-scrollbar">
            <DataTable
              columns={columns}
              data={sortedData}
              getRowId={(item) => String(item.id)}
              gridTemplateColumns={EQUIPMENT_GRID}
              emptyMessage={
                loading
                  ? "Loading equipment…"
                  : debouncedSearch
                    ? "No equipment matches your search."
                    : "No equipment yet. Add your first equipment record to get started."
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

      <AddEquipmentModal
        open={equipmentModalOpen}
        onClose={closeEquipmentModal}
        onSubmit={editingEquipment ? handleEditEquipment : handleAddEquipment}
        editingEquipment={editingEquipment}
        submitting={submitting}
        equipmentTypes={equipmentTypes}
        fieldDefinitions={fieldDefinitions}
        onEquipmentTypesChange={setEquipmentTypes}
        supplierOptions={supplierOptions}
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

      <ManageEquipmentTypesModal
        open={manageTypesOpen}
        onClose={() => setManageTypesOpen(false)}
        types={equipmentTypes}
        fieldDefinitions={fieldDefinitions}
        onChange={setEquipmentTypes}
      />

      <ExportCsvModal
        open={exportOpen}
        onClose={() => setExportOpen(false)}
        title="Export Equipment"
        filename="equipment"
        columns={EQUIPMENT_EXPORT_COLUMNS}
        data={exportRows}
        selectedCount={selectedIds.size}
      />
    </section>
  );
}
