"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { ApiError } from "@/shared/services/apiClient";
import { verifyResetToken } from "../services/authApi";
import { ResetPasswordForm } from "./ResetPasswordForm";

type TokenStatus = "checking" | "valid" | "invalid";

export function ResetPasswordScreen() {
    const searchParams = useSearchParams();
    const token = searchParams.get("token") ?? "";
    const [status, setStatus] = useState<TokenStatus>("checking");

    useEffect(() => {
        if (!token) {
            setStatus("invalid");
            return;
        }

        let cancelled = false;
        verifyResetToken(token)
            .then(() => {
                if (!cancelled) setStatus("valid");
            })
            .catch((err) => {
                if (cancelled) return;
                setStatus("invalid");
                if (!(err instanceof ApiError)) {
                    console.error(err);
                }
            });

        return () => {
            cancelled = true;
        };
    }, [token]);

    if (status === "checking") {
        return (
            <div className="auth-panel">
                <div className="auth-panel__header">
                    <h2>Verifying link…</h2>
                    <p>Please wait while we verify your password reset link.</p>
                </div>
            </div>
        );
    }

    if (status === "invalid") {
        return (
            <div className="auth-panel">
                <div className="auth-panel__header">
                    <h2>Link expired or invalid</h2>
                    <p>This password reset link is no longer valid. Please request a new one.</p>
                </div>

                <Link href="/forgot-password" className="btns w-100 d-flex justify-content-center">
                    Request a new link
                </Link>
            </div>
        );
    }

    return (
        <div className="auth-panel">
            <div className="auth-panel__header">
                <h2>Set a new password</h2>
                <p>Choose a strong password for your account</p>
            </div>

            <ResetPasswordForm token={token} />
        </div>
    );
}
