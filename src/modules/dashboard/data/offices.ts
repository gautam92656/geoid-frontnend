export const OFFICES = ["Melbourne HQ", "Sydney Office", "Brisbane Office"] as const;

export type OfficeName = (typeof OFFICES)[number];
