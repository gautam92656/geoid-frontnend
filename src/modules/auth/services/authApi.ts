import apiClient from "@/shared/services/apiClient";
import type {
  ForgotPasswordResponse,
  LoginCredentials,
  LoginResponse,
  LoginUnverifiedResponse,
  RegisterPayload,
  RegisterResponse,
  ResetPasswordResponse,
  VerifyOtpResponse,
  VerifyResetTokenResponse,
} from "../types";

export async function loginUser(credentials: LoginCredentials): Promise<LoginResponse> {
  const res = await apiClient.post<{ data: LoginResponse }>("/auth/login", credentials);
  return res.data.data;
}

export async function registerUser(payload: RegisterPayload): Promise<RegisterResponse> {
  const res = await apiClient.post<{ data: RegisterResponse }>("/auth/signup", payload);
  return res.data.data;
}

export async function verifyOtp(email: string, otpCode: string): Promise<VerifyOtpResponse> {
  const res = await apiClient.post<{ data: VerifyOtpResponse }>("/auth/verify-otp", {
    email,
    otpCode,
  });
  return res.data.data;
}

export function isUnverifiedLoginResponse(
  response: LoginResponse
): response is LoginUnverifiedResponse {
  return "otpSent" in response && response.otpSent === true;
}

export async function forgotPassword(email: string): Promise<ForgotPasswordResponse> {
  const res = await apiClient.post<{ data: ForgotPasswordResponse }>("/auth/forgot-password", { email });
  return res.data.data;
}

export async function verifyResetToken(token: string): Promise<VerifyResetTokenResponse> {
  const res = await apiClient.post<{ data: VerifyResetTokenResponse }>("/auth/verify-reset-token", { token });
  return res.data.data;
}

export async function resetPassword(
  token: string,
  newPassword: string,
  confirmPassword: string
): Promise<ResetPasswordResponse> {
  const res = await apiClient.post<{ data: ResetPasswordResponse }>("/auth/reset-password", {
    token,
    newPassword,
    confirmPassword,
  });
  return res.data.data;
}
