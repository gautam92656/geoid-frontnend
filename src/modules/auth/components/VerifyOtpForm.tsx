"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import toast from "react-hot-toast";
import { useAppDispatch } from "@/store/hooks";
import { login } from "@/store/slices/authSlice";
import { Button } from "@/shared/components/ui/Button";
import { Input } from "@/shared/components/ui/Input";
import { Label } from "@/shared/components/ui/Label";
import { ApiError } from "@/shared/services/apiClient";
import { verifyOtp } from "../services/authApi";

type VerifyOtpFormProps = {
    email: string;
};

export function VerifyOtpForm({ email }: VerifyOtpFormProps) {
    const router = useRouter();
    const dispatch = useAppDispatch();
    const [otpCode, setOtpCode] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setError(null);

        if (!otpCode.trim()) {
            setError("Please enter the verification code.");
            return;
        }

        setSubmitting(true);
        try {
            const result = await verifyOtp(email, otpCode.trim());
            dispatch(login({ token: result.token, user: result.user }));
            toast.success("Account verified successfully.");
            router.push("/");
        } catch (err) {
            setError(err instanceof ApiError ? err.message : "Unable to verify code. Please try again.");
        } finally {
            setSubmitting(false);
        }
    }

    return (
        <form onSubmit={handleSubmit}>
            <div className="form-group">
                <Label htmlFor="otp-code">Verification Code</Label>
                <Input
                    id="otp-code"
                    name="otpCode"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    placeholder="Enter the code sent to your email"
                    value={otpCode}
                    onChange={(ev) => setOtpCode(ev.target.value)}
                />
            </div>

            {error ? (
                <p className="text-sm text-red-600 mb-3">{error}</p>
            ) : null}

            <Button type="submit" fullWidth disabled={submitting}>
                {submitting ? "Verifying..." : "Verify Account"}
            </Button>
        </form>
    );
}
