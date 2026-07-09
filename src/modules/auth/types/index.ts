export type LoginCredentials = {
  email: string;
  password: string;
};

export type AuthUser = {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  isEmailVerified: boolean;
  isOnboardingComplete: boolean;
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

export type UserRole = "PENDANT_OWNER" | "COMMUNITY_USER" | "BOTH";

export type RegisterPayload = {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  confirmPassword: string;
  role: UserRole;
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

export type VerifyResetTokenResponse = {
  message: string;
  valid: boolean;
};

export type ResetPasswordResponse = {
  message: string;
};
