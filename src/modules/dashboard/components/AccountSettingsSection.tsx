"use client";

import type { FormEvent } from "react";
import Image from "next/image";
import { useEffect, useId, useRef, useState } from "react";
import { useAuth } from "@/modules/auth/hooks/useAuth";
import { changePassword, updateProfile } from "@/modules/auth/services/authApi";
import type { AuthUser } from "@/modules/auth/types";
import { fileToCompanyLogoDataUrl } from "@/modules/super-admin/utils/userFormUtils";
import { FormField, Input, UiButton } from "@/shared/components/ui";
import { isEmptyTrimmed, requiredFieldMessage } from "@/shared/utils/formValidation";
import { showApiError, showApiSuccess } from "@/shared/utils/apiToast";

import { COMPANY_LOGO_PATH } from "../data/branding";

const PHOTO_ACCEPT = ".jpeg,.png,.jpg,.gif,.svg,image/*";
const PHOTO_MAX_MB = 2;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PASSWORD_PATTERN = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;

type ProfileFormErrors = Partial<
  Record<
    "firstName" | "lastName" | "email" | "companyName" | "currentPassword" | "newPassword" | "confirmPassword",
    string
  >
>;

type ProfileFormState = {
  firstName: string;
  lastName: string;
  email: string;
  companyName: string;
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
};

type ProfileFieldProps = Readonly<{
  label: string;
  value: string;
}>;

function ProfileField({ label, value }: ProfileFieldProps) {
  return (
    <div className="ui-field">
      <span className="ui-field__label">{label}</span>
      <p className="settings-account__value">{value}</p>
    </div>
  );
}

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

type PasswordFieldProps = Readonly<{
  id: string;
  label: string;
  value: string;
  placeholder: string;
  hint: string;
  error?: string;
  autoComplete?: string;
  onChange: (value: string) => void;
}>;

function PasswordField({
  id,
  label,
  value,
  placeholder,
  hint,
  error,
  autoComplete,
  onChange,
}: PasswordFieldProps) {
  const [visible, setVisible] = useState(false);

  return (
    <FormField label={label} htmlFor={id} hint={hint} error={error}>
      <div className="settings-account__password">
        <Input
          id={id}
          variant="ui"
          type={visible ? "text" : "password"}
          autoComplete={autoComplete}
          placeholder={placeholder}
          value={value}
          onChange={(event) => onChange(event.target.value)}
        />
        <button
          type="button"
          className="settings-account__password-toggle"
          aria-label={visible ? "Hide password" : "Show password"}
          onClick={() => setVisible((current) => !current)}
        >
          {visible ? <EyeOffIcon /> : <EyeIcon />}
        </button>
      </div>
    </FormField>
  );
}

function profileFromUser(user: AuthUser | null): ProfileFormState {
  return {
    firstName: user?.firstName?.trim() || "",
    lastName: user?.lastName?.trim() || "",
    email: user?.email?.trim() || "",
    companyName: user?.companyName?.trim() || "",
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  };
}

