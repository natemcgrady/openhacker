"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "../lib/auth-client";

type AuthMode = "sign-in" | "sign-up";

type AuthFormProps = {
  mode: AuthMode;
};

export function AuthForm({ mode }: AuthFormProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isSignUp = mode === "sign-up";

  async function onSubmit(formData: FormData) {
    setError(null);
    setIsSubmitting(true);

    const email = String(formData.get("email") ?? "");
    const password = String(formData.get("password") ?? "");
    const name = String(formData.get("name") ?? "");

    const response = isSignUp
      ? await authClient.signUp.email({ email, password, name })
      : await authClient.signIn.email({ email, password });

    setIsSubmitting(false);

    if (response.error) {
      setError(response.error.message ?? "Something went wrong.");
      return;
    }

    router.push(isSignUp ? "/new-team" : "/post-sign-in");
    router.refresh();
  }

  return (
    <form action={onSubmit} className="auth-form">
      {isSignUp ? (
        <label>
          <span>Name</span>
          <input name="name" autoComplete="name" required minLength={2} />
        </label>
      ) : null}
      <label>
        <span>Email</span>
        <input name="email" type="email" autoComplete="email" required />
      </label>
      <label>
        <span>Password</span>
        <input
          name="password"
          type="password"
          autoComplete={isSignUp ? "new-password" : "current-password"}
          required
          minLength={8}
        />
      </label>
      {error ? <p className="form-error">{error}</p> : null}
      <button className="button primary" disabled={isSubmitting} type="submit">
        {isSubmitting
          ? "Working..."
          : isSignUp
            ? "Create account"
            : "Sign in"}
      </button>
    </form>
  );
}
