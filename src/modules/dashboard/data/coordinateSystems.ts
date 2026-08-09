export type CoordinateSystemOption = Readonly<{
  value: string;
  label: string;
}>;

export const COORDINATE_SYSTEMS: readonly CoordinateSystemOption[] = [
  { value: "latlong", label: "Latitude / Longitude" },
  { value: "easting-northing", label: "Easting / Northing" },
  { value: "nzgd49", label: "NZGD49" },
  { value: "usa-washington-nad83-north", label: "USA - Washington NAD 83 North" },
  { value: "usa-washington-nad83-south", label: "USA - Washington NAD 83 South" },
  {
    value: "epsg-3901",
    label: "EPSG:3901 - KKJ / Finland Uniform Coordinate System + N60 height",
  },
  {
    value: "epsg-3902",
    label: "EPSG:3902 - ETRS89 / TM35FIN(N,E) + N60 height",
  },
  {
    value: "epsg-3903",
    label: "EPSG:3903 - ETRS89 / TM35FIN(N,E) + N2000 height",
  },
  { value: "epsg-4097", label: "EPSG:4097 - ETRS89 / DKTM1 + DVR90 height" },
  { value: "epsg-4098", label: "EPSG:4098 - ETRS89 / DKTM2 + DVR90 height" },
  { value: "epsg-4099", label: "EPSG:4099 - ETRS89 / DKTM3 + DVR90 height" },
  { value: "epsg-4100", label: "EPSG:4100 - ETRS89 / DKTM4 + DVR90 height" },
  { value: "epsg-5318", label: "EPSG:5318 - ETRS89 / Faroe TM + FVR09 height" },
  { value: "epsg-5498", label: "EPSG:5498 - NAD83 + NAVD88 height" },
  { value: "epsg-5499", label: "EPSG:5499 - NAD83(HARN) + NAVD88 height" },
];

export const DEFAULT_COORDINATE_SYSTEM = "nzgd49";
