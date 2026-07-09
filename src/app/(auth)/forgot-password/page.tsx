import Link from "next/link";
import { ForgotPasswordForm } from "@/modules/auth";

export default function ForgotPasswordPage() {
  return (
    <div className="auth-panel">
      <div className="auth-panel__header">
        <h2>Forgot Password?</h2>
        <p>No worries, we&apos;ll send you reset instructions</p>
      </div>

      <ForgotPasswordForm />

      <p className="auth-panel__back">
        <Link href="/login">← Back to Sign In</Link>
      </p>
    </div>
  );
}
