import apiClient from "@/shared/services/apiClient";
import type { ApiEnvelope } from "@/shared/types/api";
import type { WellCoverGraphicCatalogEntry } from "../utils/configModules/wellCoverType";

export type WellCoverGraphicsCatalog = {
  graphics: WellCoverGraphicCatalogEntry[];
};

export async function listWellCoverGraphics(): Promise<WellCoverGraphicsCatalog> {
  const res = await apiClient.get<ApiEnvelope<WellCoverGraphicsCatalog>>("/well-cover-graphics");
  return res.data.data;
}
