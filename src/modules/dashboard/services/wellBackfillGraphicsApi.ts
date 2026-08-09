import apiClient from "@/shared/services/apiClient";
import type { ApiEnvelope } from "@/shared/types/api";
import type { WellBackfillGraphicCatalogEntry } from "../utils/configModules/wellBackfillType";

export type WellBackfillGraphicsCatalog = {
  graphics: WellBackfillGraphicCatalogEntry[];
};

export async function listWellBackfillGraphics(): Promise<WellBackfillGraphicsCatalog> {
  const res = await apiClient.get<ApiEnvelope<WellBackfillGraphicsCatalog>>(
    "/well-backfill-graphics"
  );
  return res.data.data;
}
