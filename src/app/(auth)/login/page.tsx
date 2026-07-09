import type { Metadata } from "next";
import Link from "next/link";
import { LoginForm } from "@/modules/auth";

export const metadata: Metadata = {
  title: "Sign In",
  description: "Sign in to your borehole logging account.",
};

export default function LoginPage() {
  return (
    <div className="auth-panel">
      <div className="auth-panel__header">
        <h2>Welcome Back</h2>
        <p>Sign in to your account</p>
      </div>

      <LoginForm />

      <p className="auth-panel__back">
        <Link href="/">← Back to Home</Link>
      </p>
    </div>
  );
}
