import type { Client, ClientFormState } from "../types/client";

export const COMPANY_NAME_MAX_LENGTH = 200;
export const EMAIL_MAX_LENGTH = 255;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function clientToForm(client: Client): ClientFormState {
  return {
    companyName: client.companyName,
    companyContact: client.companyContact,
    email: client.email,
    phone: client.phone,
    externalId: client.externalId,
    status: client.status,
  };
}

export function isDuplicateCompanyName(
  clients: readonly Client[] | undefined,
  companyName: string,
  excludeId?: number
): boolean {
  const normalized = companyName.trim().toLowerCase();
  if (!normalized) return false;

  return (clients ?? []).some(
    (client) => client.id !== excludeId && client.companyName.trim().toLowerCase() === normalized
  );
}

export function isDuplicateEmail(
  clients: readonly Client[] | undefined,
  email: string,
  excludeId?: number
): boolean {
  const normalized = email.trim().toLowerCase();
  if (!normalized) return false;

  return (clients ?? []).some(
    (client) => client.id !== excludeId && (client.email ?? "").trim().toLowerCase() === normalized
  );
}

export function validateClientForm(
  form: ClientFormState,
  clients?: readonly Client[],
  excludeId?: number
): { companyName?: string; email?: string } {
  const errors: { companyName?: string; email?: string } = {};
  const trimmedCompanyName = form.companyName.trim();
  const trimmedEmail = form.email.trim();

  if (!trimmedCompanyName) {
    errors.companyName = "Company name is required.";
  } else if (trimmedCompanyName.length > COMPANY_NAME_MAX_LENGTH) {
    errors.companyName = `Company name must be ${COMPANY_NAME_MAX_LENGTH} characters or fewer.`;
  } else if (isDuplicateCompanyName(clients, trimmedCompanyName, excludeId)) {
    errors.companyName = "A client with this company name already exists.";
  }

  if (trimmedEmail) {
    if (!EMAIL_PATTERN.test(trimmedEmail)) {
      errors.email = "Please enter a valid email address.";
    } else if (trimmedEmail.length > EMAIL_MAX_LENGTH) {
      errors.email = `Email must be ${EMAIL_MAX_LENGTH} characters or fewer.`;
    } else if (isDuplicateEmail(clients, trimmedEmail, excludeId)) {
      errors.email = "A client with this email already exists.";
    }
  }

  return errors;
}
