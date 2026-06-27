import type { Metadata } from "next";
import Link from "next/link";
import { authEnabled } from "@/agent/lib/auth";
import { logout } from "./actions";
import "./globals.css";

export const metadata: Metadata = {
  title: "OpenHacker",
  description: "Autonomous application security agent",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <nav className="nav">
          <Link href="/" className="brand">
            open<span>hacker</span>
          </Link>
          <div className="spacer" />
          <Link href="/">Dashboard</Link>
          <Link href="/settings">Settings</Link>
          {authEnabled() ? (
            <form action={logout} className="inline">
              <button className="btn-ghost" type="submit">
                Sign out
              </button>
            </form>
          ) : null}
        </nav>
        {children}
      </body>
    </html>
  );
}
