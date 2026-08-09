export const LABORATORIES = [
  "GeoLab Melbourne",
  "SoilTest AU",
  "Central Geotech Lab",
] as const;

export type LaboratoryName = (typeof LABORATORIES)[number];
