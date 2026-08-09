"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ResetPasswordForm } from "./ResetPasswordForm";

export function ResetPasswordScreen() {
    const searchParams = useSearchParams();
    const email = searchParams.get("email")?.trim() ?? "";

    if (!email) {
        return (
            <div className="auth-panel">
                <div className="auth-panel__header">
                    <h2>Email required</h2>
                    <p>Please start the password reset flow from the forgot password page.</p>
                </div>

                <Link href="/forgot-password" className="btns w-100 d-flex justify-content-center">
                    Request a reset code
                </Link>
            </div>
        );
    }

    return (
        <div className="auth-panel">
            <div className="auth-panel__header">
                <h2>Set a new password</h2>
                <p>
                    Enter a new password for <strong>{email}</strong>
                </p>
            </div>

            <ResetPasswordForm email={email} />
        </div>
    );
}
