"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/shared/components/ui/Button";
import { Input } from "@/shared/components/ui/Input";
import { Label } from "@/shared/components/ui/Label";
import { API_ERROR_MESSAGES } from "@/shared/constants/apiMessages";
import { showApiError, showApiSuccess } from "@/shared/utils/apiToast";
import { forgotPassword } from "../services/authApi";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function ForgotPasswordForm() {
    const router = useRouter();
    const [email, setEmail] = useState("");
    const [emailError, setEmailError] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    function validate(): boolean {
        const trimmedEmail = email.trim();

        if (!trimmedEmail) {
            setEmailError("Email address is required.");
            return false;
        }

        if (!EMAIL_REGEX.test(trimmedEmail)) {
            setEmailError("Please enter a valid email address.");
            return false;
        }

        setEmailError(null);
        return true;
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();

        if (!validate()) {
            return;
        }

        setIsSubmitting(true);
        try {
            const trimmedEmail = email.trim();
            const { data: result, message } = await forgotPassword(trimmedEmail);
            showApiSuccess(message ?? result.message, "Reset link sent.");
            router.push(`/reset-password?email=${encodeURIComponent(trimmedEmail)}`);
        } catch (err) {
            showApiError(err, API_ERROR_MESSAGES.FORGOT_PASSWORD);
        } finally {
            setIsSubmitting(false);
        }
    }

    return (
        <form onSubmit={handleSubmit}>
            <div className="form-group mb-0">
                <Label htmlFor="forgot-email">Email Address</Label>
                <Input
                    id="forgot-email"
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

            <Button type="submit" fullWidth className="mt-4" disabled={isSubmitting}>
                {isSubmitting ? "Sending..." : "Send Reset Link"}
            </Button>

            <p className="text-center auth-bottom-link">
                Remember it?{" "}
                <Link href="/login">Back to Sign in</Link>
            </p>
        </form>
    );
}
