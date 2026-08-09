import apiClient from "@/shared/services/apiClient";
import type { ApiEnvelope } from "@/shared/types/api";
import type { CasingTypeGraphicCatalogEntry } from "../utils/configModules/drillingCasing";

export type CasingTypeGraphicsCatalog = {
  graphics: CasingTypeGraphicCatalogEntry[];
};

export async function listCasingTypeGraphics(): Promise<CasingTypeGraphicsCatalog> {
  const res = await apiClient.get<ApiEnvelope<CasingTypeGraphicsCatalog>>(
    "/casing-type-graphics"
  );
  return res.data.data;
}
