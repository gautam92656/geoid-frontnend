"use client";

import type { FormEvent } from "react";
import { useEffect, useId, useState } from "react";
import {
  FileUpload,
  FormField,
  Input,
  Select,
  Toggle,
  UiButton,
  ProjectModalPortal,
} from "@/shared/components/ui";
import type { AdminUser, AdminUserFormState, UserRole } from "../types/user";
import {
  ADMIN_USER_FIELD_LIMITS,
  EMPTY_ADMIN_USER_FORM,
  adminUserToForm,
  validateAdminUserForm,
  type AdminUserFormErrors,
} from "../utils/userFormUtils";

const ROLE_OPTIONS = [
  { value: "user", label: "User" },
  { value: "super_admin", label: "Super Admin" },
];

const LOGO_ACCEPT =
  ".jpeg,.png,.jpg,.gif,.svg,.webp,image/jpeg,image/png,image/gif,image/svg+xml,image/webp";
const LOGO_MAX_MB = 2;
const ERROR_FIELD_ORDER: (keyof AdminUserFormErrors)[] = [
  "firstName",
  "lastName",
  "email",
  "companyName",
  "companyLogo",
  "phoneCode",
  "phoneNumber",
  "password",
];

type AddUserModalProps = Readonly<{
  open: boolean;
  onClose: () => void;
  onSubmit: (user: AdminUserFormState) => void | Promise<void>;
  users?: AdminUser[];
  editingUser?: AdminUser | null;
  submitting?: boolean;
}>;

function EyeIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M2.5 12C4.5 7.5 8 5 12 5s7.5 2.5 9.5 7c-2 4.5-5.5 7-9.5 7s-7.5-2.5-9.5-7z"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

function EyeOffIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M3 3l18 18M10.5 10.7A3 3 0 0012 15a3 3 0 002.3-4.3M7.8 7.9C9.2 7.1 10.6 6.7 12 6.7c4 0 7.5 2.5 9.5 7-.8 1.4-1.8 2.6-3 3.5M5.6 5.7C3.9 7 2.5 8.8 1.5 11c2 4.5 5.5 7 10.5 7 1.5 0 2.9-.3 4.2-.9"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

function normalizePhoneCode(value: string) {
  const digits = value.replace(/[^\d]/g, "").slice(0, 4);
  return digits ? `+${digits}` : "";
}

function sanitizePhoneNumber(value: string) {
  return value.replace(/[^\d\s()-]/g, "").slice(0, ADMIN_USER_FIELD_LIMITS.phoneNumber);
}

export function AddUserModal({
  open,
  onClose,
  onSubmit,
  users = [],
  editingUser = null,
  submitting = false,
}: AddUserModalProps) {
  return (
    <ProjectModalPortal open={open}>
      {open ? (
        <AddUserModalDialog
          key={editingUser ? `edit-${editingUser.id}` : "create"}
          onClose={onClose}
          onSubmit={onSubmit}
          users={users}
          editingUser={editingUser}
          submitting={submitting}
        />
      ) : null}
    </ProjectModalPortal>
  );
}

