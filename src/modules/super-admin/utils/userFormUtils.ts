import {
  isEmptyTrimmed,
  isValidEmail,
  maxLengthMessage,
  requiredFieldMessage,
} from "@/shared/utils/formValidation";
import type { AdminUser, AdminUserFormState } from "../types/user";

export const ADMIN_USER_FIELD_LIMITS = {
  firstName: 50,
  lastName: 50,
  email: 255,
  phoneCode: 10,
  phoneNumber: 20,
  companyName: 200,
  passwordMin: 8,
} as const;

const PHONE_CODE_PATTERN = /^\+[1-9]\d{0,3}$/;
const PHONE_DIGITS_PATTERN = /^\d{4,15}$/;
const LOGO_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/svg+xml",
  "image/webp",
]);
const LOGO_EXTENSIONS = /\.(jpe?g|png|gif|svg|webp)$/i;

export const EMPTY_ADMIN_USER_FORM: AdminUserFormState = {
  firstName: "",
  lastName: "",
  email: "",
  phoneCode: "",
  phoneNumber: "",
  password: "",
  role: "user",
  isEmailVerified: true,
  companyName: "",
  companyLogoUrl: "",
  companyLogoFile: null,
};

export type AdminUserFormErrors = Partial<
  Record<
    | "firstName"
    | "lastName"
    | "email"
    | "password"
    | "companyName"
    | "phoneCode"
    | "phoneNumber"
    | "companyLogo",
    string
  >
>;

export function isAllowedCompanyLogoFile(file: File): boolean {
  return LOGO_TYPES.has(file.type) || LOGO_EXTENSIONS.test(file.name);
}

function exceedsLimit(value: string, max: number, label: string): string | undefined {
  if (value.trim().length > max) return maxLengthMessage(label, max);
  return undefined;
}

function normalizeStoredPhoneCode(value: string | null): string {
  if (!value) return "";
  const digits = value.replace(/[^\d]/g, "").slice(0, 4);
  return digits ? `+${digits}` : "";
}

export function adminUserToForm(user: AdminUser): AdminUserFormState {
  return {
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    phoneCode: normalizeStoredPhoneCode(user.phoneCode),
    phoneNumber: user.phoneNumber ?? "",
    password: "",
    role: user.role,
    isEmailVerified: user.isEmailVerified,
    companyName: user.companyName ?? "",
    companyLogoUrl: user.companyLogoUrl ?? "",
    companyLogoFile: null,
  };
}

