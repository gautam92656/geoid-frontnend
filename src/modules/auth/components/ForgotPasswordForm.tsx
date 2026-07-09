"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import toast from "react-hot-toast";
import { Button } from "@/shared/components/ui/Button";
import { Input } from "@/shared/components/ui/Input";
import { Label } from "@/shared/components/ui/Label";
import { ApiError } from "@/shared/services/apiClient";
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
            await forgotPassword(trimmedEmail);
            router.push(`/check-email?email=${encodeURIComponent(trimmedEmail)}`);
        } catch (err) {
            toast.error(err instanceof ApiError ? err.message : "Unable to send reset link. Please try again.");
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
