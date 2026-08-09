import apiClient from "@/shared/services/apiClient";
import type { ApiEnvelope } from "@/shared/types/api";

export type ClassificationGraphic = {
  code: string;
  path: string;
  url: string;
  full_path: string;
};

export async function listClassificationGraphics(): Promise<ClassificationGraphic[]> {
  const res = await apiClient.get<ApiEnvelope<ClassificationGraphic[]>>("/classification-graphics");
  return res.data.data;
}
