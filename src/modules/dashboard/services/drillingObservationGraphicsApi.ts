import apiClient from "@/shared/services/apiClient";
import type { ApiEnvelope } from "@/shared/types/api";
import type { DrillingObservationGraphicCatalogEntry } from "../utils/configModules/drillingObservation";

export type DrillingObservationGraphicsCatalog = {
  graphics: DrillingObservationGraphicCatalogEntry[];
};

export async function listDrillingObservationGraphics(): Promise<DrillingObservationGraphicsCatalog> {
  const res = await apiClient.get<ApiEnvelope<DrillingObservationGraphicsCatalog>>(
    "/drilling-observation-graphics"
  );
  return res.data.data;
}
