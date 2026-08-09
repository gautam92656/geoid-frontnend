import apiClient from "@/shared/services/apiClient";
import type { ApiEnvelope } from "@/shared/types/api";
import type { InsituTestTypeGraphicCatalogEntry } from "../utils/configModules/insituTestType";

export type InsituTestTypeGraphicsCatalog = {
  testGraphics: InsituTestTypeGraphicCatalogEntry[];
  topBottomGraphics: InsituTestTypeGraphicCatalogEntry[];
};

export async function listInsituTestTypeGraphics(): Promise<InsituTestTypeGraphicsCatalog> {
  const res = await apiClient.get<ApiEnvelope<InsituTestTypeGraphicsCatalog>>(
    "/insitu-test-type-graphics"
  );
  return res.data.data;
}
