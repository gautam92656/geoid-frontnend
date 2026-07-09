import Link from "next/link";

export default function PasswordChangedPage() {
  return (
    <div className="auth-panel check-email-card">
      <div className="auth-panel__header">
        <h2>Password updated</h2>
      </div>

      <p className="check-email-sent">
        Your password has been reset successfully. <br />
        You can now sign in with your new password.
      </p>

      <Link href="/login" className="btns w-100 d-flex justify-content-center">
        Back to Sign In
      </Link>
    </div>
  );
}
