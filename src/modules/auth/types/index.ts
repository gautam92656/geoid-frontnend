export type LoginCredentials = {
  email: string;
  password: string;
};

export type AuthUser = {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  phoneCode: string | null;
  phoneNumber: string | null;
  termsAndConditions: boolean;
  isEmailVerified: boolean;
  role: "user" | "super_admin";
  companyName: string | null;
  companyLogoUrl: string | null;
  createdAt: string;
  updatedAt: string;
};

export type LoginSuccessResponse = {
  token: string;
  user: AuthUser;
};

export type LoginUnverifiedResponse = {
  message: string;
  email: string;
  otpSent: true;
};

export type LoginResponse = LoginSuccessResponse | LoginUnverifiedResponse;

export type RegisterPayload = {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  confirmPassword: string;
  termsAndConditions: boolean;
};

export type RegisterResponse = {
  message: string;
  email: string;
};

export type VerifyOtpResponse = {
  message: string;
  email: string;
  isEmailVerified: boolean;
  token: string;
  user: AuthUser;
};

export type ForgotPasswordResponse = {
  message: string;
  email: string;
};

export type ResetPasswordResponse = {
  message: string;
  email: string;
};

export type ChangePasswordPayload = {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
};

export type ChangePasswordResponse = {
  message: string;
};

export type ResendOtpPayload = {
  email: string;
  otpType: "register" | "forgot_password";
};

export type ResendOtpResponse = {
  message: string;
  email: string;
};