export function AccountSettingsSection() {
  const { user, setUser } = useAuth();
  const photoInputId = useId();
  const photoInputRef = useRef<HTMLInputElement>(null);
  const requiresCompanyName = user?.role === "user";

  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState(() => profileFromUser(user));
  const [form, setForm] = useState<ProfileFormState>(() => profileFromUser(user));
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [removeLogo, setRemoveLogo] = useState(false);
  const [errors, setErrors] = useState<ProfileFormErrors>({});

  useEffect(() => {
    if (isEditing) return;
    setProfile(profileFromUser(user));
  }, [user, isEditing]);

  useEffect(() => {
    if (!photoFile) {
      setPhotoPreview(null);
      return;
    }

    const objectUrl = URL.createObjectURL(photoFile);
    setPhotoPreview(objectUrl);

    return () => {
      URL.revokeObjectURL(objectUrl);
    };
  }, [photoFile]);

  const updateForm = <K extends keyof ProfileFormState>(key: K, value: ProfileFormState[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: undefined }));
  };

  const startEditing = () => {
    setForm(profileFromUser(user));
    setPhotoFile(null);
    setRemoveLogo(false);
    setErrors({});
    setIsEditing(true);
  };

  const cancelEditing = () => {
    setForm(profileFromUser(user));
    setPhotoFile(null);
    setRemoveLogo(false);
    setErrors({});
    setIsEditing(false);
  };

  const handlePhotoChange = (file: File | null) => {
    if (!file) {
      setPhotoFile(null);
      return;
    }

    if (file.size > PHOTO_MAX_MB * 1024 * 1024) {
      showApiError(new Error(`Image must be ${PHOTO_MAX_MB} MB or smaller.`), "Upload failed");
      return;
    }

    setRemoveLogo(false);
    setPhotoFile(file);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (saving) return;

    const nextErrors: ProfileFormErrors = {};
    const wantsPasswordChange = Boolean(
      form.currentPassword || form.newPassword || form.confirmPassword
    );

    if (isEmptyTrimmed(form.firstName)) {
      nextErrors.firstName = requiredFieldMessage("First name");
    }

    if (isEmptyTrimmed(form.lastName)) {
      nextErrors.lastName = requiredFieldMessage("Last name");
    }

    if (isEmptyTrimmed(form.email)) {
      nextErrors.email = requiredFieldMessage("Email");
    } else if (!EMAIL_PATTERN.test(form.email.trim())) {
      nextErrors.email = "Please enter a valid email address.";
    }

    if (requiresCompanyName && isEmptyTrimmed(form.companyName)) {
      nextErrors.companyName = requiredFieldMessage("Company name");
    }

    if (wantsPasswordChange) {
      if (isEmptyTrimmed(form.currentPassword)) {
        nextErrors.currentPassword = requiredFieldMessage("Current password");
      }
      if (isEmptyTrimmed(form.newPassword)) {
        nextErrors.newPassword = requiredFieldMessage("New password");
      } else if (!PASSWORD_PATTERN.test(form.newPassword)) {
        nextErrors.newPassword =
          "Must be at least 8 characters and include an uppercase letter, a lowercase letter, a number, and a special character.";
      }
      if (isEmptyTrimmed(form.confirmPassword)) {
        nextErrors.confirmPassword = requiredFieldMessage("Confirm password");
      } else if (form.newPassword !== form.confirmPassword) {
        nextErrors.confirmPassword = "Passwords do not match.";
      }
    }

    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setSaving(true);
    try {
      let companyLogoUrl: string | null | undefined;
      if (photoFile) {
        companyLogoUrl = await fileToCompanyLogoDataUrl(photoFile);
      } else if (removeLogo) {
        companyLogoUrl = null;
      }

      const result = await updateProfile({
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        email: form.email.trim(),
        companyName: form.companyName.trim() || null,
        ...(companyLogoUrl !== undefined ? { companyLogoUrl } : {}),
      });

      const savedUser = result.data?.user ?? null;
      if (savedUser) {
        setUser(savedUser);
        setProfile(profileFromUser(savedUser));
      }

      if (wantsPasswordChange) {
        try {
          const passwordResult = await changePassword({
            currentPassword: form.currentPassword,
            newPassword: form.newPassword,
            confirmPassword: form.confirmPassword,
          });
          showApiSuccess(passwordResult.message, "Password updated");
        } catch (err) {
          setForm((current) => ({
            ...current,
            currentPassword: "",
            newPassword: "",
            confirmPassword: "",
          }));
          setPhotoFile(null);
          setRemoveLogo(false);
          showApiError(err, "Profile saved, but the password could not be updated");
          return;
        }
      }

      setForm((current) => ({
        ...current,
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      }));
      setPhotoFile(null);
      setRemoveLogo(false);
      setErrors({});
      setIsEditing(false);
      showApiSuccess(result.message, "Profile updated");
    } catch (err) {
      showApiError(err, "Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  const savedLogoSrc = user?.companyLogoUrl?.trim() || COMPANY_LOGO_PATH;
  const photoSrc = photoPreview ?? (removeLogo ? COMPANY_LOGO_PATH : savedLogoSrc);
  const photoIsCustom = Boolean(photoPreview || (!removeLogo && user?.companyLogoUrl?.trim()));
  const photoLabel = "Profile photo";

  return (
    <div className="settings-section">
      <div className="settings-section__card settings-account">
        <div className="settings-section__card-header">
          <div className="settings-section__card-copy">
            <h2 className="settings-section__card-title">Personal Info</h2>
            <p className="settings-section__card-description">
              Update your personal details, company name, and profile photo here.
            </p>
          </div>

          {isEditing ? (
            <div className="settings-account__actions">
              <UiButton
                type="submit"
                form="account-profile-form"
                variant="primary"
                size="sm"
                disabled={saving}
              >
                {saving ? "Saving…" : "Save Profile"}
              </UiButton>
              <UiButton
                type="button"
                variant="outline"
                size="sm"
                className="settings-account__cancel"
                onClick={cancelEditing}
                disabled={saving}
              >
                Cancel Edit
              </UiButton>
            </div>
          ) : (
            <UiButton type="button" variant="outline" size="sm" onClick={startEditing}>
              Edit Profile
            </UiButton>
          )}
        </div>

        {isEditing ? (
          <form id="account-profile-form" className="settings-account__body" onSubmit={handleSubmit} noValidate>
            <div className="settings-account__grid settings-account__grid--edit">
              <FormField label="First Name" htmlFor="profile-first-name" required error={errors.firstName}>
                <Input
                  id="profile-first-name"
                  variant="ui"
                  autoComplete="given-name"
                  value={form.firstName}
                  onChange={(event) => updateForm("firstName", event.target.value)}
                />
              </FormField>

              <FormField label="Last Name" htmlFor="profile-last-name" required error={errors.lastName}>
                <Input
                  id="profile-last-name"
                  variant="ui"
                  autoComplete="family-name"
                  value={form.lastName}
                  onChange={(event) => updateForm("lastName", event.target.value)}
                />
              </FormField>

              <FormField
                label="Company Name"
                htmlFor="profile-company-name"
                required={requiresCompanyName}
                error={errors.companyName}
                className="settings-account__field--full"
              >
                <Input
                  id="profile-company-name"
                  variant="ui"
                  value={form.companyName}
                  onChange={(event) => updateForm("companyName", event.target.value)}
                />
              </FormField>

              <FormField
                label="Email"
                htmlFor="profile-email"
                required
                error={errors.email}
                className="settings-account__field--full"
              >
                <Input
                  id="profile-email"
                  variant="ui"
                  type="email"
                  autoComplete="email"
                  value={form.email}
                  onChange={(event) => updateForm("email", event.target.value)}
                />
              </FormField>

              <PasswordField
                id="profile-current-password"
                label="Current Password"
                value={form.currentPassword}
                placeholder="Enter current password"
                hint="Required only if you are changing your password"
                autoComplete="current-password"
                error={errors.currentPassword}
                onChange={(value) => updateForm("currentPassword", value)}
              />

              <PasswordField
                id="profile-new-password"
                label="New Password"
                value={form.newPassword}
                placeholder="Enter new password"
                hint="Must be at least 8 characters, with upper, lower, number, and special character"
                autoComplete="new-password"
                error={errors.newPassword}
                onChange={(value) => updateForm("newPassword", value)}
              />

              <PasswordField
                id="profile-confirm-password"
                label="Confirm Password"
                value={form.confirmPassword}
                placeholder="Confirm new password"
                hint="Repeat new password here"
                autoComplete="new-password"
                error={errors.confirmPassword}
                onChange={(value) => updateForm("confirmPassword", value)}
              />
            </div>

            <div className="settings-account__photo">
              <input
                ref={photoInputRef}
                id={photoInputId}
                type="file"
                accept={PHOTO_ACCEPT}
                className="settings-account__photo-input"
                onChange={(event) => handlePhotoChange(event.target.files?.[0] ?? null)}
              />
              <button
                type="button"
                className="settings-account__avatar settings-account__avatar--editable"
                aria-label="Upload profile photo"
                onClick={() => photoInputRef.current?.click()}
              >
                {photoIsCustom ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={photoSrc} alt={photoLabel} />
                ) : (
                  <Image
                    src={COMPANY_LOGO_PATH}
                    alt={photoLabel}
                    fill
                    sizes="88px"
                    style={{ objectFit: "cover" }}
                  />
                )}
              </button>
              <p className="settings-account__photo-label">{photoLabel}</p>
              <p className="ui-field__hint">
                Click the image to upload. Allowed: .jpeg, .png, .jpg, .gif, .svg. Max {PHOTO_MAX_MB} MB.
              </p>
              {photoIsCustom ? (
                <UiButton
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setPhotoFile(null);
                    setRemoveLogo(true);
                    if (photoInputRef.current) photoInputRef.current.value = "";
                  }}
                >
                  Remove photo
                </UiButton>
              ) : null}
            </div>
          </form>
        ) : (
          <div className="settings-account__body">
            <div className="settings-account__grid">
              <ProfileField label="First Name" value={profile.firstName} />
              <ProfileField label="Last Name" value={profile.lastName} />
              <ProfileField label="Company Name" value={profile.companyName || "—"} />
              <ProfileField label="Email" value={profile.email} />
            </div>

            <div className="settings-account__photo">
              <div className="settings-account__avatar">
                {user?.companyLogoUrl?.trim() ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={user.companyLogoUrl} alt={photoLabel} />
                ) : (
                  <Image
                    src={COMPANY_LOGO_PATH}
                    alt={photoLabel}
                    fill
                    sizes="88px"
                    style={{ objectFit: "cover" }}
                  />
                )}
              </div>
              <p className="settings-account__photo-label">{photoLabel}</p>
              <p className="ui-field__hint">Shown on your account and profile menu.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
