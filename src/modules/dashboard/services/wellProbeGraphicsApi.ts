import apiClient from "@/shared/services/apiClient";
import type { ApiEnvelope } from "@/shared/types/api";
import type { WellProbeGraphicCatalogEntry } from "../utils/configModules/wellProbeType";

export type WellProbeGraphicsCatalog = {
  graphics: WellProbeGraphicCatalogEntry[];
};

export async function listWellProbeGraphics(): Promise<WellProbeGraphicsCatalog> {
  const res = await apiClient.get<ApiEnvelope<WellProbeGraphicsCatalog>>("/well-probe-graphics");
  return res.data.data;
}
