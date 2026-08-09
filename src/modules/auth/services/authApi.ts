import apiClient from "@/shared/services/apiClient";
import { extractApiMessage } from "@/shared/utils/apiMessage";
import type { ApiEnvelope, MutationResult } from "@/shared/types/api";
import type {
  ChangePasswordPayload,
  ChangePasswordResponse,
  ForgotPasswordResponse,
  LoginCredentials,
  LoginResponse,
  LoginUnverifiedResponse,
  RegisterPayload,
  RegisterResponse,
  ResendOtpPayload,
  ResendOtpResponse,
  ResetPasswordResponse,
  VerifyOtpResponse,
} from "../types";

function resolveMessage<T>(envelope: ApiEnvelope<T>): string | undefined {
  return extractApiMessage(envelope);
}

export async function loginUser(
  credentials: LoginCredentials
): Promise<MutationResult<LoginResponse>> {
  const res = await apiClient.post<ApiEnvelope<LoginResponse>>("/auth/login", credentials);
  return { data: res.data.data, message: resolveMessage(res.data) };
}

export async function registerUser(
  payload: RegisterPayload
): Promise<MutationResult<RegisterResponse>> {
  const res = await apiClient.post<ApiEnvelope<RegisterResponse>>("/auth/signup", payload);
  return { data: res.data.data, message: resolveMessage(res.data) };
}

export async function verifyOtp(
  email: string,
  otpCode: string
): Promise<MutationResult<VerifyOtpResponse>> {
  const res = await apiClient.post<ApiEnvelope<VerifyOtpResponse>>("/auth/verify-otp", {
    email,
    otpCode,
  });
  return { data: res.data.data, message: resolveMessage(res.data) };
}

export async function resendOtp(
  payload: ResendOtpPayload
): Promise<MutationResult<ResendOtpResponse>> {
  const res = await apiClient.post<ApiEnvelope<ResendOtpResponse>>("/auth/resend-otp", payload);
  return { data: res.data.data, message: resolveMessage(res.data) };
}

export function isUnverifiedLoginResponse(
  response: LoginResponse
): response is LoginUnverifiedResponse {
  return "otpSent" in response && response.otpSent === true;
}

export async function forgotPassword(
  email: string
): Promise<MutationResult<ForgotPasswordResponse>> {
  const res = await apiClient.post<ApiEnvelope<ForgotPasswordResponse>>("/auth/forgot-password", {
    email,
  });
  return { data: res.data.data, message: resolveMessage(res.data) };
}

export async function resetPassword(
  email: string,
  newPassword: string,
  confirmPassword: string
): Promise<MutationResult<ResetPasswordResponse>> {
  const res = await apiClient.post<ApiEnvelope<ResetPasswordResponse>>("/auth/reset-password", {
    email,
    newPassword,
    confirmPassword,
  });
  return { data: res.data.data, message: resolveMessage(res.data) };
}

export async function changePassword(
  payload: ChangePasswordPayload
): Promise<MutationResult<ChangePasswordResponse>> {
  const res = await apiClient.post<ApiEnvelope<ChangePasswordResponse>>(
    "/auth/change-password",
    payload
  );
  return { data: res.data.data, message: resolveMessage(res.data) };
}

export type UpdateProfilePayload = {
  companyLogoUrl?: string | null;
  companyName?: string | null;
};

export type UpdateProfileResponse = {
  message: string;
  user: import("../types").AuthUser;
};

export async function updateProfile(
  payload: UpdateProfilePayload
): Promise<MutationResult<UpdateProfileResponse>> {
  const res = await apiClient.patch<ApiEnvelope<UpdateProfileResponse>>("/auth/profile", payload);
  return { data: res.data.data, message: resolveMessage(res.data) };
}