function AddUserModalDialog({
  onClose,
  onSubmit,
  users = [],
  editingUser = null,
  submitting = false,
}: Omit<AddUserModalProps, "open">) {
  const formId = useId();
  const logoInputId = useId();
  const isEditing = Boolean(editingUser);
  const limits = ADMIN_USER_FIELD_LIMITS;
  const [form, setForm] = useState<AdminUserFormState>(() =>
    editingUser ? adminUserToForm(editingUser) : EMPTY_ADMIN_USER_FORM,
  );
  const [errors, setErrors] = useState<AdminUserFormErrors>({});
  const [passwordVisible, setPasswordVisible] = useState(false);

  const showCompanyFields = form.role === "user";
  const fieldId = (name: string) => `${formId}-${name}`;

  const requestClose = () => {
    if (submitting) return;
    onClose();
  };

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || submitting) return;
      if (document.querySelector(".ui-select.is-open")) return;
      onClose();
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose, submitting]);

  const clearError = (key: keyof AdminUserFormErrors) => {
    setErrors((current) => (current[key] ? { ...current, [key]: undefined } : current));
  };

  const update = <K extends keyof AdminUserFormState>(
    key: K,
    value: AdminUserFormState[K],
  ) => {
    setForm((current) => ({ ...current, [key]: value }));
    if (key in errors) {
      clearError(key as keyof AdminUserFormErrors);
    }
  };

  const handleRoleChange = (value: string) => {
    const role = value as UserRole;
    setForm((current) => ({ ...current, role }));
    if (role !== "user") {
      setErrors((current) => ({
        ...current,
        companyName: undefined,
        companyLogo: undefined,
      }));
    }
  };

  const handleLogoChange = (file: File | null) => {
    setForm((current) => ({
      ...current,
      companyLogoFile: file,
      companyLogoUrl: "",
    }));
    clearError("companyLogo");
  };

  const focusFirstError = (nextErrors: AdminUserFormErrors) => {
    const firstKey = ERROR_FIELD_ORDER.find((key) => nextErrors[key]);
    if (!firstKey) return;

    window.requestAnimationFrame(() => {
      const fieldIdToFocus =
        firstKey === "companyLogo" ? logoInputId : fieldId(firstKey);
      const field = document.getElementById(fieldIdToFocus);
      const upload = field?.closest(".ui-file-upload");
      const focusTarget =
        (upload?.querySelector('[role="button"]') as HTMLElement | null) ?? field;

      focusTarget?.focus();
      (upload ?? field)?.scrollIntoView({ block: "center", behavior: "smooth" });
    });
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submitting) return;

    const nextErrors = validateAdminUserForm(form, {
      requirePassword: !isEditing,
      users,
      editingUserId: editingUser?.id,
    });
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      focusFirstError(nextErrors);
      return;
    }

    try {
      await onSubmit(form);
    } catch {
      // Parent surfaces API errors.
    }
  };

  return (
    <div className="project-modal project-modal--stacked" role="presentation">
      <button
        type="button"
        className="project-modal__backdrop"
        aria-label={`Close ${isEditing ? "edit" : "add"} user dialog`}
        onClick={requestClose}
      />

      <div
        className="project-modal__dialog project-modal__dialog--scroll project-modal__dialog--form"
        role="dialog"
        aria-modal="true"
        aria-labelledby={fieldId("title")}
        aria-describedby={fieldId("subtitle")}
      >
        <div className="project-modal__header">
          <h2 id={fieldId("title")} className="project-modal__title">
            {isEditing ? "Edit User" : "Add User"}
          </h2>
          <p id={fieldId("subtitle")} className="project-modal__subtitle">
            {isEditing
              ? "Update this user’s details, branding, and access."
              : "Create a user account with company branding and access."}
          </p>
        </div>

        <form
          id={formId}
          className="project-modal__form"
          onSubmit={handleSubmit}
          noValidate
          aria-busy={submitting}
        >
          <div className="project-modal__body ui-scrollbar">
            <div className="project-modal__fields">
              <FormField
                label="First name"
                htmlFor={fieldId("firstName")}
                required
                error={errors.firstName}
              >
                <Input
                  id={fieldId("firstName")}
                  variant="ui"
                  type="text"
                  name="firstName"
                  placeholder="Jane"
                  value={form.firstName}
                  maxLength={limits.firstName}
                  onChange={(event) => update("firstName", event.target.value)}
                  onBlur={() => update("firstName", form.firstName.trim())}
                  autoComplete="given-name"
                  autoFocus
                  disabled={submitting}
                  aria-invalid={Boolean(errors.firstName)}
                />
              </FormField>

              <FormField
                label="Last name"
                htmlFor={fieldId("lastName")}
                required
                error={errors.lastName}
              >
                <Input
                  id={fieldId("lastName")}
                  variant="ui"
                  type="text"
                  name="lastName"
                  placeholder="Smith"
                  value={form.lastName}
                  maxLength={limits.lastName}
                  onChange={(event) => update("lastName", event.target.value)}
                  onBlur={() => update("lastName", form.lastName.trim())}
                  autoComplete="family-name"
                  disabled={submitting}
                  aria-invalid={Boolean(errors.lastName)}
                />
              </FormField>

              <FormField
                label="Email"
                htmlFor={fieldId("email")}
                required
                error={errors.email}
              >
                <Input
                  id={fieldId("email")}
                  variant="ui"
                  type="email"
                  name="email"
                  placeholder="jane@company.com"
                  value={form.email}
                  maxLength={limits.email}
                  onChange={(event) => update("email", event.target.value)}
                  onBlur={() => update("email", form.email.trim())}
                  autoComplete="email"
                  spellCheck={false}
                  disabled={submitting}
                  aria-invalid={Boolean(errors.email)}
                />
              </FormField>

              <FormField label="Role" htmlFor={fieldId("role")} required>
                <Select
                  id={fieldId("role")}
                  value={form.role}
                  options={ROLE_OPTIONS}
                  onChange={handleRoleChange}
                  floatingMenu
                  disabled={submitting}
                />
              </FormField>

              {showCompanyFields ? (
                <>
                  <FormField
                    label="Company name"
                    htmlFor={fieldId("companyName")}
                    required
                    error={errors.companyName}
                    className="project-modal__field--full"
                  >
                    <Input
                      id={fieldId("companyName")}
                      variant="ui"
                      type="text"
                      name="companyName"
                      placeholder="Acme Geotechnics"
                      value={form.companyName}
                      maxLength={limits.companyName}
                      onChange={(event) => update("companyName", event.target.value)}
                      onBlur={() => update("companyName", form.companyName.trim())}
                      autoComplete="organization"
                      disabled={submitting}
                      aria-invalid={Boolean(errors.companyName)}
                    />
                  </FormField>

                  <FormField
                    label="Company logo"
                    htmlFor={logoInputId}
                    error={errors.companyLogo}
                    className="project-modal__field--full"
                  >
                    <FileUpload
                      id={logoInputId}
                      value={form.companyLogoFile}
                      existingSrc={
                        form.companyLogoFile ? null : form.companyLogoUrl || null
                      }
                      existingLabel="Current company logo"
                      accept={LOGO_ACCEPT}
                      maxSizeMb={LOGO_MAX_MB}
                      hint={`PNG, JPG, GIF, SVG or WEBP up to ${LOGO_MAX_MB} MB.`}
                      disabled={submitting}
                      error={errors.companyLogo}
                      onChange={handleLogoChange}
                      onReject={(message) =>
                        setErrors((current) => ({ ...current, companyLogo: message }))
                      }
                    />
                  </FormField>
                </>
              ) : null}

              <div className="project-modal__phone">
                <FormField
                  label="Phone code"
                  htmlFor={fieldId("phoneCode")}
                  error={errors.phoneCode}
                >
                  <Input
                    id={fieldId("phoneCode")}
                    variant="ui"
                    type="tel"
                    name="phoneCode"
                    inputMode="tel"
                    placeholder="+61"
                    value={form.phoneCode}
                    maxLength={limits.phoneCode}
                    onChange={(event) =>
                      update("phoneCode", normalizePhoneCode(event.target.value))
                    }
                    autoComplete="tel-country-code"
                    disabled={submitting}
                    aria-invalid={Boolean(errors.phoneCode)}
                  />
                </FormField>

                <FormField
                  label="Phone number"
                  htmlFor={fieldId("phoneNumber")}
                  error={errors.phoneNumber}
                >
                  <Input
                    id={fieldId("phoneNumber")}
                    variant="ui"
                    type="tel"
                    name="phoneNumber"
                    inputMode="tel"
                    placeholder="4123 456 789"
                    value={form.phoneNumber}
                    maxLength={limits.phoneNumber}
                    onChange={(event) =>
                      update("phoneNumber", sanitizePhoneNumber(event.target.value))
                    }
                    autoComplete="tel-national"
                    disabled={submitting}
                    aria-invalid={Boolean(errors.phoneNumber)}
                  />
                </FormField>
              </div>

              <FormField
                label={isEditing ? "New password" : "Password"}
                htmlFor={fieldId("password")}
                required={!isEditing}
                error={errors.password}
                hint={
                  isEditing
                    ? "Leave blank to keep the current password."
                    : `Minimum ${limits.passwordMin} characters.`
                }
                className="project-modal__field--full"
              >
                <div className="ui-password">
                  <Input
                    id={fieldId("password")}
                    variant="ui"
                    type={passwordVisible ? "text" : "password"}
                    name="password"
                    placeholder={
                      isEditing ? "Leave blank to keep current" : "Create a password"
                    }
                    value={form.password}
                    onChange={(event) => update("password", event.target.value)}
                    autoComplete="new-password"
                    disabled={submitting}
                    aria-invalid={Boolean(errors.password)}
                  />
                  <button
                    type="button"
                    className="ui-password__toggle"
                    aria-label={passwordVisible ? "Hide password" : "Show password"}
                    onClick={() => setPasswordVisible((current) => !current)}
                    disabled={submitting}
                  >
                    {passwordVisible ? <EyeOffIcon /> : <EyeIcon />}
                  </button>
                </div>
              </FormField>

              <div className="project-modal__field--full">
                <div className="project-modal__toggle-row">
                  <div className="project-modal__toggle-row-text">
                    <label
                      className="project-modal__toggle-row-label"
                      htmlFor={fieldId("isEmailVerified")}
                    >
                      Email verified
                    </label>
                    <p className="project-modal__toggle-row-hint">
                      Skip the verification email and mark this account as verified.
                    </p>
                  </div>
                  <Toggle
                    id={fieldId("isEmailVerified")}
                    checked={form.isEmailVerified}
                    onChange={(checked) => update("isEmailVerified", checked)}
                    disabled={submitting}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="project-modal__footer">
            <UiButton
              type="button"
              variant="ghost"
              onClick={requestClose}
              disabled={submitting}
            >
              Cancel
            </UiButton>
            <UiButton type="submit" variant="primary" disabled={submitting}>
              {submitting
                ? isEditing
                  ? "Saving…"
                  : "Creating…"
                : isEditing
                  ? "Save changes"
                  : "Create user"}
            </UiButton>
          </div>
        </form>
      </div>
    </div>
  );
}
