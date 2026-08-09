"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useAppDispatch } from "@/store/hooks";
import { login } from "@/store/slices/authSlice";
import { Button } from "@/shared/components/ui/Button";
import { Input } from "@/shared/components/ui/Input";
import { Label } from "@/shared/components/ui/Label";
import { API_ERROR_MESSAGES } from "@/shared/constants/apiMessages";
import { showApiError, showApiSuccess } from "@/shared/utils/apiToast";
import { isUnverifiedLoginResponse, loginUser } from "../services/authApi";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function LoginForm() {
    const router = useRouter();
    const dispatch = useAppDispatch();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [emailError, setEmailError] = useState<string | null>(null);
    const [passwordError, setPasswordError] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    function validate(): boolean {
        let valid = true;
        const trimmedEmail = email.trim();

        if (!trimmedEmail) {
            setEmailError("Email address is required.");
            valid = false;
        } else if (!EMAIL_REGEX.test(trimmedEmail)) {
            setEmailError("Please enter a valid email address.");
            valid = false;
        } else {
            setEmailError(null);
        }

        if (!password) {
            setPasswordError("Password is required.");
            valid = false;
        } else {
            setPasswordError(null);
        }

        return valid;
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();

        if (!validate()) {
            return;
        }

        setIsSubmitting(true);
        try {
            const { data: result, message } = await loginUser({ email: email.trim(), password });

            if (isUnverifiedLoginResponse(result)) {
                showApiSuccess(message ?? result.message, "Verification code sent.");
                router.push(`/check-email?email=${encodeURIComponent(result.email)}`);
                return;
            }

            dispatch(login({ token: result.token, user: result.user }));
            router.push("/dashboard");
        } catch (err) {
            showApiError(err, API_ERROR_MESSAGES.SIGN_IN);
        } finally {
            setIsSubmitting(false);
        }
    }

    return (
        <form onSubmit={handleSubmit}>
            <div className="form-group">
                <Label htmlFor="login-email">Email Address</Label>
                <Input
                    id="login-email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    placeholder="your.email@example.com"
                    value={email}
                    onChange={(ev) => setEmail(ev.target.value)}
                />
                {emailError ? (
                    <p className="field-error">{emailError}</p>
                ) : null}
            </div>

            <div className="form-group mb-0">
                <Label htmlFor="login-password">Password</Label>
                <Input
                    id="login-password"
                    name="password"
                    type="password"
                    autoComplete="current-password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(ev) => setPassword(ev.target.value)}
                />
                {passwordError ? (
                    <p className="field-error">{passwordError}</p>
                ) : null}
            </div>

            <div className="forgot-link">
                <Link href="/forgot-password">
                    Forgot password?
                </Link>
            </div>

            <Button type="submit" fullWidth disabled={isSubmitting}>
                {isSubmitting ? "Signing In..." : "Sign In"}
            </Button>

            {/* <p className="text-center auth-bottom-link">Don&apos;t have an account?{" "} <Link href="/register">Sign up</Link></p> */}
        </form>
    );
}
