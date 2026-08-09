import { isEmptyTrimmed, requiredFieldMessage } from "@/shared/utils/formValidation";
import type { Supplier, SupplierFormState } from "../types/supplier";

export type SupplierFormErrors = Partial<
  Record<"businessName" | "email" | "supplierType", string>
>;

export const BUSINESS_NAME_MAX_LENGTH = 200;
export const EMAIL_MAX_LENGTH = 255;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function supplierToForm(supplier: Supplier): SupplierFormState {
  return {
    businessName: supplier.businessName,
    supplierType: supplier.supplierType,
    supplierRelationship: supplier.supplierRelationship,
    supplierExternalId: supplier.supplierExternalId,
    labTestTypes: [...supplier.labTestTypes],
    firstName: supplier.firstName,
    lastName: supplier.lastName,
    address: supplier.address,
    email: supplier.email,
    phone: supplier.phone,
    abn: supplier.abn,
    status: supplier.status,
  };
}

export function isDuplicateBusinessName(
  suppliers: readonly Supplier[],
  businessName: string,
  excludeId?: number
): boolean {
  const normalized = businessName.trim().toLowerCase();
  if (!normalized) return false;

  return suppliers.some(
    (supplier) =>
      supplier.id !== excludeId && supplier.businessName.trim().toLowerCase() === normalized
  );
}

export function isDuplicateEmail(
  suppliers: readonly Supplier[],
  email: string,
  excludeId?: number
): boolean {
  const normalized = email.trim().toLowerCase();
  if (!normalized) return false;

  return suppliers.some(
    (supplier) => supplier.id !== excludeId && (supplier.email ?? "").trim().toLowerCase() === normalized
  );
}

export function validateSupplierForm(
  form: SupplierFormState,
  suppliers: readonly Supplier[],
  excludeId?: number
): SupplierFormErrors {
  const errors: SupplierFormErrors = {};
  const trimmedBusinessName = form.businessName.trim();
  const trimmedEmail = form.email.trim();

  if (isEmptyTrimmed(form.supplierType)) {
    errors.supplierType = requiredFieldMessage("Supplier type");
  }

  if (!trimmedBusinessName) {
    errors.businessName = "Business name is required.";
  } else if (trimmedBusinessName.length > BUSINESS_NAME_MAX_LENGTH) {
    errors.businessName = `Business name must be ${BUSINESS_NAME_MAX_LENGTH} characters or fewer.`;
  } else if (isDuplicateBusinessName(suppliers, trimmedBusinessName, excludeId)) {
    errors.businessName = "A supplier with this business name already exists.";
  }

  if (trimmedEmail) {
    if (!EMAIL_PATTERN.test(trimmedEmail)) {
      errors.email = "Please enter a valid email address.";
    } else if (trimmedEmail.length > EMAIL_MAX_LENGTH) {
      errors.email = `Email must be ${EMAIL_MAX_LENGTH} characters or fewer.`;
    } else if (isDuplicateEmail(suppliers, trimmedEmail, excludeId)) {
      errors.email = "A supplier with this email already exists.";
    }
  }

  return errors;
}
