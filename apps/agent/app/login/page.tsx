import { authEnabled } from "@/agent/lib/auth";
import { login } from "../actions";

export const dynamic = "force-dynamic";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; next?: string }>;
}) {
  const { error, next } = await searchParams;

  return (
    <main className="container">
      <div className="login-wrap">
        <h1>
          open<span style={{ color: "var(--accent)" }}>hacker</span>
        </h1>
        <p className="sub">Sign in to your instance.</p>

        {!authEnabled() ? (
          <div className="banner">
            No admin password is set. The dashboard is currently open — set{" "}
            <code>OPENHACKER_ADMIN_PASSWORD</code> to require sign-in.
          </div>
        ) : null}
        {error ? <div className="banner">Incorrect password.</div> : null}

        <form action={login} className="panel">
          <input type="hidden" name="next" value={next ?? "/"} />
          <label htmlFor="password">Password</label>
          <input id="password" name="password" type="password" autoFocus required />
          <button type="submit" style={{ marginTop: 14 }}>
            Sign in
          </button>
        </form>
      </div>
    </main>
  );
}
