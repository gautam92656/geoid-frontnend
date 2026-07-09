import Link from "next/link";
import { VerifyOtpForm } from "@/modules/auth";

interface VerifyAccountPageProps {
  searchParams: Promise<{ email?: string }>;
}

export default async function VerifyAccountPage({ searchParams }: VerifyAccountPageProps) {
  const { email } = await searchParams;

  return (
    <div className="auth-panel">
      <div className="auth-panel__header">
        <h2>Verify your account</h2>
        <p>
          We&apos;ve sent a verification code to <strong>{email ?? "your email address"}</strong>
        </p>
      </div>

      <VerifyOtpForm email={email ?? ""} />

      <p className="auth-panel__back">
        <Link href="/login">← Back to Sign In</Link>
      </p>
    </div>
  );
}
