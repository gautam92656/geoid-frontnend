import apiClient from "@/shared/services/apiClient";
import type { ApiEnvelope } from "@/shared/types/api";
import type { WellTypeGraphicCatalogEntry } from "../utils/configModules/wellType";

export type WellTypeGraphicsCatalog = {
  graphics: WellTypeGraphicCatalogEntry[];
};

export async function listWellTypeGraphics(): Promise<WellTypeGraphicsCatalog> {
  const res = await apiClient.get<ApiEnvelope<WellTypeGraphicsCatalog>>("/well-type-graphics");
  return res.data.data;
}
