export const LOG_SECTIONS = [
  { id: "details", label: "Log Details" },
  { id: "report", label: "Log Report" },
  { id: "subsurface", label: "Subsurface" },
  { id: "insitu-tests", label: "Insitu Tests" },
  { id: "remarks", label: "Remarks" },
  { id: "drilling-observations", label: "Drilling Observations" },
  { id: "water-observations", label: "Water Observations" },
  { id: "well-logs", label: "Well Logs" },
  { id: "photos", label: "Log Photos" },
  { id: "samples", label: "Samples" },
  { id: "lab-tests", label: "Lab Tests" },
  { id: "core-logging", label: "Core Logging" },
] as const;

export type LogSectionId = (typeof LOG_SECTIONS)[number]["id"];
