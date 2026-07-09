import Link from "next/link";

interface CheckEmailPageProps {
  searchParams: Promise<{ email?: string }>;
}

export default async function CheckEmailPage({ searchParams }: CheckEmailPageProps) {
  const { email } = await searchParams;

  return (
    <div className="auth-panel check-email-card">
      <div className="auth-panel__header">
        <h2>Check your email</h2>
      </div>

      <p className="check-email-sent">
        We&apos;ve sent password reset instructions to <br />
        <strong>{email ?? "your email address"}</strong>
      </p>

      <div className="check-email-hint">
        <p>
          Didn&apos;t receive the email? Check your spam folder or <br />
          <Link href="/forgot-password">try another email address</Link>
        </p>
      </div>

      <Link href="/login" className="btns w-100 d-flex justify-content-center">
        Back to Sign In
      </Link>
    </div>
  );
}
