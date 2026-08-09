import apiClient from "@/shared/services/apiClient";
import type { ApiEnvelope } from "@/shared/types/api";

export type OriginType = {
  id: number;
  label: string;
  value: string;
  sort_order: number;
};

export async function listOriginTypes(): Promise<OriginType[]> {
  const res = await apiClient.get<ApiEnvelope<OriginType[]>>("/origin-types");
  return res.data.data;
}
