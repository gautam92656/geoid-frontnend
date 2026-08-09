import { isEmptyTrimmed, requiredFieldMessage } from "@/shared/utils/formValidation";
import type { OfficeFormState } from "../types/office";

export type OfficeFormErrors = Partial<Pick<Record<keyof OfficeFormState, string>, "name">>;

export function validateOfficeForm(form: OfficeFormState): OfficeFormErrors {
  const errors: OfficeFormErrors = {};

  if (isEmptyTrimmed(form.name)) {
    errors.name = requiredFieldMessage("Name");
  }

  return errors;
}
