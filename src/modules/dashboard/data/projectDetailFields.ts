export const PROJECT_DETAIL_FIELD_KEYS = [
  "highway",
  "csjNumber",
  "district",
  "structure",
  "county",
  "contractId",
  "deliveryId",
  "projectIntent",
  "serviceLine",
  "laboratory",
  "serviceArea",
] as const;

export type ProjectDetailFieldKey = (typeof PROJECT_DETAIL_FIELD_KEYS)[number];

export const MANAGEABLE_PROJECT_DETAIL_FIELD_KEYS = [
  "district",
  "serviceLine",
  "serviceArea",
] as const;

export type ManageableProjectDetailFieldKey = (typeof MANAGEABLE_PROJECT_DETAIL_FIELD_KEYS)[number];

export type ProjectDetailFieldDefinition = {
  key: ProjectDetailFieldKey;
  label: string;
  manageable?: boolean;
};

export const PROJECT_DETAIL_FIELD_DEFINITIONS: readonly ProjectDetailFieldDefinition[] = [
  { key: "highway", label: "Highway" },
  { key: "csjNumber", label: "CSJ Number" },
  { key: "district", label: "District", manageable: true },
  { key: "structure", label: "Structure" },
  { key: "county", label: "County" },
  { key: "contractId", label: "Contract ID" },
  { key: "deliveryId", label: "Delivery ID" },
  { key: "projectIntent", label: "Project Intent" },
  { key: "serviceLine", label: "Service Line", manageable: true },
  { key: "laboratory", label: "Laboratory" },
  { key: "serviceArea", label: "Service Area", manageable: true },
];

export const DEFAULT_PROJECT_DETAIL_FIELD_OPTIONS: Record<ManageableProjectDetailFieldKey, string[]> = {
  district: ["North", "South", "East", "West"],
  serviceLine: ["Geotechnical", "Environmental", "Materials Testing"],
  serviceArea: ["Victoria", "New South Wales", "Queensland"],
};

export type CustomFieldOptionsMeta = {
  manageTitle: string;
  manageDescription: string;
  sidebarLabel: string;
  nameLabel: string;
  deleteLabel: string;
  addPanelTitle: string;
  editPanelTitle: string;
};

/** @deprecated Use CustomFieldOptionsMeta */
export type ManageableProjectDetailFieldMeta = CustomFieldOptionsMeta;

export const MANAGEABLE_PROJECT_DETAIL_FIELD_META: Record<
  ManageableProjectDetailFieldKey,
  CustomFieldOptionsMeta
> = {
  district: {
    manageTitle: "Manage Districts",
    manageDescription: "Manage your existing districts by selecting from the left menu.",
    sidebarLabel: "Districts",
    nameLabel: "District Name",
    deleteLabel: "Delete District",
    addPanelTitle: "Add New District",
    editPanelTitle: "Edit",
  },
  serviceLine: {
    manageTitle: "Manage Service Lines",
    manageDescription: "Manage your existing service lines by selecting from the left menu.",
    sidebarLabel: "Service Lines",
    nameLabel: "Service Line Name",
    deleteLabel: "Delete Service Line",
    addPanelTitle: "Add New Service Line",
    editPanelTitle: "Edit",
  },
  serviceArea: {
    manageTitle: "Manage Service Areas",
    manageDescription: "Manage your existing service areas by selecting from the left menu.",
    sidebarLabel: "Service Areas",
    nameLabel: "Service Area Name",
    deleteLabel: "Delete Service Area",
    addPanelTitle: "Add New Service Area",
    editPanelTitle: "Edit",
  },
};
