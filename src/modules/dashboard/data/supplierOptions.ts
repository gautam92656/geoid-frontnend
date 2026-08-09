export const SUPPLIER_TYPES = ["Laboratory", "Equipment"] as const;

export const SUPPLIER_RELATIONSHIPS = ["Internal supplier", "External supplier"] as const;

export const LAB_TEST_TYPES = [
  "Moisture Content",
  "Particle Size Distribution",
  "Atterberg Limits",
  "IS50",
  "GS - Mechanical Grain Size",
  "w - Moisture Content",
  "C - Consolidation Test",
  "L-Pile",
  "HCSI",
  "DR - Relative Density",
  "k - Permeability Coefficient",
  "q - Triaxial Test",
  "UCS - Unconfined Compressive Strength",
  "SB - Shear Box Test",
  "Y - Unit Weight",
  "Yd - Dry Unit Weight",
  "p - Density",
  "Pd - Dry Density",
] as const;

export type SupplierType = (typeof SUPPLIER_TYPES)[number];
export type SupplierRelationship = (typeof SUPPLIER_RELATIONSHIPS)[number];
export type LabTestType = (typeof LAB_TEST_TYPES)[number];
