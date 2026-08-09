"use client";

import type { FormEvent } from "react";
import Image from "next/image";
import { useEffect, useId, useRef, useState } from "react";
import { FormField, Input, UiButton } from "@/shared/components/ui";
import { isEmptyTrimmed, requiredFieldMessage } from "@/shared/utils/formValidation";
import { useAppSelector } from "@/store/hooks";

import { COMPANY_LOGO_PATH } from "../data/branding";
const PHOTO_ACCEPT = ".jpeg,.png,.jpg,.gif,.svg,image/*";
const PHOTO_MAX_MB = 2;

const DEFAULT_PROFILE = {
  firstName: "Geo",
  lastName: "ID",
  email: "info@geoid.com.au",
  roles: "Supervisor Access, Company Administrator",
  groups: "ALL STAFF",
};

type ProfileFormErrors = Partial<Record<"firstName" | "lastName" | "email", string>>;

type ProfileFormState = {
  firstName: string;
  lastName: string;
  email: string;
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
  onChange: (value: string) => void;
}>;

function PasswordField({ id, label, value, placeholder, hint, onChange }: PasswordFieldProps) {
  const [visible, setVisible] = useState(false);

  return (
    <FormField label={label} htmlFor={id} hint={hint}>
      <div className="settings-account__password">
        <Input
          id={id}
          variant="ui"
          type={visible ? "text" : "password"}
          autoComplete="new-password"
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

function buildFormState(
  firstName: string,
  lastName: string,
  email: string
): ProfileFormState {
  return {
    firstName,
    lastName,
    email,
    newPassword: "",
    confirmPassword: "",
  };
}

export function AccountSettingsSection() {
  const { user } = useAppSelector((s) => s.auth);
  const photoInputId = useId();
  const photoInputRef = useRef<HTMLInputElement>(null);

  const [isEditing, setIsEditing] = useState(false);
  const [profile, setProfile] = useState({
    firstName: user?.firstName?.trim() || DEFAULT_PROFILE.firstName,
    lastName: user?.lastName?.trim() || DEFAULT_PROFILE.lastName,
    email: user?.email?.trim() || DEFAULT_PROFILE.email,
  });
  const [form, setForm] = useState<ProfileFormState>(() =>
    buildFormState(profile.firstName, profile.lastName, profile.email)
  );
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [errors, setErrors] = useState<ProfileFormErrors>({});

  const roles = DEFAULT_PROFILE.roles;
  const groups = DEFAULT_PROFILE.groups;

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
    if (key === "firstName" || key === "lastName" || key === "email") {
      setErrors((current) => ({ ...current, [key]: undefined }));
    }
  };

  const startEditing = () => {
    setForm(buildFormState(profile.firstName, profile.lastName, profile.email));
    setPhotoFile(null);
    setErrors({});
    setIsEditing(true);
  };

  const cancelEditing = () => {
    setForm(buildFormState(profile.firstName, profile.lastName, profile.email));
    setPhotoFile(null);
    setErrors({});
    setIsEditing(false);
  };

  const handlePhotoChange = (file: File | null) => {
    if (!file) {
      setPhotoFile(null);
      return;
    }

    if (file.size > PHOTO_MAX_MB * 1024 * 1024) {
      return;
    }

    setPhotoFile(file);
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const nextErrors: ProfileFormErrors = {};

    if (isEmptyTrimmed(form.firstName)) {
      nextErrors.firstName = requiredFieldMessage("First name");
    }

    if (isEmptyTrimmed(form.lastName)) {
      nextErrors.lastName = requiredFieldMessage("Last name");
    }

    if (isEmptyTrimmed(form.email)) {
      nextErrors.email = requiredFieldMessage("Email");
    }

    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setProfile({
      firstName: form.firstName.trim(),
      lastName: form.lastName.trim(),
      email: form.email.trim(),
    });
    setForm((current) => ({ ...current, newPassword: "", confirmPassword: "" }));
    setErrors({});
    setIsEditing(false);
  };

  const photoSrc = photoPreview ?? COMPANY_LOGO_PATH;

  return (
    <div className="settings-section">
      <div className="settings-section__card settings-account">
        <div className="settings-section__card-header">
          <div className="settings-section__card-copy">
            <h2 className="settings-section__card-title">Personal Info</h2>
            <p className="settings-section__card-description">
              Update your photo and personal details here.
            </p>
          </div>

          {isEditing ? (
            <div className="settings-account__actions">
              <UiButton type="submit" form="account-profile-form" variant="primary" size="sm">
                Save Profile
              </UiButton>
              <UiButton
                type="button"
                variant="outline"
                size="sm"
                className="settings-account__cancel"
                onClick={cancelEditing}
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
                  value={form.firstName}
                  onChange={(event) => updateForm("firstName", event.target.value)}
                />
              </FormField>

              <FormField label="Last Name" htmlFor="profile-last-name" required error={errors.lastName}>
                <Input
                  id="profile-last-name"
                  variant="ui"
                  value={form.lastName}
                  onChange={(event) => updateForm("lastName", event.target.value)}
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
                id="profile-new-password"
                label="New Password"
                value={form.newPassword}
                placeholder="Enter new password"
                hint="Must be at least 8 characters"
                onChange={(value) => updateForm("newPassword", value)}
              />

              <PasswordField
                id="profile-confirm-password"
                label="Confirm Password"
                value={form.confirmPassword}
                placeholder="Confirm new password"
                hint="Repeat new password here"
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
                <Image src={photoSrc} alt="Profile photo" width={72} height={72} unoptimized={!!photoPreview} />
              </button>
              <p className="settings-account__photo-label">Your photo</p>
              <p className="ui-field__hint">
                Click the image to upload. Allowed: .jpeg, .png, .jpg, .gif, .svg. Max {PHOTO_MAX_MB} MB.
              </p>
            </div>
          </form>
        ) : (
          <div className="settings-account__body">
            <div className="settings-account__grid">
              <ProfileField label="First Name" value={profile.firstName} />
              <ProfileField label="Last Name" value={profile.lastName} />
              <ProfileField label="Email" value={profile.email} />
              <ProfileField label="Roles" value={roles} />
              <ProfileField label="Groups" value={groups} />
            </div>

            <div className="settings-account__photo">
              <div className="settings-account__avatar">
                <Image src={COMPANY_LOGO_PATH} alt="Profile photo" width={72} height={72} />
              </div>
              <p className="settings-account__photo-label">Your photo</p>
              <p className="ui-field__hint">This will be displayed on your profile.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
