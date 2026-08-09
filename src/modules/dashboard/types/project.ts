export type ProjectFormState = {
  projectAddress: string;
  projectNo: string;
  projectName: string;
  projectStatus: string;
  logConfigId: string;
  client: string;
  office: string;
  startDate: string;
  endDate: string;
  coordinateSystem: string;
  latitude: string;
  longitude: string;
  easting: string;
  northing: string;
  utmZone: string;
};

export type Project = {
  id: number;
  projectNo: string;
  name: string;
  location: string;
  address: string;
  assignee: string;
  client: string;
  clientId: number | null;
  status: string;
  brief: string;
  logConfigId: string;
  office: string;
  startDate: string;
  endDate: string;
  coordinateSystem: string;
  latitude: string;
  longitude: string;
  easting: string;
  northing: string;
  utmZone: string;
  createdAt: string;
  updatedAt: string;
  archivedAt: string | null;
  deletedAt: string | null;
};

export type ProjectPayload = {
  projectNo: string;
  name: string;
  address: string;
  status?: string;
  brief?: string;
  assignee?: string;
  logConfigId: string;
  clientId: number;
  office?: string;
  startDate?: string;
  endDate?: string;
  coordinateSystem?: string;
  latitude: string;
  longitude: string;
  easting?: string;
  northing?: string;
  utmZone?: string;
};

export type PaginatedProjects = {
  data: Project[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};
