"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import toast from "react-hot-toast";
import { Button } from "@/shared/components/ui/Button";
import { Input } from "@/shared/components/ui/Input";
import { Label } from "@/shared/components/ui/Label";
import { ApiError } from "@/shared/services/apiClient";
import { resetPassword } from "../services/authApi";

const PASSWORD_PATTERN = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()\-_=+[\]{};':"\\|,.<>/?`~]).+$/;
const PASSWORD_MIN_LENGTH = 8;

export function ResetPasswordForm({ token }: { token: string }) {
    const router = useRouter();
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [passwordError, setPasswordError] = useState<string | null>(null);
    const [confirmError, setConfirmError] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    function validate(): boolean {
        let valid = true;

        if (!password) {
            setPasswordError("Password is required.");
            valid = false;
        } else if (password.length < PASSWORD_MIN_LENGTH) {
            setPasswordError(`Password must be at least ${PASSWORD_MIN_LENGTH} characters.`);
            valid = false;
        } else if (!PASSWORD_PATTERN.test(password)) {
            setPasswordError(
                "Password must contain an uppercase letter, a lowercase letter, a number, and a special character."
            );
            valid = false;
        } else {
            setPasswordError(null);
        }

        if (!confirmPassword) {
            setConfirmError("Please confirm your password.");
            valid = false;
        } else if (password !== confirmPassword) {
            setConfirmError("Passwords do not match.");
            valid = false;
        } else {
            setConfirmError(null);
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
            await resetPassword(token, password, confirmPassword);
            router.push("/password-changed");
        } catch (err) {
            toast.error(err instanceof ApiError ? err.message : "Unable to reset password. Please try again.");
        } finally {
            setIsSubmitting(false);
        }
    }

    return (
        <form onSubmit={handleSubmit}>
            <div className="form-group">
                <Label htmlFor="reset-password">New Password</Label>
                <Input
                    id="reset-password"
                    name="password"
                    type="password"
                    autoComplete="new-password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(ev) => setPassword(ev.target.value)}
                />
                {passwordError ? (
                    <p className="field-error">{passwordError}</p>
                ) : null}
            </div>

            <div className="form-group mb-0">
                <Label htmlFor="reset-confirm-password">Confirm New Password</Label>
                <Input
                    id="reset-confirm-password"
                    name="confirmPassword"
                    type="password"
                    autoComplete="new-password"
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(ev) => setConfirmPassword(ev.target.value)}
                />
                {confirmError ? (
                    <p className="field-error">{confirmError}</p>
                ) : null}
            </div>

            <Button type="submit" fullWidth className="mt-4" disabled={isSubmitting}>
                {isSubmitting ? "Resetting..." : "Reset Password"}
            </Button>
        </form>
    );
}
