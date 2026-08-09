export const HEADER_FOOTER_RENDERER_VERSION = "0.1.28" as const;
export const HEADER_FOOTER_RENDERER_URL =
  "https://cdn.libraries.tablogs.com/header-footer-renderer/0.1.28/header-footer-renderer.umd.js";

export type RendererPlaceholder = {
  label: string;
  token: string;
  category: "System" | "Company" | "Project" | "Log" | "Location";
  sample: string;
};

/**
 * Placeholder contract exposed by the renderer bundle captured in
 * header-footer-template.har. Keep these tokens stable for saved templates.
 */
export const RENDERER_PLACEHOLDERS: readonly RendererPlaceholder[] = [
  { label: "Page Number", token: "{{page}}", category: "System", sample: "1" },
  { label: "Total Pages", token: "{{pages}}", category: "System", sample: "5" },
  { label: "Page X of Y", token: "{{page}} of {{pages}}", category: "System", sample: "1 of 5" },
  { label: "Current Date", token: "{{date}}", category: "System", sample: "01/08/2026" },
  { label: "Current Time", token: "{{time}}", category: "System", sample: "12:47 pm" },
  { label: "Company Name", token: "{{company.name}}", category: "Company", sample: "Geoid" },
  { label: "Company Address", token: "{{company.address}}", category: "Company", sample: "Company address" },
  { label: "Company Phone", token: "{{company.phone}}", category: "Company", sample: "+1 555 0100" },
  { label: "Company Email", token: "{{company.email}}", category: "Company", sample: "info@example.com" },
  { label: "Company Website", token: "{{company.website}}", category: "Company", sample: "www.example.com" },
  { label: "Company Logo", token: "{{company.logo}}", category: "Company", sample: "" },
  { label: "Logged By", token: "{{log.logged_by}}", category: "Log", sample: "" },
  { label: "Reviewed By", token: "{{log.reviewed_by}}", category: "Log", sample: "" },
  { label: "Project ID", token: "{{project.id}}", category: "Project", sample: "P-001" },
  { label: "Project Name", token: "{{project.name}}", category: "Project", sample: "Site Investigation" },
  { label: "Project Number", token: "{{project.number}}", category: "Project", sample: "PRJ-001" },
  { label: "Client Name", token: "{{project.client}}", category: "Project", sample: "Client" },
  { label: "Project Location", token: "{{project.location}}", category: "Project", sample: "Project location" },
  { label: "Borehole Number", token: "{{log.bh_no}}", category: "Log", sample: "BH-001" },
  { label: "Log Title", token: "{{log.title}}", category: "Log", sample: "Geotechnical Borehole Log" },
  { label: "Date Drilled", token: "{{log.date_drilled}}", category: "Log", sample: "2026-08-01" },
  { label: "Driller Name", token: "{{log.driller}}", category: "Log", sample: "Driller" },
  { label: "Equipment", token: "{{log.equipment}}", category: "Log", sample: "Drilling rig" },
  { label: "Total Depth", token: "{{log.total_depth}}", category: "Log", sample: "25.0m" },
  { label: "Drilling Method", token: "{{log.method}}", category: "Log", sample: "Rotary Wash" },
  { label: "Easting", token: "{{location.easting}}", category: "Location", sample: "123456.78" },
  { label: "Northing", token: "{{location.northing}}", category: "Location", sample: "987654.32" },
  { label: "Elevation", token: "{{location.elevation}}", category: "Location", sample: "150.00m" },
  { label: "UTM Zone", token: "{{location.utm}}", category: "Location", sample: "55H" },
  { label: "Latitude", token: "{{location.lat}}", category: "Location", sample: "40.7128" },
  { label: "Longitude", token: "{{location.lng}}", category: "Location", sample: "-74.0060" },
  { label: "Location Comment", token: "{{log.location_comment}}", category: "Log", sample: "" },
] as const;

export function resolveRendererTokens(
  value: string,
  context: Record<string, string> = {}
): string {
  let resolved = value;
  for (const placeholder of RENDERER_PLACEHOLDERS) {
    const replacement = context[placeholder.token] ?? placeholder.sample;
    resolved = resolved.split(placeholder.token).join(replacement);
  }
  return resolved.replace(/{{\s*[^}]+\s*}}/g, "");
}
