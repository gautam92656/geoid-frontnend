import type { Metadata } from "next";
import Link from "next/link";
import { RegisterForm } from "@/modules/auth";

export const metadata: Metadata = {
  title: "Get Started",
  description: "Create your account and start your free trial.",
};

export default function RegisterPage() {
  return (
    <div className="auth-panel">
      <div className="auth-panel__header">
        <h2>Get Started Today</h2>
        <p>Create your account to start your free trial</p>
      </div>

      <RegisterForm />

      <p className="auth-panel__back">
        <Link href="/">← Back to Home</Link>
      </p>
    </div>
  );
}
