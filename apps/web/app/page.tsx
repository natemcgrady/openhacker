import Link from "next/link";

export default function Page() {
  return (
    <main className="page home-page">
      <section className="hero">
        <p className="eyebrow">openhacker.ai</p>
        <h1>Autonomous security workspaces for teams.</h1>
        <div className="actions">
          <Link className="button primary" href="/sign-up">
            Create account
          </Link>
          <Link className="button" href="/sign-in">
            Sign in
          </Link>
        </div>
      </section>
    </main>
  );
}
