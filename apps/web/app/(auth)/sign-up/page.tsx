import Link from "next/link";
import { AuthForm } from "../../../components/auth-form";

export default function SignUpPage() {
  return (
    <main className="page auth-page">
      <section className="panel auth-panel">
        <p className="eyebrow">Create your account</p>
        <h1>Start your OpenHacker team</h1>
        <p className="muted">
          Create an account first, then choose the team URL your workspace will
          use.
        </p>
        <AuthForm mode="sign-up" />
        <p className="auth-switch">
          Already have an account? <Link href="/sign-in">Sign in</Link>
        </p>
      </section>
    </main>
  );
}
