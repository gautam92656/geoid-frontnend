import { isEmptyTrimmed, requiredFieldMessage } from "@/shared/utils/formValidation";
import type { AdminUser, AdminUserFormState } from "../types/user";

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
  Record<"firstName" | "lastName" | "email" | "password" | "companyName", string>
>;

export function adminUserToForm(user: AdminUser): AdminUserFormState {
  return {
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    phoneCode: user.phoneCode ?? "",
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
  options: { requirePassword: boolean; users: AdminUser[]; editingUserId?: number }
): AdminUserFormErrors {
  const errors: AdminUserFormErrors = {};

  if (isEmptyTrimmed(form.firstName)) {
    errors.firstName = requiredFieldMessage("First name");
  }
  if (isEmptyTrimmed(form.lastName)) {
    errors.lastName = requiredFieldMessage("Last name");
  }
  if (isEmptyTrimmed(form.email)) {
    errors.email = requiredFieldMessage("Email");
  } else {
    const normalizedEmail = form.email.trim().toLowerCase();
    const duplicate = options.users.some(
      (user) =>
        user.email.toLowerCase() === normalizedEmail && user.id !== options.editingUserId
    );
    if (duplicate) {
      errors.email = "A user with this email already exists.";
    }
  }

  if (form.role === "user" && isEmptyTrimmed(form.companyName)) {
    errors.companyName = requiredFieldMessage("Company name");
  }

  if (options.requirePassword) {
    if (isEmptyTrimmed(form.password)) {
      errors.password = requiredFieldMessage("Password");
    } else if (form.password.length < 8) {
      errors.password = "Password must be at least 8 characters.";
    }
  } else if (form.password.trim() && form.password.length < 8) {
    errors.password = "Password must be at least 8 characters.";
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
