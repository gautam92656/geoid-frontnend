"use client";

import type { FormEvent } from "react";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import {
  FormField,
  Input,
  Select,
  Toggle,
  UiButton,
  ProjectModalPortal,
} from "@/shared/components/ui";
import type { AdminUser, AdminUserFormState } from "../types/user";
import {
  EMPTY_ADMIN_USER_FORM,
  adminUserToForm,
  validateAdminUserForm,
  type AdminUserFormErrors,
} from "../utils/userFormUtils";

const ROLE_OPTIONS = [
  { value: "user", label: "User" },
  { value: "super_admin", label: "Super Admin" },
];

const LOGO_ACCEPT = ".jpeg,.png,.jpg,.gif,.svg,image/*";
const LOGO_MAX_MB = 2;

type AddUserModalProps = Readonly<{
  open: boolean;
  onClose: () => void;
  onSubmit: (user: AdminUserFormState) => void | Promise<void>;
  users?: AdminUser[];
  editingUser?: AdminUser | null;
  submitting?: boolean;
}>;

function ImageIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="3" y="5" width="18" height="14" rx="2" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="9" cy="10" r="1.5" fill="currentColor" />
      <path d="M3 16l5-5 4 4 3-3 6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

export function AddUserModal({
  open,
  onClose,
  onSubmit,
  users = [],
  editingUser = null,
  submitting = false,
}: AddUserModalProps) {
  const formId = useId();
  const logoInputId = useId();
  const logoInputRef = useRef<HTMLInputElement>(null);
  const isEditing = editingUser !== null;
  const [form, setForm] = useState<AdminUserFormState>(EMPTY_ADMIN_USER_FORM);
  const [errors, setErrors] = useState<AdminUserFormErrors>({});
  const [logoPreview, setLogoPreview] = useState<string | null>(null);

  const existingLogoUrl = useMemo(() => {
    if (form.companyLogoFile || !form.companyLogoUrl) return null;
    return form.companyLogoUrl;
  }, [form.companyLogoFile, form.companyLogoUrl]);

  const companyLogoSrc = logoPreview || existingLogoUrl;

  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, onClose]);

  useEffect(() => {
    if (!open) {
      setForm(EMPTY_ADMIN_USER_FORM);
      setErrors({});
      setLogoPreview(null);
      return;
    }

    setForm(editingUser ? adminUserToForm(editingUser) : EMPTY_ADMIN_USER_FORM);
    setErrors({});
    setLogoPreview(null);
  }, [open, editingUser]);

  useEffect(() => {
    if (!form.companyLogoFile) {
      setLogoPreview(null);
      return;
    }

    const objectUrl = URL.createObjectURL(form.companyLogoFile);
    setLogoPreview(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [form.companyLogoFile]);

  const update = <K extends keyof AdminUserFormState>(key: K, value: AdminUserFormState[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
    if (
      key === "firstName" ||
      key === "lastName" ||
      key === "email" ||
      key === "password" ||
      key === "companyName"
    ) {
      setErrors((current) => ({ ...current, [key]: undefined }));
    }
  };

  const handleLogoChange = (file: File | null) => {
    if (!file) {
      update("companyLogoFile", null);
      return;
    }

    if (file.size > LOGO_MAX_MB * 1024 * 1024) {
      return;
    }

    update("companyLogoFile", file);
    update("companyLogoUrl", "");
  };

  const clearLogo = () => {
    update("companyLogoFile", null);
    update("companyLogoUrl", "");
    if (logoInputRef.current) logoInputRef.current.value = "";
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
    if (Object.keys(nextErrors).length > 0) return;

    await onSubmit(form);
  };

  const showCompanyFields = form.role === "user";

  return (
    <ProjectModalPortal open={open}>
      <div className="project-modal project-modal--stacked" role="presentation">
        <button
          type="button"
          className="project-modal__backdrop"
          aria-label={`Close ${isEditing ? "edit" : "add"} user dialog`}
          onClick={onClose}
        />

        <div
          className="project-modal__dialog project-modal__dialog--scroll project-modal__dialog--form"
          role="dialog"
          aria-modal="true"
          aria-labelledby={`${formId}-title`}
        >
          <div className="project-modal__header">
            <h2 id={`${formId}-title`} className="project-modal__title">
              {isEditing ? "Edit User" : "Add User"}
            </h2>
            <p className="project-modal__subtitle">
              {isEditing
                ? "Update this user’s details, branding, and access."
                : "Create a user with their own company name and logo (not GeoID)."}
            </p>
          </div>

          <form id={formId} className="project-modal__form" onSubmit={handleSubmit} noValidate>
            <div className="project-modal__body ui-scrollbar">
              <div className="project-modal__fields">
                {showCompanyFields ? (
                  <div className="project-modal__field--full project-modal__company-logo">
                    <input
                      ref={logoInputRef}
                      id={logoInputId}
                      type="file"
                      accept={LOGO_ACCEPT}
                      className="project-modal__company-logo-input"
                      onChange={(event) => handleLogoChange(event.target.files?.[0] ?? null)}
                    />
                    <button
                      type="button"
                      className="project-modal__company-logo-btn"
                      aria-label="Upload company logo"
                      onClick={() => logoInputRef.current?.click()}
                    >
                      {companyLogoSrc ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={companyLogoSrc} alt="Company logo" />
                      ) : (
                        <span className="project-modal__company-logo-placeholder">
                          <ImageIcon />
                          <span>Upload logo</span>
                        </span>
                      )}
                    </button>
                    <p className="project-modal__company-logo-label">Company logo</p>
                    <p className="ui-field__hint">
                      Click to upload. PNG, JPG, GIF or SVG up to {LOGO_MAX_MB} MB.
                    </p>
                    {companyLogoSrc ? (
                      <UiButton type="button" variant="ghost" size="sm" onClick={clearLogo}>
                        Remove logo
                      </UiButton>
                    ) : null}
                  </div>
                ) : null}

                <FormField label="First name" required error={errors.firstName}>
                  <Input
                    variant="ui"
                    type="text"
                    placeholder="First name"
                    value={form.firstName}
                    onChange={(event) => update("firstName", event.target.value)}
                    autoComplete="given-name"
                    autoFocus
                  />
                </FormField>

                <FormField label="Last name" required error={errors.lastName}>
                  <Input
                    variant="ui"
                    type="text"
                    placeholder="Last name"
                    value={form.lastName}
                    onChange={(event) => update("lastName", event.target.value)}
                    autoComplete="family-name"
                  />
                </FormField>

                {showCompanyFields ? (
                  <FormField
                    label="Company name"
                    required
                    error={errors.companyName}
                    hint=""
                  >
                    <Input
                      variant="ui"
                      type="text"
                      placeholder="Company name"
                      value={form.companyName}
                      onChange={(event) => update("companyName", event.target.value)}
                    />
                  </FormField>
                ) : null}

                <FormField
                  label="Email"
                  required
                  error={errors.email}
                  className={showCompanyFields ? undefined : "project-modal__field--full"}
                >
                  <Input
                    variant="ui"
                    type="email"
                    placeholder="Email"
                    value={form.email}
                    onChange={(event) => update("email", event.target.value)}
                    autoComplete="email"
                  />
                </FormField>

                <FormField label="Role" required>
                  <Select
                    value={form.role}
                    options={ROLE_OPTIONS}
                    onChange={(value) => update("role", value as AdminUserFormState["role"])}
                    floatingMenu
                  />
                </FormField>

                <FormField label="Phone code">
                  <Input
                    variant="ui"
                    type="text"
                    placeholder="+61"
                    value={form.phoneCode}
                    onChange={(event) => update("phoneCode", event.target.value)}
                  />
                </FormField>

                <FormField label="Phone number">
                  <Input
                    variant="ui"
                    type="tel"
                    placeholder="Phone number"
                    value={form.phoneNumber}
                    onChange={(event) => update("phoneNumber", event.target.value)}
                  />
                </FormField>

                <FormField
                  label={isEditing ? "New password" : "Password"}
                  required={!isEditing}
                  error={errors.password}
                  hint={isEditing ? "Leave blank to keep the current password." : "Minimum 8 characters."}
                  className="project-modal__field--full"
                >
                  <Input
                    variant="ui"
                    type="password"
                    placeholder={isEditing ? "Leave blank to keep current" : "Password"}
                    value={form.password}
                    onChange={(event) => update("password", event.target.value)}
                    autoComplete="new-password"
                  />
                </FormField>

                <div className="project-modal__field--full">
                  <div className="ui-field">
                    <span className="ui-field__label">Email verified</span>
                    <Toggle
                      checked={form.isEmailVerified}
                      onChange={(checked) => update("isEmailVerified", checked)}
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="project-modal__footer">
              <UiButton type="button" variant="ghost" onClick={onClose} disabled={submitting}>
                Cancel
              </UiButton>
              <UiButton type="submit" variant="primary" disabled={submitting}>
                {submitting ? "Submitting…" : isEditing ? "Save" : "Submit"}
              </UiButton>
            </div>
          </form>
        </div>
      </div>
    </ProjectModalPortal>
  );
}
