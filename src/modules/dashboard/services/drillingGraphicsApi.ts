import apiClient from "@/shared/services/apiClient";
import type { ApiEnvelope } from "@/shared/types/api";
import type { DrillingGraphicCatalogEntry } from "../utils/configModules/drillingType";

export type DrillingGraphicsCatalog = {
  graphics: DrillingGraphicCatalogEntry[];
};

export async function listDrillingGraphics(): Promise<DrillingGraphicsCatalog> {
  const res = await apiClient.get<ApiEnvelope<DrillingGraphicsCatalog>>("/drilling-graphics");
  return res.data.data;
}