export function validateAdminUserForm(
  form: AdminUserFormState,
  options: { requirePassword: boolean; users: AdminUser[]; editingUserId?: number },
): AdminUserFormErrors {
  const errors: AdminUserFormErrors = {};
  const limits = ADMIN_USER_FIELD_LIMITS;

  if (isEmptyTrimmed(form.firstName)) {
    errors.firstName = requiredFieldMessage("First name");
  } else {
    const tooLong = exceedsLimit(form.firstName, limits.firstName, "First name");
    if (tooLong) errors.firstName = tooLong;
  }

  if (isEmptyTrimmed(form.lastName)) {
    errors.lastName = requiredFieldMessage("Last name");
  } else {
    const tooLong = exceedsLimit(form.lastName, limits.lastName, "Last name");
    if (tooLong) errors.lastName = tooLong;
  }

  if (isEmptyTrimmed(form.email)) {
    errors.email = requiredFieldMessage("Email");
  } else if (!isValidEmail(form.email)) {
    errors.email = "Please enter a valid email address.";
  } else {
    const tooLong = exceedsLimit(form.email, limits.email, "Email");
    if (tooLong) {
      errors.email = tooLong;
    } else {
      const normalizedEmail = form.email.trim().toLowerCase();
      const duplicate = options.users.some(
        (user) =>
          user.email.toLowerCase() === normalizedEmail &&
          user.id !== options.editingUserId,
      );
      if (duplicate) {
        errors.email = "A user with this email already exists.";
      }
    }
  }

  if (form.role === "user") {
    if (isEmptyTrimmed(form.companyName)) {
      errors.companyName = requiredFieldMessage("Company name");
    } else {
      const tooLong = exceedsLimit(
        form.companyName,
        limits.companyName,
        "Company name",
      );
      if (tooLong) errors.companyName = tooLong;
    }
  }

  const phoneCode = form.phoneCode.trim();
  const phoneNumber = form.phoneNumber.trim();
  const phoneDigits = phoneNumber.replace(/\D/g, "");

  if (phoneCode && !phoneNumber) {
    errors.phoneNumber = "Phone number is required when phone code is provided.";
  } else if (phoneNumber && !phoneCode) {
    errors.phoneCode = "Phone code is required when phone number is provided.";
  }

  if (phoneCode) {
    const tooLong = exceedsLimit(phoneCode, limits.phoneCode, "Phone code");
    if (tooLong) errors.phoneCode = tooLong;
    else if (!PHONE_CODE_PATTERN.test(phoneCode)) {
      errors.phoneCode = "Use a valid dial code, such as +61.";
    }
  }

  if (phoneNumber) {
    const tooLong = exceedsLimit(phoneNumber, limits.phoneNumber, "Phone number");
    if (tooLong) errors.phoneNumber = tooLong;
    else if (!PHONE_DIGITS_PATTERN.test(phoneDigits)) {
      errors.phoneNumber = "Phone number must contain 4 to 15 digits.";
    }
  }

  if (form.companyLogoFile) {
    if (!isAllowedCompanyLogoFile(form.companyLogoFile)) {
      errors.companyLogo = "Please choose a PNG, JPG, GIF, SVG, or WEBP image.";
    }
  }

  if (options.requirePassword) {
    if (isEmptyTrimmed(form.password)) {
      errors.password = requiredFieldMessage("Password");
    } else if (form.password.length < limits.passwordMin) {
      errors.password = `Password must be at least ${limits.passwordMin} characters.`;
    }
  } else if (form.password.trim() && form.password.length < limits.passwordMin) {
    errors.password = `Password must be at least ${limits.passwordMin} characters.`;
  }

  return errors;
}

export function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") resolve(reader.result);
      else reject(new Error("Unable to read logo file."));
    };
    reader.onerror = () => reject(new Error("Unable to read logo file."));
    reader.readAsDataURL(file);
  });
}

const LOGO_MAX_DIMENSION = 512;
const LOGO_JPEG_QUALITY = 0.82;
const LOGO_MAX_DATA_URL_CHARS = 700_000;

function loadImageFromFile(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Unable to process logo image."));
    };
    image.src = objectUrl;
  });
}

/** Compresses raster logos before upload so JSON payloads stay under the API body limit. */
export async function fileToCompanyLogoDataUrl(file: File): Promise<string> {
  if (file.type === "image/svg+xml" || file.name.toLowerCase().endsWith(".svg")) {
    return readFileAsDataUrl(file);
  }

  try {
    const image = await loadImageFromFile(file);
    const longestSide = Math.max(image.naturalWidth, image.naturalHeight) || 1;
    const scale = Math.min(1, LOGO_MAX_DIMENSION / longestSide);
    const width = Math.max(1, Math.round(image.naturalWidth * scale));
    const height = Math.max(1, Math.round(image.naturalHeight * scale));

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    if (!context) return readFileAsDataUrl(file);

    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, width, height);
    context.drawImage(image, 0, 0, width, height);

    const compressed = canvas.toDataURL("image/jpeg", LOGO_JPEG_QUALITY);
    if (compressed.length <= LOGO_MAX_DATA_URL_CHARS) {
      return compressed;
    }

    const tighter = canvas.toDataURL("image/jpeg", 0.65);
    if (tighter.length <= LOGO_MAX_DATA_URL_CHARS) {
      return tighter;
    }

    throw new Error("Company logo is too large. Please use a smaller image.");
  } catch (error) {
    if (error instanceof Error && error.message.includes("too large")) {
      throw error;
    }
    return readFileAsDataUrl(file);
  }
}
