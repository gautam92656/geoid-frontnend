export const SERVICE_AREAS = ["Victoria", "New South Wales", "Queensland"] as const;

export type ServiceArea = (typeof SERVICE_AREAS)[number];
