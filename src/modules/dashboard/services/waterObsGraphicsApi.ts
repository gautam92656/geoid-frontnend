import apiClient from "@/shared/services/apiClient";
import type { ApiEnvelope } from "@/shared/types/api";
import type { WaterObservationGraphicCatalogEntry } from "../utils/configModules/waterObservationType";

export type WaterObsGraphicsCatalog = {
  graphics: WaterObservationGraphicCatalogEntry[];
};

export async function listWaterObsGraphics(): Promise<WaterObsGraphicsCatalog> {
  const res = await apiClient.get<ApiEnvelope<WaterObsGraphicsCatalog>>("/water-obs-graphics");
  return res.data.data;
}
