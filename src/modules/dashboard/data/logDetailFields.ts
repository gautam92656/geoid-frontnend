import type { CustomFieldOptionsMeta } from "./projectDetailFields";

export const LOG_DETAIL_FIELD_KEYS = [
  "locationAccuracy",
  "coordinateSystem",
  "elevationNotes",
  "coordinateMethod",
  "logType",
  "logNumericalId",
  "abandonmentMethod",
  "logFinish",
  "defaultBorelogTemplate",
  "defaultCorelogTemplate",
  "completedDate",
  "logCarrierType",
  "specialProduction",
  "projectEngineer",
  "csjNumber",
  "highway",
  "district",
  "county",
  "azimuth",
  "inclination",
  "alignment",
  "stationOffset",
  "station",
  "stateRoute",
  "section",
  "segmentOffset",
  "segment",
  "offsetFromCentreline",
  "direction",
  "lane",
  "line",
  "finishingComment",
  "comments",
  "locationComment",
  "operator",
  "structure",
  "temperature",
  "weather",
] as const;

export type LogDetailFieldKey = (typeof LOG_DETAIL_FIELD_KEYS)[number];

export const MANAGEABLE_LOG_DETAIL_FIELD_KEYS = [
  "logType",
  "abandonmentMethod",
  "logCarrierType",
] as const;

export type ManageableLogDetailFieldKey = (typeof MANAGEABLE_LOG_DETAIL_FIELD_KEYS)[number];

export type LogDetailFieldDefinition = {
  key: LogDetailFieldKey;
  label: string;
  manageable?: boolean;
};

export type LogDetailFieldSectionDefinition = {
  id: string;
  title: string;
  fields: readonly LogDetailFieldDefinition[];
};

export const LOG_DETAIL_FIELD_SECTIONS: readonly LogDetailFieldSectionDefinition[] = [
  {
    id: "geospatial",
    title: "Geospatial Information",
    fields: [
      { key: "locationAccuracy", label: "Location Accuracy" },
      { key: "coordinateSystem", label: "Coordinate System" },
      { key: "elevationNotes", label: "Elevation Notes" },
      { key: "coordinateMethod", label: "Coordinate Method" },
    ],
  },
  {
    id: "log-details",
    title: "Log Details",
    fields: [
      { key: "logType", label: "Log Type", manageable: true },
      { key: "logNumericalId", label: "Log Numerical ID" },
      { key: "abandonmentMethod", label: "Abandonment Method", manageable: true },
      { key: "logFinish", label: "Log Finish" },
      { key: "defaultBorelogTemplate", label: "Default Borelog Template" },
      { key: "defaultCorelogTemplate", label: "Default Corelog Template" },
      { key: "completedDate", label: "Completed Date" },
      { key: "logCarrierType", label: "Log Carrier Type", manageable: true },
      { key: "specialProduction", label: "Special Production" },
      { key: "projectEngineer", label: "Project Engineer" },
      { key: "csjNumber", label: "CSJ Number" },
      { key: "highway", label: "Highway" },
      { key: "district", label: "District" },
      { key: "county", label: "County" },
    ],
  },
  {
    id: "alignment",
    title: "Alignment and Orientation",
    fields: [
      { key: "azimuth", label: "Azimuth" },
      { key: "inclination", label: "Inclination" },
      { key: "alignment", label: "Alignment" },
      { key: "stationOffset", label: "Station Offset" },
      { key: "station", label: "Station" },
      { key: "stateRoute", label: "State Route" },
      { key: "section", label: "Section" },
      { key: "segmentOffset", label: "Segment Offset" },
      { key: "segment", label: "Segment" },
      { key: "offsetFromCentreline", label: "Offset from Centreline" },
      { key: "direction", label: "Direction" },
      { key: "lane", label: "Lane" },
      { key: "line", label: "Line" },
    ],
  },
  {
    id: "annotations",
    title: "Annotations and Comments",
    fields: [
      { key: "finishingComment", label: "Finishing Comment" },
      { key: "comments", label: "Comments" },
      { key: "locationComment", label: "Location Comment" },
      { key: "operator", label: "Operator" },
      { key: "structure", label: "Structure" },
      { key: "temperature", label: "Temperature" },
      { key: "weather", label: "Weather" },
    ],
  },
];

export const DEFAULT_LOG_DETAIL_FIELD_ENABLED: Record<LogDetailFieldKey, boolean> = {
  locationAccuracy: true,
  coordinateSystem: true,
  elevationNotes: false,
  coordinateMethod: false,
  logType: true,
  logNumericalId: false,
  abandonmentMethod: false,
  logFinish: true,
  defaultBorelogTemplate: false,
  defaultCorelogTemplate: false,
  completedDate: true,
  logCarrierType: false,
  specialProduction: false,
  projectEngineer: false,
  csjNumber: false,
  highway: false,
  district: false,
  county: false,
  azimuth: true,
  inclination: true,
  alignment: false,
  stationOffset: false,
  station: true,
  stateRoute: false,
  section: false,
  segmentOffset: false,
  segment: false,
  offsetFromCentreline: false,
  direction: false,
  lane: false,
  line: false,
  finishingComment: true,
  comments: true,
  locationComment: true,
  operator: false,
  structure: false,
  temperature: false,
  weather: false,
};

export const DEFAULT_LOG_DETAIL_FIELD_OPTIONS: Record<ManageableLogDetailFieldKey, string[]> = {
  logType: ["Borehole", "Test Pit", "Cone Penetration Test"],
  abandonmentMethod: ["Grouted", "Cut and Capped", "Left Open"],
  logCarrierType: ["Truck", "ATV", "Foot"],
};

export const MANAGEABLE_LOG_DETAIL_FIELD_META: Record<
  ManageableLogDetailFieldKey,
  CustomFieldOptionsMeta
> = {
  logType: {
    manageTitle: "Manage Log Types",
    manageDescription: "Manage your existing log types by selecting from the left menu.",
    sidebarLabel: "Log Types",
    nameLabel: "Log Type Name",
    deleteLabel: "Delete Log Type",
    addPanelTitle: "Add New Log Type",
    editPanelTitle: "Edit",
  },
  abandonmentMethod: {
    manageTitle: "Manage Abandonment Methods",
    manageDescription: "Manage your existing abandonment methods by selecting from the left menu.",
    sidebarLabel: "Abandonment Methods",
    nameLabel: "Abandonment Method Name",
    deleteLabel: "Delete Abandonment Method",
    addPanelTitle: "Add New Abandonment Method",
    editPanelTitle: "Edit",
  },
  logCarrierType: {
    manageTitle: "Manage Log Carrier Types",
    manageDescription: "Manage your existing log carrier types by selecting from the left menu.",
    sidebarLabel: "Log Carrier Types",
    nameLabel: "Log Carrier Type Name",
    deleteLabel: "Delete Log Carrier Type",
    addPanelTitle: "Add New Log Carrier Type",
    editPanelTitle: "Edit",
  },
};
