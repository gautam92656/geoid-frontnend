import apiClient from "@/shared/services/apiClient";
import type { ApiEnvelope } from "@/shared/types/api";
import type { WellCasingGraphicCatalogEntry } from "../utils/configModules/wellCasingType";

export type WellCasingGraphicsCatalog = {
  graphics: WellCasingGraphicCatalogEntry[];
};

export async function listWellCasingGraphics(): Promise<WellCasingGraphicsCatalog> {
  const res = await apiClient.get<ApiEnvelope<WellCasingGraphicsCatalog>>(
    "/well-casing-graphics"
  );
  return res.data.data;
}
