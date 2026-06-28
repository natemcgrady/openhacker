import Link from "next/link";
import { AuthForm } from "../../../components/auth-form";

export default function SignInPage() {
  return (
    <main className="page auth-page">
      <section className="panel auth-panel">
        <p className="eyebrow">Welcome back</p>
        <h1>Sign in to OpenHacker</h1>
        <p className="muted">
          Pick up where your team left off and get back to the security work.
        </p>
        <AuthForm mode="sign-in" />
        <p className="auth-switch">
          New here? <Link href="/sign-up">Create an account</Link>
        </p>
      </section>
    </main>
  );
}
